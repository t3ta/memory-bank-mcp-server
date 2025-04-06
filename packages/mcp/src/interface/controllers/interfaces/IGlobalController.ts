import type { DocumentDTO } from "../../../application/dtos/DocumentDTO.js"; // Keep for readDocument
import type { JsonDocumentDTO } from "../../../application/dtos/JsonDocumentDTO.js";
import type { MCPResponse } from "../../presenters/types/MCPResponse.js";
import type { IController } from "./IController.js";
import type { SearchDocumentsByTagsInput } from "../../../application/usecases/common/SearchDocumentsByTagsUseCase.js";
type SearchResults = any;

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
   * @param params Parameters for writing the document
   * @param params.path Document path
   * @param params.content Document content
   * @param params.tags Optional tags for the document
   * @returns Promise resolving to MCP response with the result
   */
  writeDocument(params: {
    path: string;
    content: string;
    tags?: string[];
  }): Promise<MCPResponse>;

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
   * Search documents by tags in memory banks
   * @param input Search parameters (tags, match, scope, branch, docs)
   * @returns Promise resolving to MCP response with search results
   */
  searchDocumentsByTags(input: SearchDocumentsByTagsInput): Promise<MCPResponse<SearchResults>>;

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
  listJsonDocuments(options?: {
    type?: string;
    tags?: string[];
  }): Promise<MCPResponse<JsonDocumentDTO[]>>;

  /**
   * Search JSON documents in global memory bank
   * @param query Search query
   * @returns Promise resolving to MCP response with matching documents
   */
  searchJsonDocuments(query: string): Promise<MCPResponse<JsonDocumentDTO[]>>;

  /**
   * Update JSON index in global memory bank
   * @param options Options for updating index (force rebuild)
   * @returns Promise resolving to MCP response with the result
   */
  updateJsonIndex(options?: { force?: boolean }): Promise<MCPResponse>;
}
