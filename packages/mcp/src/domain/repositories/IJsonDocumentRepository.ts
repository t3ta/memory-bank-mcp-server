import { BranchInfo } from '../entities/BranchInfo.js';
import { DocumentId } from '../entities/DocumentId.js';
import { DocumentPath } from '../entities/DocumentPath.js';
import { JsonDocument, DocumentType } from '../entities/JsonDocument.js';
import { Tag } from '../entities/Tag.js';

/**
 * Repository interface for managing JSON documents
 * This interface defines operations for storing, retrieving, and querying JSON documents
 */
export interface IJsonDocumentRepository {
  /**
   * Find a document by its ID
   * @param id Document ID
   * @returns Promise resolving to the document if found, or null if not found
   */
  findById(id: DocumentId): Promise<JsonDocument | null>;

  /**
   * Find a document by its path
   * @param branchInfo Branch information (for branch-specific repositories)
   * @param path Document path
   * @returns Promise resolving to the document if found, or null if not found
   */
  findByPath(branchInfo: BranchInfo, path: DocumentPath): Promise<JsonDocument | null>;

  /**
   * Find documents by tags
   * @param branchInfo Branch information (for branch-specific repositories)
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags; if false, any tag is sufficient
   * @returns Promise resolving to array of matching documents
   */
  findByTags(branchInfo: BranchInfo, tags: Tag[], matchAll?: boolean): Promise<JsonDocument[]>;

  /**
   * Find documents by document type
   * @param branchInfo Branch information (for branch-specific repositories)
   * @param documentType Document type to search for
   * @returns Promise resolving to array of matching documents
   */
  findByType(branchInfo: BranchInfo, documentType: DocumentType): Promise<JsonDocument[]>;

  /**
   * Save a document
   * @param branchInfo Branch information (for branch-specific repositories)
   * @param document Document to save
   * @returns Promise resolving to the saved document
   */
  save(branchInfo: BranchInfo, document: JsonDocument): Promise<JsonDocument>;

  /**
   * Delete a document
   * @param branchInfo Branch information (for branch-specific repositories)
   * @param document Document to delete (or document ID or path)
   * @returns Promise resolving to boolean indicating success
   */
  delete(
    branchInfo: BranchInfo,
    document: JsonDocument | DocumentId | DocumentPath
  ): Promise<boolean>;

  /**
   * List all documents
   * @param branchInfo Branch information (for branch-specific repositories)
   * @returns Promise resolving to array of all documents
   */
  listAll(branchInfo: BranchInfo): Promise<JsonDocument[]>;

  /**
   * Check if a document exists by path
   * @param branchInfo Branch information (for branch-specific repositories)
   * @param path Document path
   * @returns Promise resolving to boolean indicating existence
   */
  exists(branchInfo: BranchInfo, path: DocumentPath): Promise<boolean>;
}
