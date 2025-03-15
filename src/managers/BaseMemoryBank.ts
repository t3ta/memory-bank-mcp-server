import { promises as fs } from 'fs';
import path from 'path';
import { MemoryBankError } from '../errors/MemoryBankError.js';
import { ValidationResult } from '../models/types.js';
import {
  MemoryDocument,
  MemoryDocumentSchema,
  PathSchema,
  TagSchema
} from '../schemas/index.js';

/**
 * Base class for memory bank operations
 */
export abstract class BaseMemoryBank {
  constructor(protected basePath: string) {}

  /**
   * Read a document from the memory bank
   */
  async readDocument(documentPath: string): Promise<MemoryDocument> {
    try {
      // Validate path
      const validatedPath = await this.validatePath(documentPath);
      const fullPath = this.resolvePath(validatedPath);

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const stats = await fs.stat(fullPath);

        // Parse and validate tags
        const tags = await this.validateTags(this.extractTags(content));

        // Validate the complete document
        const document = {
          path: documentPath,
          content,
          tags,
          lastModified: stats.mtime
        };

        return MemoryDocumentSchema.parse(document);
      } catch (error) {
        if (error instanceof Error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw MemoryBankError.documentNotFound(documentPath);
          }
          if ((error as NodeJS.ErrnoException).code === 'EACCES') {
            throw MemoryBankError.filePermissionError(documentPath);
          }
          throw MemoryBankError.fileReadError(documentPath, error);
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.fileSystemError('read', documentPath, error as Error);
    }
  }

  /**
   * Write a document to the memory bank
   */
  async writeDocument(documentPath: string, content: string, tags: string[] = []): Promise<void> {
    try {
      // Validate path and tags
      const validatedPath = await this.validatePath(documentPath);
      const validatedTags = await this.validateTags(tags);
      const fullPath = this.resolvePath(validatedPath);

      try {
        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        // Add tags to content if provided
        const contentWithTags = this.addTagsToContent(content, validatedTags);

        // Validate the complete document before writing
        const document = {
          path: documentPath,
          content: contentWithTags,
          tags: validatedTags,
          lastModified: new Date()
        };
        MemoryDocumentSchema.parse(document);

        await fs.writeFile(fullPath, contentWithTags, 'utf-8');
      } catch (error) {
        if (error instanceof Error) {
          if ((error as NodeJS.ErrnoException).code === 'EACCES') {
            throw MemoryBankError.filePermissionError(documentPath);
          }
          throw MemoryBankError.fileWriteError(documentPath, error);
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.fileSystemError('write', documentPath, error as Error);
    }
  }

  /**
   * List all documents in the memory bank
   */
  async listDocuments(): Promise<string[]> {
    const files: string[] = [];

    async function walkDir(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          if ((error as NodeJS.ErrnoException).code === 'EACCES') {
            throw MemoryBankError.filePermissionError(dir);
          }
          throw MemoryBankError.fileSystemError('list', dir, error);
        }
        throw error;
      }
    }

    try {
      await walkDir(this.basePath);
      return files.map(f => path.relative(this.basePath, f));
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.fileSystemError('list', this.basePath, error as Error);
    }
  }

  /**
   * Search documents by tags
   */
  async searchByTags(searchTags: string[]): Promise<MemoryDocument[]> {
    try {
      // Validate search tags
      const validatedTags = await this.validateTags(searchTags);
      const documents: MemoryDocument[] = [];
      const files = await this.listDocuments();

      for (const file of files) {
        try {
          const doc = await this.readDocument(file);
          if (validatedTags.every(tag => doc.tags.includes(tag))) {
            documents.push(doc);
          }
        } catch (error) {
          console.error(`Error reading document ${file}:`, error);
        }
      }

      return documents;
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.fileSystemError('search', 'tags', error as Error);
    }
  }

  /**
   * Delete a document from the memory bank
   */
  async deleteDocument(documentPath: string): Promise<void> {
    try {
      const validatedPath = await this.validatePath(documentPath);
      const fullPath = this.resolvePath(validatedPath);

      try {
        await fs.unlink(fullPath);
      } catch (error) {
        if (error instanceof Error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw MemoryBankError.documentNotFound(documentPath);
          }
          if ((error as NodeJS.ErrnoException).code === 'EACCES') {
            throw MemoryBankError.filePermissionError(documentPath);
          }
          throw MemoryBankError.fileSystemError('delete', documentPath, error);
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.fileSystemError('delete', documentPath, error as Error);
    }
  }

  /**
   * Validate the memory bank structure
   */
  abstract validateStructure(): Promise<ValidationResult>;

  /**
   * Validate a path using zod schema
   */
  protected async validatePath(documentPath: string): Promise<string> {
    try {
      return PathSchema.parse(documentPath);
    } catch (error) {
      throw MemoryBankError.invalidPath(documentPath, 'Invalid path format');
    }
  }

  /**
   * Validate tags using zod schema
   */
  protected async validateTags(tags: string[]): Promise<string[]> {
    try {
      return Promise.all(tags.map(tag => TagSchema.parse(tag)));
    } catch (error) {
      throw MemoryBankError.invalidTagFormat(tags.join(', '));
    }
  }

  protected resolvePath(documentPath: string): string {
    const normalizedPath = path.normalize(documentPath);
    if (normalizedPath.startsWith('..')) {
      throw MemoryBankError.invalidPath(documentPath, 'Accessing files outside memory bank directory is not allowed');
    }
    return path.join(this.basePath, normalizedPath);
  }

  protected extractTags(content: string): string[] {
    const tagLine = content.split('\n')
      .find(line => line.trim().startsWith('tags:'));

    if (!tagLine) return [];

    return tagLine
      .replace('tags:', '')
      .trim()
      .split(/\s+/)
      .filter(tag => tag.startsWith('#'))
      .map(tag => tag.substring(1));
  }

  protected addTagsToContent(content: string, tags: string[]): string {
    if (tags.length === 0) return content;

    const tagLine = `tags: ${tags.map(t => `#${t}`).join(' ')}\n\n`;

    // If content already has tags, replace them
    if (content.includes('tags:')) {
      return content.replace(/tags:.*\n\n/, tagLine);
    }

    // Add tags after the title (first line)
    const lines = content.split('\n');
    const firstLine = lines[0];
    const rest = lines.slice(1).join('\n');

    return `${firstLine}\n\n${tagLine}${rest}`;
  }
}
