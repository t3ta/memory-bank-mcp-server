import { BranchInfo } from '../entities/BranchInfo';
import { DocumentPath } from '../entities/DocumentPath';
import { MemoryDocument } from '../entities/MemoryDocument';
import { Tag } from '../entities/Tag';
import { JsonDocument } from '../entities/JsonDocument';

/**
 * Common options for tag index operations
 */
export interface TagIndexOptions {
  /**
   * Whether to perform a full rebuild (default: false)
   */
  fullRebuild?: boolean;
}

/**
 * Result of a tag index update operation
 */
export interface TagIndexUpdateResult {
  /**
   * List of all unique tags found
   */
  tags: string[];

  /**
   * Number of documents indexed
   */
  documentCount: number;

  /**
   * Information about the update
   */
  updateInfo: {
    /**
     * Whether a full rebuild was performed
     */
    fullRebuild: boolean;

    /**
     * When the update was performed
     */
    timestamp: string;
  };
}

/**
 * Repository interface for tag index
 */
export interface ITagIndexRepository {
  /**
   * Update tag index for a branch
   * @param branchInfo Branch information
   * @param options Update options
   * @returns Promise resolving to update result
   */
  updateBranchTagIndex(
    branchInfo: BranchInfo,
    options?: TagIndexOptions
  ): Promise<TagIndexUpdateResult>;

  /**
   * Update global tag index
   * @param options Update options
   * @returns Promise resolving to update result
   */
  updateGlobalTagIndex(options?: TagIndexOptions): Promise<TagIndexUpdateResult>;

  /**
   * Find documents by tags in branch
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param matchAll Whether documents must have all tags (AND) or any tag (OR)
   * @returns Promise resolving to array of document paths matching the tags
   */
  findBranchDocumentsByTags(
    branchInfo: BranchInfo,
    tags: Tag[],
    matchAll?: boolean
  ): Promise<DocumentPath[]>;

  /**
   * Find documents by tags in global memory bank
   * @param tags Tags to search for
   * @param matchAll Whether documents must have all tags (AND) or any tag (OR)
   * @returns Promise resolving to array of document paths matching the tags
   */
  findGlobalDocumentsByTags(tags: Tag[], matchAll?: boolean): Promise<DocumentPath[]>;

  /**
   * Add or update document in branch tag index
   * @param branchInfo Branch information
   * @param document Document to add/update
   * @returns Promise resolving when done
   */
  addDocumentToBranchIndex(
    branchInfo: BranchInfo,
    document: MemoryDocument | JsonDocument
  ): Promise<void>;

  /**
   * Add or update document in global tag index
   * @param document Document to add/update
   * @returns Promise resolving when done
   */
  addDocumentToGlobalIndex(document: MemoryDocument | JsonDocument): Promise<void>;

  /**
   * Remove document from branch tag index
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving when done
   */
  removeDocumentFromBranchIndex(branchInfo: BranchInfo, path: DocumentPath): Promise<void>;

  /**
   * Remove document from global tag index
   * @param path Document path
   * @returns Promise resolving when done
   */
  removeDocumentFromGlobalIndex(path: DocumentPath): Promise<void>;

  /**
   * Get all tags in branch tag index
   * @param branchInfo Branch information
   * @returns Promise resolving to array of unique tags
   */
  getBranchTags(branchInfo: BranchInfo): Promise<Tag[]>;

  /**
   * Get all tags in global tag index
   * @returns Promise resolving to array of unique tags
   */
  getGlobalTags(): Promise<Tag[]>;
}
