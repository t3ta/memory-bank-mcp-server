/**
 * Interface for document validation
 * This allows document entities to validate without direct dependency on specific validation libraries
 */
export interface IDocumentValidator {
  /**
   * Validate a JSON string
   * @param jsonString JSON string to validate
   * @throws Error if validation fails
   */
  validateJsonString(jsonString: string): void;
  
  /**
   * Validate a JSON object against basic document schema
   * @param jsonData JSON object to validate
   * @throws Error if validation fails
   */
  validateBaseDocument(jsonData: unknown): void;
  
  /**
   * Validate a document by type
   * @param documentType Type of document to validate
   * @param jsonData JSON object to validate
   * @throws Error if validation fails
   */
  validateDocumentByType(documentType: string, jsonData: unknown): void;
  
  /**
   * Validate document content by type
   * @param documentType Type of document
   * @param content Content to validate
   * @throws Error if validation fails
   */
  validateContentByType(documentType: string, content: Record<string, unknown>): void;
}
