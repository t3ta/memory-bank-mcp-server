import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  IBranchMemoryBankRepository,
  RecentBranch
} from '../../domain/repositories/IBranchMemoryBankRepository.js';
import { MemoryDocument } from '../domain/entities/MemoryDocument.js';
import { DocumentPath } from '../domain/entities/DocumentPath.js';
import { BranchInfo } from '../domain/entities/BranchInfo.js';
import { Tag } from '../domain/entities/Tag.js';
import { DomainError, DomainErrorCodes } from '../shared/errors/DomainError.js';
import { TagIndex } from '../schemas/tag-index/tag-index-schema.js';

/**
 * Simple file system implementation of branch memory bank repository for testing
 */
export class SimpleBranchMemoryBankRepository implements IBranchMemoryBankRepository {
  private readonly branchMemoryBankPath: string;

  /**
   * Constructor
   * @param rootPath Root path for the memory bank
   */
  constructor(rootPath: string) {
    this.branchMemoryBankPath = path.join(rootPath, 'branch-memory-bank');
    console.log(`SimpleBranchMemoryBankRepository initialized with path: ${this.branchMemoryBankPath}`);
  }

  /**
   * Check if branch exists
   * @param branchName Branch name
   * @returns Promise resolving to boolean indicating if branch exists
   */
  async exists(branchName: string): Promise<boolean> {
    try {
      const branchPath = path.join(this.branchMemoryBankPath, branchName);
      console.log(`Checking if branch exists: ${branchPath}`);
      await fs.access(branchPath);
      console.log(`Branch exists: ${branchPath}`);
      return true;
    } catch (error) {
      console.log(`Branch does not exist: ${branchName}`);
      return false;
    }
  }

  /**
   * Initialize branch memory bank
   * @param branchInfo Branch information
   * @returns Promise resolving when initialization is complete
   */
  async initialize(branchInfo: BranchInfo): Promise<void> {
    const branchPath = path.join(this.branchMemoryBankPath, branchInfo.name);
    console.log(`Initializing branch: ${branchPath}`);

    try {
      await fs.mkdir(branchPath, { recursive: true });
      console.log(`Branch initialized: ${branchPath}`);
    } catch (error) {
      console.error(`Failed to initialize branch: ${branchPath}`, error);
      throw new DomainError(
        DomainErrorCodes.REPOSITORY_ERROR,
        `Failed to initialize branch memory bank: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get document from branch
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  async getDocument(branchInfo: BranchInfo, documentPath: DocumentPath): Promise<MemoryDocument | null> {
    const filePath = path.join(this.branchMemoryBankPath, branchInfo.name, documentPath.value);
    console.log(`Getting document: ${filePath}`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`Document found: ${filePath}`);
      return MemoryDocument.create({
        path: documentPath,
        content,
        tags: [],
        lastModified: new Date()
      });
    } catch (error) {
      console.log(`Document not found: ${filePath}`);
      return null;
    }
  }

  /**
   * Save document to branch
   * @param branchInfo Branch information
   * @param document Document to save
   * @returns Promise resolving when done
   */
  async saveDocument(branchInfo: BranchInfo, document: MemoryDocument): Promise<void> {
    const branchPath = path.join(this.branchMemoryBankPath, branchInfo.name);
    const filePath = path.join(branchPath, document.path.value);
    console.log(`Saving document: ${filePath}`);

    try {
      await fs.mkdir(branchPath, { recursive: true });
      await fs.writeFile(filePath, document.content, 'utf-8');
      console.log(`Document saved: ${filePath}`);
    } catch (error) {
      console.error(`Failed to save document: ${filePath}`, error);
      throw new DomainError(
        DomainErrorCodes.REPOSITORY_ERROR,
        `Failed to save document: ${(error as Error).message}`
      );
    }
  }

  /**
   * Delete document from branch
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns Promise resolving to boolean indicating success
   */
  async deleteDocument(branchInfo: BranchInfo, documentPath: DocumentPath): Promise<boolean> {
    const filePath = path.join(this.branchMemoryBankPath, branchInfo.name, documentPath.value);
    console.log(`Deleting document: ${filePath}`);

    try {
      await fs.unlink(filePath);
      console.log(`Document deleted: ${filePath}`);
      return true;
    } catch (error) {
      console.log(`Document deletion failed: ${filePath}`);
      return false;
    }
  }

  /**
   * List all documents in branch
   * @param branchInfo Branch information
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    const branchPath = path.join(this.branchMemoryBankPath, branchInfo.name);
    console.log(`Listing documents in: ${branchPath}`);

    try {
      const files = await fs.readdir(branchPath);
      console.log(`Documents found: ${files.join(', ')}`);
      return files
        .filter(file => !file.startsWith('.') && !file.startsWith('_'))
        .map(file => DocumentPath.create(file));
    } catch (error) {
      console.log(`Failed to list documents: ${branchPath}`, error);
      return [];
    }
  }

  /**
   * Find documents by tags in branch
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  async findDocumentsByTags(branchInfo: BranchInfo, tags: Tag[]): Promise<MemoryDocument[]> {
    // Simplified implementation for tests
    console.log(`Finding documents by tags: ${tags.map(t => t.value).join(', ')}`);
    const documents: MemoryDocument[] = [];
    const paths = await this.listDocuments(branchInfo);

    for (const path of paths) {
      const doc = await this.getDocument(branchInfo, path);
      if (doc) {
        documents.push(doc);
      }
    }

    // For testing, we'll just return all documents regardless of tags
    console.log(`Found ${documents.length} documents`);
    return documents;
  }

  /**
   * Get recent branches
   * @param limit Maximum number of branches to return
   * @returns Promise resolving to array of recent branches
   */
  async getRecentBranches(limit?: number): Promise<RecentBranch[]> {
    console.log(`Getting recent branches (limit: ${limit})`);
    try {
      const entries = await fs.readdir(this.branchMemoryBankPath);
      console.log(`Found branches: ${entries.join(', ')}`);
      const branches: RecentBranch[] = [];

      for (const entry of entries) {
        try {
          const branchInfo = BranchInfo.create(entry);
          const stats = await fs.stat(path.join(this.branchMemoryBankPath, entry));

          branches.push({
            branchInfo,
            lastModified: stats.mtime,
            summary: {}
          });
        } catch (error) {
          // Skip invalid branches
          console.log(`Skipping invalid branch: ${entry}`);
        }
      }

      // Sort by last modified date (descending)
      branches.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

      // Limit the results
      const limited = branches.slice(0, limit || 10);
      console.log(`Returning ${limited.length} recent branches`);
      return limited;
    } catch (error) {
      console.log(`Failed to get recent branches`, error);
      return [];
    }
  }

  /**
   * Validate branch structure
   * @param branchInfo Branch information
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  async validateStructure(branchInfo: BranchInfo): Promise<boolean> {
    console.log(`Validating structure for branch: ${branchInfo.name}`);
    const result = await this.exists(branchInfo.name);
    console.log(`Structure validation result: ${result}`);
    return result;
  }

  /**
   * Save tag index for branch
   * @param branchInfo Branch information
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveTagIndex(branchInfo: BranchInfo, tagIndex: TagIndex): Promise<void> {
    const indexPath = path.join(this.branchMemoryBankPath, branchInfo.name, '_index.json');
    console.log(`Saving tag index: ${indexPath}`);

    try {
      await fs.writeFile(indexPath, JSON.stringify(tagIndex, null, 2), 'utf-8');
      console.log(`Tag index saved: ${indexPath}`);
    } catch (error) {
      console.error(`Failed to save tag index: ${indexPath}`, error);
      throw new DomainError(
        DomainErrorCodes.REPOSITORY_ERROR,
        `Failed to save tag index: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get tag index for branch
   * @param branchInfo Branch information
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getTagIndex(branchInfo: BranchInfo): Promise<TagIndex | null> {
    const indexPath = path.join(this.branchMemoryBankPath, branchInfo.name, '_index.json');
    console.log(`Getting tag index: ${indexPath}`);

    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      console.log(`Tag index found: ${indexPath}`);
      return JSON.parse(content) as TagIndex;
    } catch (error) {
      console.log(`Tag index not found: ${indexPath}`);
      return null;
    }
  }

  /**
   * Find documents by tags in branch using index
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags (AND), otherwise any tag (OR)
   * @returns Promise resolving to array of document paths
   */
  async findDocumentPathsByTagsUsingIndex(
    branchInfo: BranchInfo,
    tags: Tag[],
    _matchAll?: boolean
  ): Promise<DocumentPath[]> {
    // Simplified implementation for tests
    console.log(`Finding document paths by tags using index: ${tags.map(t => t.value).join(', ')}`);
    const docs = await this.findDocumentsByTags(branchInfo, tags);
    return docs.map(doc => doc.path);
  }
}
