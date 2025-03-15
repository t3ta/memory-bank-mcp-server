import { promises as fs } from 'fs';
import path from 'path';
import { MemoryDocument, ValidationResult } from '../models/types.js';

/**
 * Base class for memory bank operations
 */
export abstract class BaseMemoryBank {
  constructor(protected basePath: string) {}

  /**
   * Read a document from the memory bank
   */
  async readDocument(documentPath: string): Promise<MemoryDocument> {
    const fullPath = this.resolvePath(documentPath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const stats = await fs.stat(fullPath);

      // Parse tags from content
      const tags = this.extractTags(content);

      return {
        path: documentPath,
        content,
        tags,
        lastModified: stats.mtime
      };
    } catch (error) {
      throw new Error(`Failed to read document ${documentPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Write a document to the memory bank
   */
  async writeDocument(documentPath: string, content: string, tags: string[] = []): Promise<void> {
    const fullPath = this.resolvePath(documentPath);

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Add tags to content if provided
      const contentWithTags = this.addTagsToContent(content, tags);

      await fs.writeFile(fullPath, contentWithTags, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write document ${documentPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all documents in the memory bank
   */
  async listDocuments(): Promise<string[]> {
    const files: string[] = [];

    async function walkDir(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    }

    try {
      await walkDir(this.basePath);
      return files.map(f => path.relative(this.basePath, f));
    } catch (error) {
      throw new Error(`Failed to list documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search documents by tags
   */
  async searchByTags(searchTags: string[]): Promise<MemoryDocument[]> {
    const documents: MemoryDocument[] = [];
    const files = await this.listDocuments();

    for (const file of files) {
      try {
        const doc = await this.readDocument(file);
        if (searchTags.every(tag => doc.tags.includes(tag))) {
          documents.push(doc);
        }
      } catch (error) {
        console.error(`Error reading document ${file}:`, error);
      }
    }

    return documents;
  }

  /**
   * Delete a document from the memory bank
   */
  async deleteDocument(documentPath: string): Promise<void> {
    const fullPath = this.resolvePath(documentPath);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      throw new Error(`Failed to delete document ${documentPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate the memory bank structure
   */
  abstract validateStructure(): Promise<ValidationResult>;

  protected resolvePath(documentPath: string): string {
    const normalizedPath = path.normalize(documentPath);
    if (normalizedPath.startsWith('..')) {
      throw new Error('Invalid path: Accessing files outside memory bank directory is not allowed');
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
