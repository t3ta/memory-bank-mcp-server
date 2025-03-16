import { MemoryDocument } from '../entities/MemoryDocument.js';
import { DocumentPath } from '../entities/DocumentPath.js';
import { Tag } from '../entities/Tag.js';

/**
 * Repository interface for memory documents
 */
export interface IMemoryDocumentRepository {
  /**
   * Find document by path
   * @param path Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  findByPath(path: DocumentPath): Promise<MemoryDocument | null>;

  /**
   * Find documents by tags
   * @param tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  findByTags(tags: Tag[]): Promise<MemoryDocument[]>;

  /**
   * Save document
   * @param document Document to save
   * @returns Promise resolving when done
   */
  save(document: MemoryDocument): Promise<void>;

  /**
   * Delete document
   * @param path Document path
   * @returns Promise resolving to boolean indicating success
   */
  delete(path: DocumentPath): Promise<boolean>;

  /**
   * List all document paths
   * @returns Promise resolving to array of document paths
   */
  list(): Promise<DocumentPath[]>;
}
