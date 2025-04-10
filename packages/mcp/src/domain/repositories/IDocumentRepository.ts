import type { DocumentPath } from '../entities/DocumentPath.js';
import type { MemoryDocument } from '../entities/MemoryDocument.js';

/**
 * Common interface for document repositories (Branch and Global).
 * This interface abstracts the common operations between branch and global memory banks.
 * Used by the DocumentWriterService and DocumentController to provide a unified interface.
 */
export interface IDocumentRepository {
  /**
   * Retrieves a document by its path.
   * @param path The path of the document to retrieve.
   * @returns A promise resolving to the MemoryDocument or null if not found.
   */
  getDocument(path: DocumentPath): Promise<MemoryDocument | null>;

  /**
   * Saves a document to the repository.
   * Implementations should handle creation or update as necessary.
   * Implementations are also responsible for updating any relevant indexes (like tags).
   * @param document The MemoryDocument to save.
   * @returns A promise resolving when the save operation is complete.
   */
  saveDocument(document: MemoryDocument): Promise<void>;

  /**
   * Check if a specific identifier exists in the repository
   * @param identifier The identifier to check (branch name for branch repos, any string for global)
   * @returns Promise resolving to boolean indicating if the identifier exists
   */
  exists?(identifier: string): Promise<boolean>;

  /**
   * Initialize repository or repository section
   * @param identifier Optional identifier for initialization (like branch info)
   * @returns Promise resolving when initialization is complete
   */
  initialize?(identifier?: any): Promise<void>;
}
