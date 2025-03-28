import { JsonDocument } from '../entities/JsonDocument.js';

/**
 * Repository interface for JSON documents
 */
export interface JsonDocumentRepository {
  /**
   * Find a document in a branch
   * @param path Document path
   * @param branch Branch name
   * @returns Document or null if not found
   */
  findBranchDocument(path: string, branch: string): Promise<JsonDocument | null>;

  /**
   * Find a global document
   * @param path Document path
   * @returns Document or null if not found
   */
  findGlobalDocument(path: string): Promise<JsonDocument | null>;

  /**
   * Save a document to a branch
   * @param document Document to save
   * @returns Saved document
   */
  saveBranchDocument(document: JsonDocument): Promise<JsonDocument>;

  /**
   * Save a global document
   * @param document Document to save
   * @returns Saved document
   */
  saveGlobalDocument(document: JsonDocument): Promise<JsonDocument>;

  /**
   * Delete a document from a branch
   * @param path Document path
   * @param branch Branch name
   * @returns true if successful, false if document was not found
   */
  deleteBranchDocument(path: string, branch: string): Promise<boolean>;

  /**
   * Delete a global document
   * @param path Document path
   * @returns true if successful, false if document was not found
   */
  deleteGlobalDocument(path: string): Promise<boolean>;

  /**
   * List documents in a branch
   * @param branch Branch name
   * @returns List of document paths
   */
  listBranchDocuments(branch: string): Promise<string[]>;

  /**
   * List global documents
   * @returns List of document paths
   */
  listGlobalDocuments(): Promise<string[]>;
}
