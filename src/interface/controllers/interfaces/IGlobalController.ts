import { IController } from './IController.js';
import { MCPResponse } from '../../presenters/types/index.js';
import { DocumentDTO } from '../../../application/dtos/index.js';

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
}
