import { Tool } from '../../tools/index.js';
import { DIContainer } from '../../main/di/DIContainer.js';
import { DocumentController } from '../controllers/DocumentController.js';

/**
 * Input parameters for write_document tool
 * This interface defines the parameters needed to write a document to either branch or global memory bank.
 */
export interface WriteDocumentParams {
  /**
   * Scope to write to (either 'branch' or 'global')
   */
  scope: 'branch' | 'global';
  
  /**
   * Branch name (required if scope is 'branch', auto-detected in project mode)
   */
  branch?: string;
  
  /**
   * Document path (e.g., "data/config.json")
   */
  path: string;
  
  /**
   * Document content to write (object or string, mutually exclusive with patches)
   */
  content?: Record<string, unknown> | string;
  
  /**
   * JSON Patch operations (RFC 6902, mutually exclusive with content)
   */
  patches?: Record<string, unknown>[];
  
  /**
   * Tags to assign to the document
   */
  tags?: string[];
  
  /**
   * Path to docs directory
   */
  docs: string;
  
  /**
   * If true, return the full document content in the output (default: false)
   */
  returnContent?: boolean;
}

/**
 * Input parameters for read_document tool
 * This interface defines the parameters needed to read a document from either branch or global memory bank.
 */
export interface ReadDocumentParams {
  /**
   * Scope to read from (either 'branch' or 'global')
   */
  scope: 'branch' | 'global';
  
  /**
   * Branch name (required if scope is 'branch', auto-detected in project mode)
   */
  branch?: string;
  
  /**
   * Document path (e.g., "data/config.json")
   */
  path: string;
  
  /**
   * Path to docs directory
   */
  docs: string;
}

/**
 * Implementation of write_document tool
 * Unified interface for writing to both branch and global memory banks
 * 
 * @example
 * // Writing to branch memory bank
 * const result = await write_document({
 *   scope: 'branch',
 *   branch: 'feature/my-branch',
 *   path: 'data/config.json',
 *   content: { key: 'value' },
 *   tags: ['config', 'feature'],
 *   docs: './docs'
 * });
 * 
 * @example
 * // Writing to global memory bank
 * const result = await write_document({
 *   scope: 'global',
 *   path: 'core/config.json',
 *   content: { key: 'value' },
 *   tags: ['config', 'core'],
 *   docs: './docs'
 * });
 * 
 * @example
 * // Using JSON patch
 * const result = await write_document({
 *   scope: 'branch',
 *   branch: 'feature/my-branch',
 *   path: 'data/config.json',
 *   patches: [{ op: 'replace', path: '/key', value: 'new-value' }],
 *   docs: './docs'
 * });
 */
export const write_document: Tool<WriteDocumentParams> = async (params) => {
  const { scope, branch, path, content, patches, tags, returnContent, docs } = params;
  
  // Get the DocumentController from the DI container
  const documentController = DIContainer.resolve<DocumentController>('documentController');
  
  // Call the appropriate controller method based on the scope
  return await documentController.writeDocument({
    scope,
    branchName: branch,
    path,
    content,
    patches,
    tags,
    returnContent
  });
};

/**
 * Implementation of read_document tool
 * Unified interface for reading from both branch and global memory banks
 * 
 * @example
 * // Reading from branch memory bank
 * const result = await read_document({
 *   scope: 'branch',
 *   branch: 'feature/my-branch',
 *   path: 'data/config.json',
 *   docs: './docs'
 * });
 * 
 * @example
 * // Reading from global memory bank
 * const result = await read_document({
 *   scope: 'global',
 *   path: 'core/config.json',
 *   docs: './docs'
 * });
 * 
 * @example
 * // Auto-detecting branch name in project mode
 * const result = await read_document({
 *   scope: 'branch',
 *   // No branch name needed if in project mode
 *   path: 'data/config.json',
 *   docs: './docs'
 * });
 */
export const read_document: Tool<ReadDocumentParams> = async (params) => {
  const { scope, branch, path, docs } = params;
  
  // Get the DocumentController from the DI container
  const documentController = DIContainer.resolve<DocumentController>('documentController');
  
  // Call the appropriate controller method based on the scope
  return await documentController.readDocument({
    scope,
    branchName: branch,
    path
  });
};
