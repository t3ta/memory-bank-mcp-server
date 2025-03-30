import type { GlobalTagIndex } from "@memory-bank/schemas";

 import type { DocumentPath } from "../entities/DocumentPath.js";
import type { MemoryDocument } from "../entities/MemoryDocument.js";
import type { Tag } from "../entities/Tag.js";

/**
 * Repository interface for global memory bank
 */
export interface IGlobalMemoryBankRepository {
  /**
   * Initialize global memory bank
   * @returns Promise resolving when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Get document from global memory bank
   * @param path Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  getDocument(path: DocumentPath): Promise<MemoryDocument | null>;

  /**
   * Save document to global memory bank
   * @param document Document to save
   * @returns Promise resolving when done
   */
  saveDocument(document: MemoryDocument): Promise<void>;

  /**
   * Delete document from global memory bank
   * @param path Document path
   * @returns Promise resolving to boolean indicating success
   */
  deleteDocument(path: DocumentPath): Promise<boolean>;

  /**
   * List all documents in global memory bank
   * @returns Promise resolving to array of document paths
   */
  listDocuments(): Promise<DocumentPath[]>;

  /**
   * Find documents by tags in global memory bank
   * @param tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  findDocumentsByTags(tags: Tag[]): Promise<MemoryDocument[]>;

  /**
   * Update tags index in global memory bank (legacy method)
   * @returns Promise resolving when done
   * @deprecated Use saveTagIndex instead
   */
  updateTagsIndex(): Promise<void>;

  /**
   * Save tag index for global memory bank
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  saveTagIndex(tagIndex: GlobalTagIndex): Promise<void>;

  /**
   * Get tag index for global memory bank
   * @returns Promise resolving to tag index if found, null otherwise
   */
  getTagIndex(): Promise<GlobalTagIndex | null>;

  /**
   * Find documents by tags in global memory bank using index
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags (AND), otherwise any tag (OR)
   * @returns Promise resolving to array of document paths
   */
  findDocumentPathsByTagsUsingIndex(tags: Tag[], matchAll?: boolean): Promise<DocumentPath[]>;

  /**
   * Validate global memory bank structure
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  validateStructure(): Promise<boolean>;
}
