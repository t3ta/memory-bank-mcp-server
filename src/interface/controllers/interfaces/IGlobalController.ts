import { IController } from './IController.js';
import { MCPResponse } from '../../presenters/types/index.js';
import { DocumentDTO, JsonDocumentDTO } from '../../../application/dtos/index.js';

/**
 * Interface for global memory bank controller
 */
export interface IGlobalController extends IController {
  /**
   * Read document from global memory bank
   * @param path Document path
   * @returns Promise resolving to MCP response with document
   */
  readDocument(path: string): Promise<MCPResponse<DocumentDTO>>;

  /**
   * Write document to global memory bank
   * @param path Document path
   * @param content Document content
   * @param tags Optional tags for the document
   * @returns Promise resolving to MCP response with the result
   */
  writeDocument(path: string, content: string, tags?: string[]): Promise<MCPResponse>;

  /**
   * Read core files from global memory bank
   * @returns Promise resolving to MCP response with core files content
   */
  readCoreFiles(): Promise<MCPResponse<Record<string, DocumentDTO>>>;

  /**
   * Update tags index in global memory bank
   * @returns Promise resolving to MCP response with the result
   */
  updateTagsIndex(): Promise<MCPResponse>;

  /**
   * Find documents by tags in global memory bank
   * @param tags Tags to search for
   * @returns Promise resolving to MCP response with matching documents
   */
  findDocumentsByTags(tags: string[]): Promise<MCPResponse<DocumentDTO[]>>;

  /**
   * Read JSON document from global memory bank
   * @param options Options for reading document (path or ID)
   * @returns Promise resolving to MCP response with JSON document
   */
  readJsonDocument(options: { path?: string; id?: string }): Promise<MCPResponse<JsonDocumentDTO>>;

  /**
   * Write JSON document to global memory bank
   * @param document Document data to write
   * @returns Promise resolving to MCP response with the result
   */
  writeJsonDocument(document: JsonDocumentDTO): Promise<MCPResponse>;

  /**
   * Delete JSON document from global memory bank
   * @param options Options for deleting document (path or ID)
   * @returns Promise resolving to MCP response with the result
   */
  deleteJsonDocument(options: { path?: string; id?: string }): Promise<MCPResponse>;

  /**
   * List JSON documents in global memory bank
   * @param options Options for listing documents (type, tags)
   * @returns Promise resolving to MCP response with list of documents
   */
  listJsonDocuments(options?: { type?: string; tags?: string[] }): Promise<MCPResponse<JsonDocumentDTO[]>>;

  /**
   * Search JSON documents in global memory bank
   * @param query Search query
   * @returns Promise resolving to MCP response with matching documents
   */
  searchJsonDocuments(query: string): Promise<MCPResponse<JsonDocumentDTO[]>>;
}
