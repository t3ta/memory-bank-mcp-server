import path from 'path';
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
  ) {}

  /**
   * Find document by path
   * @param path Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  async findByPath(path: DocumentPath): Promise<MemoryDocument | null> {
    try {
      const filePath = this.resolvePath(path.value);

      // Check if file exists
      const exists = await this.fileSystemService.fileExists(filePath);

      if (!exists) {
        return null;
      }

      // Read file content
      const content = await this.fileSystemService.readFile(filePath);

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

      // Convert to document paths
      const documents: MemoryDocument[] = [];

      for (const file of files) {
        try {
          // Get relative path
          const relativePath = path.relative(this.basePath, file);

          // Skip non-markdown files
          if (!relativePath.endsWith('.md')) {
            continue;
          }

          // Create document path
          const documentPath = DocumentPath.create(relativePath);

          // Read document
          const document = await this.findByPath(documentPath);

          if (document) {
            // Check if document has all tags
            const hasAllTags = tags.every((tag) => document.hasTag(tag));

            if (hasAllTags) {
              documents.push(document);
            }
          }
        } catch (error) {
          // Skip files that can't be read or don't match path format
          console.error(`Error reading file ${file}:`, error);
        }
      }

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

      // Convert to document paths and remove duplicates
      const uniquePaths = new Set<string>();
      const paths: DocumentPath[] = [];

      for (const file of files) {
        try {
          // Get relative path
          const relativePath = path.relative(this.basePath, file);

          // Skip non-markdown files
          if (!relativePath.endsWith('.md')) {
            continue;
          }

          // Validate the path first
          const parts = relativePath.split(path.sep);
          if (parts.includes('..') || parts.some((part) => part.startsWith('..'))) {
            console.error('Invalid document path:', {
              path: relativePath,
              reason: 'Path traversal attempt detected',
            });
            continue;
          }

          // Only process paths we haven't seen before
          if (!uniquePaths.has(relativePath)) {
            try {
              uniquePaths.add(relativePath);
              const documentPath = DocumentPath.create(relativePath);
              paths.push(documentPath);
            } catch (error) {
              console.error('Error creating document path:', {
                path: relativePath,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        } catch (error) {
          console.error('Error processing file path:', {
            path: file,
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
