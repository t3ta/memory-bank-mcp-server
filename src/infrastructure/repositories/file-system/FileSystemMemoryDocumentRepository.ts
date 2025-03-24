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

      // Check if file exists
      const exists = await this.fileSystemService.fileExists(filePath);

      if (!exists) {
        // Try alternate format (.md <-> .json)
        const alternatePath = path.toAlternateFormat();
        const alternateFilePath = this.resolvePath(alternatePath.value);
        logger.debug(`[DEBUG] File not found at ${filePath}, trying alternate format: ${alternateFilePath}`);

        logger.debug(`File not found at ${filePath}, trying alternate format: ${alternateFilePath}`);

        const alternateExists = await this.fileSystemService.fileExists(alternateFilePath);

        if (!alternateExists) {
          logger.debug(`Alternate format not found either: ${alternateFilePath}`);
          return null;
        }

        logger.debug(`Found document in alternate format: ${alternateFilePath}`);
        // Recursively call findByPath with the alternate path
        return this.findByPath(alternatePath);
      }

      // Read file content
      const content = await this.fileSystemService.readFile(filePath);
      logger.debug(`[DEBUG] File content read from ${filePath}`);

      // Handle JSON files differently
      if (path.isJSON) {
        try {
          // Parse JSON content
          const jsonObj = JSON.parse(content);
          logger.debug('JSON parsed for file:', { filePath, schema: jsonObj.schema });

          // Check if it's a schema-compliant document or regular JSON
          if (jsonObj.schema === 'memory_document_v1' && jsonObj.metadata && jsonObj.content) {
            logger.debug('Schema-compliant document found:', { filePath, metadata: jsonObj.metadata });
            // It's a schema-compliant document - convert using fromJSON
            const doc = MemoryDocument.fromJSON(jsonObj, path);
            logger.debug('Created document from JSON with tags:', { tags: doc.tags.map(t => t.value) });
            return doc;
          } else {
            // It's a regular JSON - create a MemoryDocument with the raw content
            const stats = await this.fileSystemService.getFileStats(filePath);

            // Extract tags if they exist in a metadata field
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
          // Check if this is a tag validation error
          if (error instanceof DomainError && error.code === 'DOMAIN_ERROR.INVALID_TAG_FORMAT') {
            logger.error(`Invalid tag format in document ${path.value}:`, error);

            // Try to recover by using sanitized tags
            try {
              // Parse again and sanitize tags
              const jsonDoc = JSON.parse(content);

              // Sanitize tags if they exist
              if (jsonDoc.metadata && jsonDoc.metadata.tags) {
                // Replace problematic characters with hyphens
                jsonDoc.metadata.tags = jsonDoc.metadata.tags.map((tag: string) => {
                  // Make lowercase and replace invalid characters with hyphens
                  return tag.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                });

                logger.warn(`Sanitized tags in ${path.value}: ${JSON.stringify(jsonDoc.metadata.tags)}`);

                // Try to create memory document with sanitized tags
                if (jsonDoc.schema === 'memory_document_v1' && jsonDoc.metadata && jsonDoc.content) {
                  return MemoryDocument.fromJSON(jsonDoc, path);
                }
              }
            } catch (recoveryError) {
              logger.error(`Failed to recover document ${path.value}:`, recoveryError);
            }

            // If we reach here, recovery failed - log but don't throw
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

      // For markdown and other files, continue with normal processing
      // Extract tags
      const tags = extractTags(content).map((tag) => Tag.create(tag));

      // Get file stats
      const stats = await this.fileSystemService.getFileStats(filePath);

      // Create document
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
      // List all files
      const files = await this.fileSystemService.listFiles(this.basePath);

      logger.debug(`[DEBUG] Found ${files.length} files in ${this.basePath}`);

      // Convert to document paths
      const documents: MemoryDocument[] = [];

      for (const file of files) {
        try {
          // Get relative path
          const relativePath = path.relative(this.basePath, file);

          // Skip non-markdown and non-json files
          if (!relativePath.endsWith('.md') && !relativePath.endsWith('.json')) {
            continue;
          }

          logger.debug(`[DEBUG] Processing file: ${relativePath}`);

          // Create document path
          const documentPath = DocumentPath.create(relativePath);

          // Read document
          const document = await this.findByPath(documentPath);

          if (document) {
            const docTags = document.tags.map(t => t.value);
            const searchTags = tags.map(t => t.value);
            logger.debug('Document tags:', { relativePath, docTags });
            logger.debug('Searching for tags:', { searchTags });

            // Check if document has any of the tags
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
          // Skip files that can't be read or don't match path format
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

      // Handle JSON files differently
      if (document.isJSON) {
        // Convert to JSON format
        const jsonDoc = document.toJSON();
        const jsonContent = JSON.stringify(jsonDoc, null, 2);

        // Write JSON file
        await this.fileSystemService.writeFile(filePath, jsonContent);
        return;
      }

      // For markdown files, continue with normal processing
      // Prepare content with tags
      let content = document.content;

      // Add or update tags if document has any
      if (document.tags.length > 0) {
        const tagLine = `tags: ${document.tags.map((tag) => tag.toHashtag()).join(' ')}\n\n`;

        // If content already has tags, replace them
        if (content.includes('tags:')) {
          content = content.replace(/tags:.*\n\n/, tagLine);
        } else {
          // Add tags after the title (first line)
          const lines = content.split('\n');
          const firstLine = lines[0];
          const rest = lines.slice(1).join('\n');

          content = `${firstLine}\n\n${tagLine}${rest}`;
        }
      }

      // Write file
      await this.fileSystemService.writeFile(filePath, content);
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

      // Delete file
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
      // List all files
      const files = await this.fileSystemService.listFiles(this.basePath);
      logger.debug(`FileSystemMemoryDocumentRepository.list() found ${files.length} files`);

      // グループ化: 拡張子を除いたベース名でファイルをグループ化
      const fileGroups = new Map<string, { md?: string, json?: string }>();

      for (const file of files) {
        try {
          // Get relative path
          const relativePath = path.relative(this.basePath, file);

          // Skip non-markdown and non-json files
          if (!relativePath.endsWith('.md') && !relativePath.endsWith('.json')) {
            continue;
          }

          // Validate the path first
          const parts = relativePath.split(path.sep);
          if (parts.includes('..') || parts.some((part) => part.startsWith('..'))) {
            logger.error('Invalid document path:', {
              path: relativePath,
              reason: 'Path traversal attempt detected',
            });
            continue;
          }

          // ベース名（拡張子なし）とファイル拡張子を取得
          const extension = path.extname(relativePath);
          // ディレクトリパスを保持したベース名を取得
          const dirPath = path.dirname(relativePath);
          const baseName = path.basename(relativePath, extension);
          const baseNameWithDir = path.join(dirPath, baseName);

          logger.debug(`Processing file: ${relativePath}, baseNameWithDir: ${baseNameWithDir}, extension: ${extension}`);

          // グループに追加
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

      // JSONファイルを優先、なければMDファイルを使用
      const paths: DocumentPath[] = [];
      logger.debug(`Found ${fileGroups.size} unique base files`);

      for (const [baseNameWithDir, group] of fileGroups) {
        try {
          // JSONファイルを優先
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
    // Normalize path
    const normalizedPath = path.normalize(documentPath);

    // Check for path traversal attempts
    if (normalizedPath.startsWith('..')) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Invalid document path: ${documentPath}. Path cannot traverse outside the base directory.`
      );
    }

    // Resolve full path
    return path.join(this.basePath, normalizedPath);
  }
}
