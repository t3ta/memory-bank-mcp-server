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
}
