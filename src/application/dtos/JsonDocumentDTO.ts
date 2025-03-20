import { DocumentType } from '../../domain/entities/JsonDocument';

/**
 * DTO for a JSON document
 * Contains all the fields necessary to represent a document in JSON format
 */
export interface JsonDocumentDTO {
  /**
   * Document ID (optional when creating, required when updating)
   */
  id?: string;

  /**
   * Document path
   */
  path?: string;

  /**
   * Document title
   */
  title: string;

  /**
   * Document type
   */
  documentType: DocumentType;

  /**
   * Document tags
   */
  tags?: string[];

  /**
   * Document content (structured data)
   */
  content: Record<string, any>;

  /**
   * Last modified timestamp (ISO string)
   */
  lastModified?: string;

  /**
   * Creation timestamp (ISO string)
   */
  createdAt?: string;

  /**
   * Document version
   */
  version?: number;
}
