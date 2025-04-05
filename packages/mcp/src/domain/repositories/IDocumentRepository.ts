import type { DocumentPath } from '../entities/DocumentPath.js';
import type { MemoryDocument } from '../entities/MemoryDocument.js';

/**
 * Common interface for document repositories (Branch and Global).
 * Defines the essential methods required by the DocumentWriterService.
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

  // Add other common methods if needed by DocumentWriterService or future shared services.
  // For example:
  // exists(path: DocumentPath): Promise<boolean>;
  // deleteDocument(path: DocumentPath): Promise<void>;
}
