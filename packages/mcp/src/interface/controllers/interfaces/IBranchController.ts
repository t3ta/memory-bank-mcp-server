import type { DocumentDTO } from "../../../application/dtos/DocumentDTO.js";
import type { JsonDocumentDTO } from "../../../application/dtos/JsonDocumentDTO.js";
import type { MCPResponse } from "../../presenters/types/MCPResponse.js";
import type { IController } from "./IController.js";

/**
 * Interface for branch memory bank controller
 */
export interface IBranchController extends IController {
  /**
   * Read document from branch memory bank
   * @param branchName Branch name
   * @param path Document path
   * @returns Promise resolving to MCP response with document
   */
  readDocument(branchName: string, path: string): Promise<MCPResponse<DocumentDTO>>;

  /**
   * Write document to branch memory bank
   * @param params Parameters for writing the document
   * @param params.branchName Branch name
   * @param params.path Document path
   * @param params.content Document content
   * @param params.tags Optional tags for the document
   * @returns Promise resolving to MCP response with the result
   */
  writeDocument(params: {
     branchName: string;
     path: string;
    content?: any; // content は patches があれば不要なので optional に
    tags?: string[];
    patches?: any[]; // patches を追加 (optional)
  }): Promise<MCPResponse>;

  /**
   * Read core files from branch memory bank
   * @param branchName Branch name
   * @returns Promise resolving to MCP response with core files content
   */
  readCoreFiles(branchName: string): Promise<MCPResponse<Record<string, DocumentDTO>>>;

  /**
   * Write core files to branch memory bank
   * @param branchName Branch name
   * @param files Core files content
   * @returns Promise resolving to MCP response with the result
   */
  writeCoreFiles(branchName: string, files: Record<string, any>): Promise<MCPResponse>;

  /**
   * Get recent branches
   * @param limit Maximum number of branches to return
   * @returns Promise resolving to MCP response with recent branches
   */
  getRecentBranches(limit?: number): Promise<MCPResponse>;

  /**
   * Find documents by tags in branch memory bank
   * @param params Parameters for finding documents by tags
   * @param params.branchName Branch name
   * @param params.tags Tags to search for
   * @param params.matchAllTags Whether to require all tags to match
   * @returns Promise resolving to MCP response with matching documents
   */
  findDocumentsByTags(params: {
     branchName: string;
     tags: string[];
    matchAllTags?: boolean;
  }): Promise<MCPResponse<DocumentDTO[]>>;

  /**
   * Update tags index in branch memory bank
   * @param branchName Branch name
   * @param fullRebuild Whether to perform full rebuild of the index
   * @returns Promise resolving to MCP response with the result
   */
  updateTagsIndex(branchName: string, fullRebuild?: boolean): Promise<MCPResponse>;

  /**
   * Read JSON document from branch memory bank
   * @param branchName Branch name
   * @param options Options for reading document (path or ID)
   * @returns Promise resolving to MCP response with JSON document
   */
  readJsonDocument(
    branchName: string,
    options: { path?: string; id?: string }
  ): Promise<MCPResponse<JsonDocumentDTO>>;

  /**
   * Write JSON document to branch memory bank
   * @param branchName Branch name
   * @param document Document data to write
   * @returns Promise resolving to MCP response with the result
   */
  writeJsonDocument(branchName: string, document: JsonDocumentDTO): Promise<MCPResponse>;

  /**
   * Delete JSON document from branch memory bank
   * @param branchName Branch name
   * @param options Options for deleting document (path or ID)
   * @returns Promise resolving to MCP response with the result
   */
  deleteJsonDocument(
    branchName: string,
    options: { path?: string; id?: string }
  ): Promise<MCPResponse>;

  /**
   * List JSON documents in branch memory bank
   * @param branchName Branch name
   * @param options Options for listing documents (type, tags)
   * @returns Promise resolving to MCP response with list of documents
   */
  listJsonDocuments(
    branchName: string,
    options?: { type?: string; tags?: string[] }
  ): Promise<MCPResponse<JsonDocumentDTO[]>>;

  /**
   * Search JSON documents in branch memory bank
   * @param branchName Branch name
   * @param query Search query
   * @returns Promise resolving to MCP response with matching documents
   */
  searchJsonDocuments(branchName: string, query: string): Promise<MCPResponse<JsonDocumentDTO[]>>;

  /**
   * Update JSON index in branch memory bank
   * @param branchName Branch name
   * @param options Options for updating index (force rebuild)
   * @returns Promise resolving to MCP response with the result
   */
  updateJsonIndex(branchName: string, options?: { force?: boolean }): Promise<MCPResponse>;
}
