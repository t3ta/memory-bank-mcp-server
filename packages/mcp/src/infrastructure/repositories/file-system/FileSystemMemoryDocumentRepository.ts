import path from 'node:path';
import { IMemoryDocumentRepository } from '../../../domain/repositories/IMemoryDocumentRepository.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from '../../../shared/errors/InfrastructureError.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { extractTags } from '../../../shared/utils/index.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * File system based implementation of memory document repository
 */
export class FileSystemMemoryDocumentRepository implements IMemoryDocumentRepository {
  /**
   * Constructor
   * @param basePath Base path for storing documents
   * @param fileSystemService File system service
   */
  constructor(
    private readonly basePath: string,
    private readonly fileSystemService: IFileSystemService
  ) { }

  /**
   * Find document by path
   * @param path Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  async findByPath(path: DocumentPath): Promise<MemoryDocument | null> {
    try {
      const filePath = this.resolvePath(path.value);
      logger.debug(`[DEBUG] Finding document at path: ${filePath}`);

      const exists = await this.fileSystemService.fileExists(filePath);

      if (!exists) {
        logger.debug(`File not found at ${filePath}`);
        return null;
      }

      const content = await this.fileSystemService.readFile(filePath);
      logger.debug(`[DEBUG] File content read from ${filePath}`);

      if (path.isJSON) {
        try {
          const jsonObj = JSON.parse(content);
          logger.debug('JSON parsed for file:', { filePath, schema: jsonObj.schema });

          if (jsonObj.schema === 'memory_document_v1' && jsonObj.metadata && jsonObj.content) {
            const doc = MemoryDocument.fromJSON(jsonObj, path);
            logger.debug('Created document from JSON with tags:', { tags: doc.tags.map(t => t.value) });
            return doc;
          } else {
            const stats = await this.fileSystemService.getFileStats(filePath);
            let tags: Tag[] = [];
            if (jsonObj.metadata && Array.isArray(jsonObj.metadata.tags)) {
              try {
                tags = jsonObj.metadata.tags.map((tag: string) => Tag.create(tag));
              } catch (tagError) {
                logger.warn(`Ignoring invalid tags in ${path.value}:`, tagError);
              }
            }
            return MemoryDocument.create({
              path,
              content,
              tags,
              lastModified: stats.lastModified,
            });
          }
        } catch (error) {
          if (error instanceof DomainError && error.code === 'DOMAIN_ERROR.INVALID_TAG_FORMAT') {
            logger.error(`Invalid tag format in document ${path.value}:`, error);
            try {
              const jsonDoc = JSON.parse(content);
              if (jsonDoc.metadata && jsonDoc.metadata.tags) {
                jsonDoc.metadata.tags = jsonDoc.metadata.tags.map((tag: string) => {
                  return tag.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                });
                logger.warn(`Sanitized tags in ${path.value}: ${JSON.stringify(jsonDoc.metadata.tags)}`);
                if (jsonDoc.schema === 'memory_document_v1' && jsonDoc.metadata && jsonDoc.content) {
                  return MemoryDocument.fromJSON(jsonDoc, path);
                }
              }
            } catch (recoveryError) {
              logger.error(`Failed to recover document ${path.value}:`, recoveryError);
            }
            logger.warn(`Skipping document with invalid tags: ${path.value}`);
            return null;
          }

          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_READ_ERROR,
            `Failed to parse JSON document: ${path.value}`,
            { originalError: error }
          );
        }
      }

      const tags = extractTags(content).map((tag) => Tag.create(tag));
      const stats = await this.fileSystemService.getFileStats(filePath);

      return MemoryDocument.create({
        path,
        content,
        tags,
        lastModified: stats.lastModified,
      });
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        if (error.code === `INFRA_ERROR.${InfrastructureErrorCodes.FILE_NOT_FOUND}`) {
          return null;
        }
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find document by path: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Find documents by tags
   * @param tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  async findByTags(tags: Tag[]): Promise<MemoryDocument[]> {
    try {
      const files = await this.fileSystemService.listFiles(this.basePath);
      logger.debug(`[DEBUG] Found ${files.length} files in ${this.basePath}`);

      const documents: MemoryDocument[] = [];

      for (const file of files) {
        try {
          const relativePath = path.relative(this.basePath, file);

          if (!relativePath.endsWith('.md') && !relativePath.endsWith('.json')) {
            continue;
          }

          logger.debug(`[DEBUG] Processing file: ${relativePath}`);

          const documentPath = DocumentPath.create(relativePath);
          const document = await this.findByPath(documentPath);

          if (document) {
            const docTags = document.tags.map(t => t.value);
            const searchTags = tags.map(t => t.value);
            logger.debug('Document tags:', { relativePath, docTags });
            logger.debug('Searching for tags:', { searchTags });

            const hasAnyTags = tags.some((tag) => {
              const hasTag = document.hasTag(tag);
              logger.debug(`[DEBUG] Checking tag "${tag.value}" against document ${relativePath}: ${hasTag}`);
              return hasTag;
            });

            if (hasAnyTags) {
              logger.debug(`[DEBUG] Adding document ${relativePath} to results`);
              documents.push(document);
            } else {
              logger.debug(`[DEBUG] Document ${relativePath} does not match any search tags`);
            }
          } else {
            logger.debug(`[DEBUG] No document found for ${relativePath}`);
          }
        } catch (error) {
          logger.error(`Error reading file ${file}:`, error);
        }
      }

      logger.debug(`Found ${documents.length} documents matching tags:`, tags.map(t => t.value));
      return documents;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to find documents by tags in global memory bank`,
        { originalError: error }
      );
    }
  }

  /**
   * Save document
   * @param document Document to save
   * @returns Promise resolving when done
   */
  async save(document: MemoryDocument): Promise<void> {
    try {
      const filePath = this.resolvePath(document.path.value);

      let contentToSave = document.content;
      let isJson = false;

      try {
        // JSONかどうかを試す
        JSON.parse(document.content);
        isJson = true;
        logger.debug(`Content is valid JSON for ${document.path.value}`);
        // JSONの場合はそのままの contentToSave を使う
      } catch (error) {
        // JSONでない場合はプレーンテキストとして扱う
        isJson = false;
        logger.debug(`Content is not JSON for ${document.path.value}, treating as plain text.`);
        // プレーンテキストの場合、タグ埋め込みはしない (シンプルにするため)
        // もしタグ埋め込みが必要なら、ここで行う
        // if (document.tags.length > 0) {
        //   const tagLine = `tags: ${document.tags.map((tag) => tag.toHashtag()).join(' ')}\n\n`;
        //   if (contentToSave.includes('tags:')) {
        //     contentToSave = contentToSave.replace(/tags:.*\n\n/, tagLine);
        //   } else {
        //     const lines = contentToSave.split('\n');
        //     const firstLine = lines[0];
        //     const rest = lines.slice(1).join('\n');
        //     contentToSave = `${firstLine}\n\n${tagLine}${rest}`;
        //   }
        // }
      }

      // ファイル書き込み
      await this.fileSystemService.writeFile(filePath, contentToSave);
      logger.debug(`Successfully wrote file: ${filePath} (isJson: ${isJson})`);

    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save document: ${document.path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Delete document
   * @param path Document path
   * @returns Promise resolving to boolean indicating success
   */
  async delete(path: DocumentPath): Promise<boolean> {
    try {
      const filePath = this.resolvePath(path.value);
      return await this.fileSystemService.deleteFile(filePath);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete document: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * List all document paths
   * @returns Promise resolving to array of document paths
   */
  async list(): Promise<DocumentPath[]> {
    try {
      const files = await this.fileSystemService.listFiles(this.basePath);
      logger.debug(`FileSystemMemoryDocumentRepository.list() found ${files.length} files`);

      // Group files by basename (excluding extension)
      const fileGroups = new Map<string, { md?: string, json?: string }>();

      for (const file of files) {
        try {
          const relativePath = path.relative(this.basePath, file);

          if (!relativePath.endsWith('.md') && !relativePath.endsWith('.json')) {
            continue;
          }

          const parts = relativePath.split(path.sep);
          if (parts.includes('..') || parts.some((part) => part.startsWith('..'))) {
            logger.error('Invalid document path:', {
              path: relativePath,
              reason: 'Path traversal attempt detected',
            });
            continue;
          }

          // Get basename (without extension) and file extension
          const extension = path.extname(relativePath);
          // Get basename including directory path
          const dirPath = path.dirname(relativePath);
          const baseName = path.basename(relativePath, extension);
          const baseNameWithDir = path.join(dirPath, baseName);

          logger.debug(`Processing file: ${relativePath}, baseNameWithDir: ${baseNameWithDir}, extension: ${extension}`);

          // Add to group
          const group = fileGroups.get(baseNameWithDir) || { md: undefined, json: undefined };
          if (extension === '.md') {
            group.md = relativePath;
          } else if (extension === '.json') {
            group.json = relativePath;
          }
          fileGroups.set(baseNameWithDir, group);
        } catch (error) {
          logger.error('Error processing file path:', {
            path: file,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Prefer JSON file, otherwise use MD file
      const paths: DocumentPath[] = [];
      logger.debug(`Found ${fileGroups.size} unique base files`);

      for (const [baseNameWithDir, group] of fileGroups) {
        try {
          // Prefer JSON file
          const pathToUse = group.json || group.md;
          if (pathToUse) {
            logger.debug(`Using ${pathToUse} for base ${baseNameWithDir} (JSON: ${!!group.json}, MD: ${!!group.md})`);
            const documentPath = DocumentPath.create(pathToUse);
            paths.push(documentPath);
          }
        } catch (error) {
          logger.error('Error creating document path:', {
            baseNameWithDir,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return paths;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        'Failed to list documents',
        { originalError: error }
      );
    }
  }

  /**
   * Resolve path to full file path
   * @param documentPath Document path relative to base path
   * @returns Full file path
   */
  private resolvePath(documentPath: string): string {
    const normalizedPath = path.normalize(documentPath);

    if (normalizedPath.startsWith('..')) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Invalid document path: ${documentPath}. Path cannot traverse outside the base directory.`
      );
    }

    return path.join(this.basePath, normalizedPath);
  }
}
