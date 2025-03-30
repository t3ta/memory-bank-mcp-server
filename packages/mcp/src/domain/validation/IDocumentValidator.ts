/**
 * Interface for document validators
 * Allows for validation of document data without domain entities
 * depending on specific validation libraries
 */
export interface IDocumentValidator {
  /**
   * Validates document content based on document type
   * @param documentType Type of document being validated
   * @param content Content to validate
   * @returns True if valid, throws error if invalid
   */
  validateContent(documentType: string, content: Record<string, unknown>): boolean;

  /**
   * Validates a complete document structure
   * @param document Complete document object to validate
   * @returns True if valid, throws error if invalid
   */
  validateDocument(document: unknown): boolean;

  /**
   * Validates document metadata
   * @param metadata Metadata to validate
   * @returns True if valid, throws error if invalid
   */
  validateMetadata(metadata: Record<string, unknown>): boolean;
}
