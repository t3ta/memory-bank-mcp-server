import { IController } from './IController.js';
import { MCPResponse } from '../../presenters/types/index.js';
import { DocumentDTO } from '../../../application/dtos/index.js';

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
   * @param branchName Branch name
   * @param path Document path
   * @param content Document content
   * @param tags Optional tags for the document
   * @returns Promise resolving to MCP response with the result
   */
  writeDocument(branchName: string, path: string, content: string, tags?: string[]): Promise<MCPResponse>;
  
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
   * @param branchName Branch name
   * @param tags Tags to search for
   * @param matchAllTags Whether to require all tags to match
   * @returns Promise resolving to MCP response with matching documents
   */
  findDocumentsByTags(branchName: string, tags: string[], matchAllTags?: boolean): Promise<MCPResponse<DocumentDTO[]>>;
  
  /**
   * Update tags index in branch memory bank
   * @param branchName Branch name
   * @param fullRebuild Whether to perform full rebuild of the index
   * @returns Promise resolving to MCP response with the result
   */
  updateTagsIndex(branchName: string, fullRebuild?: boolean): Promise<MCPResponse>;
}
