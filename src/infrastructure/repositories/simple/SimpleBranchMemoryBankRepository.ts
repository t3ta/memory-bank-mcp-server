import path from "path";
import fs from "fs/promises";
import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import type { Tag } from "../../../domain/entities/Tag.js";
import type { IBranchMemoryBankRepository, RecentBranch } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import type { TagIndex } from "../../../schemas/tag-index/tag-index-schema.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import { logger } from "../../../shared/utils/logger.js";


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
    logger.debug('Repository initialized:', { path: this.branchMemoryBankPath });
  }

  /**
   * Check if branch exists
   * @param branchName Branch name
   * @returns Promise resolving to boolean indicating if branch exists
   */
  async exists(branchName: string): Promise<boolean> {
    try {
      const branchPath = path.join(this.branchMemoryBankPath, branchName);
      logger.debug('Checking if branch exists:', { path: branchPath });
      await fs.access(branchPath);
      logger.debug('Branch exists:', { path: branchPath });
      return true;
    } catch (error) {
      logger.debug('Branch does not exist:', { branch: branchName });
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
    logger.debug('Initializing branch:', { path: branchPath });

    try {
      await fs.mkdir(branchPath, { recursive: true });
      logger.debug('Branch initialized:', { path: branchPath });
    } catch (error) {
      logger.error('Failed to initialize branch:', { path: branchPath, error });
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
    logger.debug("Getting document:", { path: filePath });

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      logger.debug("Document found:", { path: filePath });
      return MemoryDocument.create({
        path: documentPath,
        content,
        tags: [],
        lastModified: new Date()
      });
    } catch (error) {
      logger.debug("Document not found:", { path: filePath });
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
    logger.debug("Saving document:", { path: filePath });

    try {
      await fs.mkdir(branchPath, { recursive: true });
      await fs.writeFile(filePath, document.content, 'utf-8');
      logger.debug("Document saved:", { path: filePath });
    } catch (error) {
      logger.error("Failed to save document", { path: filePath, error });
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
    logger.debug("Deleting document:", { path: filePath });

    try {
      await fs.unlink(filePath);
      logger.debug("Document deleted:", { path: filePath });
      return true;
    } catch (error) {
      logger.debug("Document deletion failed:", { path: filePath });
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
    logger.debug("Listing documents in:", { path: branchPath });

    try {
      const files = await fs.readdir(branchPath);
      logger.debug("Documents found:", { files: files.join(', ') });
      return files
        .filter(file => !file.startsWith('.') && !file.startsWith('_'))
        .map(file => DocumentPath.create(file));
    } catch (error) {
      logger.debug("Failed to list documents:", { path: branchPath, error });
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
    logger.debug("Finding documents by tags:", { tags: tags.map(t => t.value).join(', ') });
    const documents: MemoryDocument[] = [];
    const paths = await this.listDocuments(branchInfo);

    for (const path of paths) {
      const doc = await this.getDocument(branchInfo, path);
      if (doc) {
        documents.push(doc);
      }
    }

    // For testing, we'll just return all documents regardless of tags
    logger.debug("Found documents:", { count: documents.length });
    return documents;
  }

  /**
   * Get recent branches
   * @param limit Maximum number of branches to return
   * @returns Promise resolving to array of recent branches
   */
  async getRecentBranches(limit?: number): Promise<RecentBranch[]> {
    logger.debug("Getting recent branches:", { limit });
    try {
      const entries = await fs.readdir(this.branchMemoryBankPath);
      logger.debug("Found branches:", { branches: entries.join(', ') });
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
          logger.debug("Skipping invalid branch:", { branch: entry });
        }
      }

      // Sort by last modified date (descending)
      branches.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

      // Limit the results
      const limited = branches.slice(0, limit || 10);
      logger.debug('Returning recent branches:', { count: limited.length });
      return limited;
    } catch (error) {
      logger.error('Failed to get recent branches:', { error });
      return [];
    }
  }

  /**
   * Validate branch structure
   * @param branchInfo Branch information
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  async validateStructure(branchInfo: BranchInfo): Promise<boolean> {
    logger.debug("Validating structure for branch:", { branch: branchInfo.name });
    const result = await this.exists(branchInfo.name);
    logger.debug("Structure validation result:", { result });
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
    logger.debug("Saving tag index:", { path: indexPath });

    try {
      await fs.writeFile(indexPath, JSON.stringify(tagIndex, null, 2), 'utf-8');
      logger.debug("Tag index saved:", { path: indexPath });
    } catch (error) {
      logger.error("Failed to save tag index:", { path: indexPath, error });
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
    logger.debug("Getting tag index:", { path: indexPath });

    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      logger.debug("Tag index found:", { path: indexPath });
      return JSON.parse(content) as TagIndex;
    } catch (error) {
      logger.debug("Tag index not found:", { path: indexPath });
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
    logger.debug("Finding document paths by tags using index:", { tags: tags.map(t => t.value).join(', ') });
    const docs = await this.findDocumentsByTags(branchInfo, tags);
    return docs.map(doc => doc.path);
  }
}
