import type { TagIndex } from "../../schemas/tag-index/tag-index-schema.js";
import type { BranchInfo } from "../entities/BranchInfo.js";
import type { DocumentPath } from "../entities/DocumentPath.js";
import type { MemoryDocument } from "../entities/MemoryDocument.js";
import type { Tag } from "../entities/Tag.js";

/**
 * Interface for recent branch information
 */
export interface RecentBranch {
  branchInfo: BranchInfo;
  lastModified: Date;
  summary: {
    currentWork?: string;
    recentChanges?: string[];
  };
}

/**
 * Repository interface for branch memory bank
 */
export interface IBranchMemoryBankRepository {
  /**
   * Find branch by name
   * @param branchName Branch name
   * @returns Promise resolving to boolean indicating if branch exists
   */
  exists(branchName: string): Promise<boolean>;

  /**
   * Initialize branch memory bank
   * @param branchInfo Branch information
   * @returns Promise resolving when initialization is complete
   */
  initialize(branchInfo: BranchInfo): Promise<void>;

  /**
   * Get document from branch
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  getDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<MemoryDocument | null>;

  /**
   * Save document to branch
   * @param branchInfo Branch information
   * @param document Document to save
   * @returns Promise resolving when done
   */
  saveDocument(branchInfo: BranchInfo, document: MemoryDocument): Promise<void>;

  /**
   * Delete document from branch
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving to boolean indicating success
   */
  deleteDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<boolean>;

  /**
   * List all documents in branch
   * @param branchInfo Branch information
   * @returns Promise resolving to array of document paths
   */
  listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]>;

  /**
   * Find documents by tags in branch
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  findDocumentsByTags(branchInfo: BranchInfo, tags: Tag[]): Promise<MemoryDocument[]>;

  /**
   * Get recent branches
   * @param limit Maximum number of branches to return
   * @returns Promise resolving to array of recent branches
   */
  getRecentBranches(limit?: number): Promise<RecentBranch[]>;

  /**
   * Validate branch structure
   * @param branchInfo Branch information
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  validateStructure(branchInfo: BranchInfo): Promise<boolean>;

  /**
   * Save tag index for branch
   * @param branchInfo Branch information
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  saveTagIndex(branchInfo: BranchInfo, tagIndex: TagIndex): Promise<void>;

  /**
   * Get tag index for branch
   * @param branchInfo Branch information
   * @returns Promise resolving to tag index if found, null otherwise
   */
  getTagIndex(branchInfo: BranchInfo): Promise<TagIndex | null>;

  /**
   * Find documents by tags in branch using index
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags (AND), otherwise any tag (OR)
   * @returns Promise resolving to array of document paths
   */
  findDocumentPathsByTagsUsingIndex(
    branchInfo: BranchInfo,
    tags: Tag[],
    matchAll?: boolean
  ): Promise<DocumentPath[]>;
}
