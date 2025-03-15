/**
 * Data Transfer Object for writing a document
 */
export interface WriteDocumentDTO {
  /**
   * Document path
   */
  path: string;
  
  /**
   * Document content
   */
  content: string;
  
  /**
   * Document tags (optional)
   */
  tags?: string[];
}
