import path from "path";
import fs from "fs/promises"; // Keep fs for other methods if needed
import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import { Tag } from "../../../domain/entities/Tag.js";
import type { IBranchMemoryBankRepository, RecentBranch } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import { logger } from "../../../shared/utils/logger.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import type { BranchTagIndex as TagIndex } from "@memory-bank/schemas";
import { BranchDirectoryManager } from "./BranchDirectoryManager.js";
import { DocumentIO } from "./DocumentIO.js";
import { DocumentLister } from "./DocumentLister.js";
import { TagIndexHandler } from "./TagIndexHandler.js";
import { DocumentFinder } from "./DocumentFinder.js"; // ★ DocumentFinder をインポート ★

/**
 * Simple file system implementation of branch memory bank repository for testing
 * Acts as a Facade, delegating operations to specialized classes.
 */
export class FileSystemBranchMemoryBankRepository implements IBranchMemoryBankRepository {
  private readonly branchMemoryBankPath: string;
  private readonly branchDirectoryManager: BranchDirectoryManager;
  private readonly documentIO: DocumentIO;
  private readonly documentLister: DocumentLister;
  private readonly tagIndexHandler: TagIndexHandler;
  private readonly documentFinder: DocumentFinder; // ★ DocumentFinder のインスタンスを保持 ★

  /**
   * Constructor
   * @param rootPath Root path for the memory bank
   */
  constructor(rootPath: string) {
    this.branchMemoryBankPath = path.join(rootPath, 'branch-memory-bank');
    this.branchDirectoryManager = new BranchDirectoryManager(rootPath);
    this.documentIO = new DocumentIO(rootPath);
    this.documentLister = new DocumentLister(rootPath);
    this.tagIndexHandler = new TagIndexHandler(rootPath);
    // ★ DocumentFinder に依存クラスを渡してインスタンス生成 ★
    this.documentFinder = new DocumentFinder(this.documentLister, this.documentIO);
  }

  /**
   * Check if branch exists
   * @param branchName Branch name
   * @returns Promise resolving to boolean indicating if branch exists
   */
  async exists(branchName: string): Promise<boolean> {
    return this.branchDirectoryManager.exists(branchName);
  }

  /**
   * Initialize branch memory bank
   * @param branchInfo Branch information
   * @returns Promise resolving when initialization is complete
   */
  async initialize(branchInfo: BranchInfo): Promise<void> {
    const safeBranchName = branchInfo.safeName;

    logger.debug('Initializing branch memory bank:', {
      originalName: branchInfo.name,
      safeName: safeBranchName,
    });

    try {
      await this.branchDirectoryManager.ensureBranchDirectoryExists(safeBranchName);

      const now = new Date().toISOString();
      const coreFilesToCreate = [
        {
          fileName: 'branchContext.json',
          content: {
            schema: 'memory_document_v2',
            metadata: { id: `${safeBranchName}-context`, title: `Branch Context for ${branchInfo.name}`, documentType: 'branch_context', path: 'branchContext.json', tags: [], createdAt: now, lastModified: now },
            content: { description: `Context for branch: ${branchInfo.name}` }
          }
        },
        {
          fileName: 'progress.json',
          content: {
            schema: 'memory_document_v2',
            metadata: { id: `${safeBranchName}-progress`, title: `Progress for ${branchInfo.name}`, documentType: 'progress', path: 'progress.json', tags: [], createdAt: now, lastModified: now },
            content: { summary: `Initial progress for branch: ${branchInfo.name}`, status: 'initialized', steps: [], next_steps: [], findings: [] }
          }
        },
        {
          fileName: 'activeContext.json',
          content: {
            schema: 'memory_document_v2',
            metadata: { id: `${safeBranchName}-active-context`, title: `Active Context for ${branchInfo.name}`, documentType: 'active_context', path: 'activeContext.json', tags: [], createdAt: now, lastModified: now },
            content: { current_task: `Initial active context for branch: ${branchInfo.name}`, relevant_files: [], recent_decisions: [] }
          }
        },
        {
          fileName: 'systemPatterns.json',
          content: {
            schema: 'memory_document_v2',
            metadata: { id: `${safeBranchName}-system-patterns`, title: `System Patterns for ${branchInfo.name}`, documentType: 'system_patterns', path: 'systemPatterns.json', tags: [], createdAt: now, lastModified: now },
            content: { patterns: [] }
          }
        }
      ];

      // Use for...of loop for sequential creation to ensure files exist before listDocuments might be called
      for (const fileInfo of coreFilesToCreate) {
        const docPath = DocumentPath.create(fileInfo.fileName);
        const tempDoc = MemoryDocument.create({
            path: docPath,
            content: JSON.stringify(fileInfo.content, null, 2),
            tags: fileInfo.content.metadata.tags.map((t: string) => Tag.create(t)),
            lastModified: new Date(fileInfo.content.metadata.lastModified)
        });
        await this.documentIO.saveDocument(branchInfo, tempDoc);
        logger.debug(`[initialize] Created core file: ${fileInfo.fileName}`); // Add log for confirmation
      }

    } catch (error: unknown) {
      logger.error('Failed to initialize branch memory bank or create core files:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new DomainError(
        DomainErrorCodes.REPOSITORY_ERROR,
        `Failed to initialize branch memory bank or create core files: ${error instanceof Error ? error.message : String(error)}`
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
    return this.documentIO.getDocument(branchInfo, documentPath);
  }


  /**
   * Save document to branch
   * @param branchInfo Branch information
   * @param document Document to save
   * @returns Promise resolving when done
   */
  async saveDocument(branchInfo: BranchInfo, document: MemoryDocument): Promise<void> {
    await this.documentIO.saveDocument(branchInfo, document);
  }

  /**
   * Delete document from branch
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns Promise resolving to boolean indicating success
   */
  async deleteDocument(branchInfo: BranchInfo, documentPath: DocumentPath): Promise<boolean> {
    return this.documentIO.deleteDocument(branchInfo, documentPath);
  }


  /**
   * List all documents in branch
   * @param branchInfo Branch information
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    return this.documentLister.listDocuments(branchInfo);
  }

  /**
   * Find documents by tags in branch
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  async findDocumentsByTags(branchInfo: BranchInfo, tags: Tag[]): Promise<MemoryDocument[]> {
    // ★ Delegate to DocumentFinder ★
    return this.documentFinder.findDocumentsByTags(branchInfo, tags);
  }

  /**
   * Get recent branches (これはこのクラスに残すか、別のManagerか？)
   * @param limit Maximum number of branches to return
   * @returns Promise resolving to array of recent branches
   */
  async getRecentBranches(limit?: number): Promise<RecentBranch[]> {
    // TODO: Delegate to a new RecentBranchFinder class? Or keep here?
    try {
      const entries = await fs.readdir(this.branchMemoryBankPath);
      const branches: RecentBranch[] = [];

      for (const entry of entries) {
        try {
          const entryPath = path.join(this.branchMemoryBankPath, entry);
          const stats = await fs.stat(entryPath);
          if (!stats.isDirectory()) {
              continue;
          }

          const branchInfo = BranchInfo.create(entry);

          const summary = {}; // Placeholder for summary

          branches.push({
            branchInfo,
            lastModified: stats.mtime,
            summary: summary
          } as RecentBranch);
        } catch(err: unknown) {
          logger.warn(`Skipping invalid branch entry: ${entry}`, { error: err instanceof Error ? err.message : String(err) });
        }
      }

      branches.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      return branches.slice(0, limit || 10);
    } catch (error: unknown) {
        logger.error(`Error reading recent branches from ${this.branchMemoryBankPath}:`, error);
        return [];
    }
  }

  /**
   * Validate branch structure
   * @param branchInfo Branch information
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  async validateStructure(branchInfo: BranchInfo): Promise<boolean> {
    return this.exists(branchInfo.safeName);
  }

  /**
   * Save tag index for branch
   * @param branchInfo Branch information
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveTagIndex(branchInfo: BranchInfo, tagIndex: TagIndex): Promise<void> {
    await this.tagIndexHandler.saveTagIndex(branchInfo, tagIndex);
  }

  /**
   * Get tag index for branch
   * @param branchInfo Branch information
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getTagIndex(branchInfo: BranchInfo): Promise<TagIndex | null> {
    return this.tagIndexHandler.getTagIndex(branchInfo);
  }


  /**
   * Find documents by tags in branch using index
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags (AND), otherwise any tag (OR)
   * @returns Promise resolving to array of document paths
   */
  async findDocumentPathsByTagsUsingIndex(params: {
    branchInfo: BranchInfo;
    tags: Tag[];
    matchAll?: boolean;
  }): Promise<DocumentPath[]> {
    // ★ Delegate to DocumentFinder ★
    // Note: DocumentFinder currently has a fallback implementation.
    // Actual index usage would require passing TagIndexHandler to DocumentFinder.
    return this.documentFinder.findDocumentPathsByTagsUsingIndex(params);
  }
}
