/**
 * Data Transfer Object for writing a document
 */
export interface WriteDocumentDTO {
  /**
   * Document path
   */
  path: string;

  /**
   * Document content (optional if patches are provided)
   */
  content?: Record<string, unknown> | string;

  /**
   * Document tags (optional)
   */
  tags?: string[];
}
