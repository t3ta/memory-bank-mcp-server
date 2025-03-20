import type { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import type { DocumentId } from "../../../domain/entities/DocumentId.js";
import type { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import type { Tag } from "../../../domain/entities/Tag.js";
import type { JsonDocument as SchemaJsonDocument } from "../../../schemas/json-document.js";
import type { JsonDocument } from "../../../domain/entities/JsonDocument.js";
import type { DocumentType } from "../../../domain/entities/JsonDocument.js";
import type { DocumentReference } from "../../../schemas/v2/index-schema.js";


/**
 * Interface for the document index service
 * Provides efficient lookup capabilities for documents
 */
export interface IIndexService {
  /**
   * Initialize the index for a branch
   * @param branchInfo Branch information
   * @returns Promise that resolves when initialization is complete
   */
  initializeIndex(branchInfo: BranchInfo): Promise<void>;

  /**
   * Build the index from a collection of documents
   * @param branchInfo Branch information
   * @param documents Documents to index
   * @returns Promise that resolves when indexing is complete
   */
  buildIndex(branchInfo: BranchInfo, documents: JsonDocument[]): Promise<void>;

  /**
   * Add a document to the index
   * @param branchInfo Branch information
   * @param document Document to add
   * @returns Promise that resolves when indexing is complete
   */
  addToIndex(branchInfo: BranchInfo, document: JsonDocument): Promise<void>;

  /**
   * Remove a document from the index
   * @param branchInfo Branch information
   * @param document Document or document ID or path to remove
   * @returns Promise that resolves when removal is complete
   */
  removeFromIndex(
    branchInfo: BranchInfo,
    document: JsonDocument | DocumentId | DocumentPath
  ): Promise<void>;

  /**
   * Find document references by ID
   * @param branchInfo Branch information
   * @param id Document ID
   * @returns Promise resolving to the document reference if found, or null if not found
   */
  findById(branchInfo: BranchInfo, id: DocumentId): Promise<DocumentReference | null>;

  /**
   * Find document references by path
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving to the document reference if found, or null if not found
   */
  findByPath(branchInfo: BranchInfo, path: DocumentPath): Promise<DocumentReference | null>;

  /**
   * Find document references by tags
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags; if false, any tag is sufficient
   * @returns Promise resolving to array of matching document references
   */
  findByTags(branchInfo: BranchInfo, tags: Tag[], matchAll?: boolean): Promise<DocumentReference[]>;

  /**
   * Find document references by document type
   * @param branchInfo Branch information
   * @param documentType Document type to search for
   * @returns Promise resolving to array of matching document references
   */
  findByType(branchInfo: BranchInfo, documentType: DocumentType): Promise<DocumentReference[]>;

  /**
   * List all document references
   * @param branchInfo Branch information
   * @returns Promise resolving to array of all document references
   */
  listAll(branchInfo: BranchInfo): Promise<DocumentReference[]>;

  /**
   * Save the index to persistent storage
   * @param branchInfo Branch information
   * @returns Promise that resolves when save is complete
   */
  saveIndex(branchInfo: BranchInfo): Promise<void>;

  /**
   * Load the index from persistent storage
   * @param branchInfo Branch information
   * @returns Promise that resolves when load is complete
   */
  loadIndex(branchInfo: BranchInfo): Promise<void>;
}
