/**
 * Data Transfer Object for memory document
 */
export interface DocumentDTO {
  /**
   * Document path
   */
  path: string;

  /**
   * Document content
   */
  content: string | object;

  /**
   * Document tags
   */
  tags: string[];

  /**
   * Last modified date (ISO string)
   */
  lastModified: string;
}
