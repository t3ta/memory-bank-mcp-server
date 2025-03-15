import { promises as fs } from 'fs';
import path from 'path';
import { MemoryBankError } from '../errors/MemoryBankError.js';
import { ValidationResult } from '../models/types.js';
import {
  MemoryDocument,
  MemoryDocumentSchema,
  PathSchema,
  TagSchema,
  DocumentSections,
  DocumentSectionsSchema,
  RecentBranch,
  RecentBranchSchema,
  GetRecentBranchesArgsSchema
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

        // Ensure lastModified is a Date object
        const lastModified = stats.mtime instanceof Date ? stats.mtime : new Date(stats.mtime);

        // Validate the complete document
        const document = {
          path: documentPath,
          content,
          tags,
          lastModified
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
   * Update document sections using JSON
   */
  async updateSections(documentPath: string, sections: DocumentSections): Promise<void> {
    try {
      // Validate sections
      const validatedSections = DocumentSectionsSchema.parse(sections);

      // Read current document
      const doc = await this.readDocument(documentPath);
      let content = doc.content;

      // Update each section
      for (const [sectionName, section] of Object.entries(validatedSections)) {
        const formattedContent = Array.isArray(section.content)
          ? section.content.map(item => `- ${item}`).join('\n')
          : section.content;

        content = this.updateSection(
          content,
          section.header,
          formattedContent,
          section.append ?? false
        );
      }

      // Write updated document
      await this.writeDocument(documentPath, content, doc.tags);
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.documentValidationFailed(documentPath, (error as Error).message);
    }
  }

  /**
   * Get recent branch memory banks
   */
  async getRecentBranches(args: { limit?: number } = {}): Promise<RecentBranch[]> {
    try {
      // Validate arguments
      const validatedArgs = GetRecentBranchesArgsSchema.parse(args);

      // Get all branch directories
      const branchesDir = path.join(this.basePath, 'branch-memory-bank');
      const entries = await fs.readdir(branchesDir, { withFileTypes: true });
      const branches: RecentBranch[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        try {
          const branchName = entry.name.replace(/-/g, '/');
          const activeContextPath = path.join(branchesDir, entry.name, 'activeContext.md');
          const stats = await fs.stat(activeContextPath);

          // Read active context
          const content = await fs.readFile(activeContextPath, 'utf-8');
          const currentWork = this.extractSectionContent(content, '## Current Work') ||
                            this.extractSectionContent(content, '## 現在の作業内容');
          const recentChanges = this.extractListItems(content, '## Recent Changes') ||
                               this.extractListItems(content, '## 最近の変更点');

          const branch: RecentBranch = {
            name: branchName,
            lastModified: stats.mtime,
            summary: {
              currentWork,
              recentChanges
            }
          };

          branches.push(RecentBranchSchema.parse(branch));
        } catch (error) {
          console.error(`Error reading branch ${entry.name}:`, error);
          continue;
        }
      }

      // Sort by last modified date and limit
      return branches
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
        .slice(0, validatedArgs.limit);
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.fileSystemError('list-branches', this.basePath, error as Error);
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

  protected updateSection(content: string, sectionHeader: string, newContent: string, append = false): string {
    const lines = content.split('\n');
    const sectionIndex = lines.findIndex(line => line.trim() === sectionHeader);

    if (sectionIndex === -1) {
      // Section not found, append it at the end
      // Ensure we have proper spacing
      const trimmedContent = content.trim();
      return `${trimmedContent}\n\n${sectionHeader}\n\n${newContent}`;
    }

    // Find the next section or end of file
    let nextSectionIndex = lines.findIndex((line, index) =>
      index > sectionIndex && line.startsWith('##')
    );
    if (nextSectionIndex === -1) {
      nextSectionIndex = lines.length;
    }

    if (append) {
      // Add new content at the end of the section
      const beforeSection = lines.slice(0, nextSectionIndex).join('\n').trim();
      const afterSection = lines.slice(nextSectionIndex).join('\n');
      // Ensure proper spacing between existing content and new content
      return `${beforeSection}\n\n${newContent}\n\n${afterSection}`;
    } else {
      // Replace section content
      const beforeSection = lines.slice(0, sectionIndex + 1).join('\n');
      const afterSection = lines.slice(nextSectionIndex).join('\n');
      // Ensure proper spacing around the new content
      return `${beforeSection}\n\n${newContent}\n\n${afterSection}`;
    }
  }

  protected extractSectionContent(content: string, sectionHeader: string): string | undefined {
    const lines = content.split('\n');
    const sectionIndex = lines.findIndex(line => line.trim() === sectionHeader);

    if (sectionIndex === -1) return undefined;

    // Find the next section or end of file
    let nextSectionIndex = lines.findIndex((line, index) =>
      index > sectionIndex && line.startsWith('##')
    );
    if (nextSectionIndex === -1) {
      nextSectionIndex = lines.length;
    }

    // Extract and clean section content
    return lines
      .slice(sectionIndex + 1, nextSectionIndex)
      .filter(line => line.trim())
      .join('\n')
      .trim();
  }

  protected extractListItems(content: string, sectionHeader: string): string[] | undefined {
    const sectionContent = this.extractSectionContent(content, sectionHeader);
    if (!sectionContent) return undefined;

    return sectionContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-'))
      .map(line => line.substring(1).trim());
  }
}
