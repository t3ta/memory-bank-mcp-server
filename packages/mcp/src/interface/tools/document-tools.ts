// Define Tool type if not exported from tools/index.js
type Tool<T> = (params: T) => Promise<any>;
import { DocumentController } from '../controllers/DocumentController.js';
import { Application } from '../../main/Application.js';
import { setupContainer } from '../../main/di/providers.js';
import { ReadBranchDocumentUseCase } from '../../application/usecases/branch/ReadBranchDocumentUseCase.js';
import { WriteBranchDocumentUseCase } from '../../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { ReadGlobalDocumentUseCase } from '../../application/usecases/global/ReadGlobalDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '../../application/usecases/global/WriteGlobalDocumentUseCase.js';
// import { DocumentRepositorySelector } from '../../application/services/DocumentRepositorySelector.js'; // Not used in the current implementation
import { MCPResponsePresenter } from '../presenters/MCPResponsePresenter.js';

// Global app instance for tool commands
// This is a simplified approach for tests - in a real environment
// we would use a proper dependency injection system
let globalApp: Application | null = null;
let container: any = null;

/**
 * Get or create a global Application instance
 * @param docsRoot Docs root directory
 * @returns Application instance
 */
async function getOrCreateApp(docsRoot: string): Promise<Application> {
  if (!globalApp) {
    console.log(`[getOrCreateApp] Creating new Application instance with docsRoot: ${docsRoot}`);
    globalApp = new Application({ docsRoot });
    
    console.log(`[getOrCreateApp] Initializing Application...`);
    await globalApp.initialize();
    
    console.log(`[getOrCreateApp] Setting up container...`);
    container = await setupContainer({ docsRoot });
    console.log(`[getOrCreateApp] Container setup complete`);
  } else {
    console.log(`[getOrCreateApp] Reusing existing Application instance`);
  }
  return globalApp;
}

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
export const write_document: Tool<WriteDocumentParams> = async (params: WriteDocumentParams) => {
  const { scope, branch, path, content, patches, tags, returnContent, docs } = params;
  
  try {
    console.log(`[write_document] Starting write_document operation:`, {
      scope,
      branch,
      path,
      hasContent: !!content,
      hasPatches: !!patches,
      hasTags: !!tags,
      returnContent,
      docs
    });
    
    // Get the app and container
    await getOrCreateApp(docs);
    
    console.log(`[write_document] Getting dependencies from container...`);
    // Get necessary dependencies from container
    const readBranchUseCase = await container.get('readBranchDocumentUseCase') as ReadBranchDocumentUseCase;
    const writeBranchUseCase = await container.get('writeBranchDocumentUseCase') as WriteBranchDocumentUseCase;
    const readGlobalUseCase = await container.get('readGlobalDocumentUseCase') as ReadGlobalDocumentUseCase;
    const writeGlobalUseCase = await container.get('writeGlobalDocumentUseCase') as WriteGlobalDocumentUseCase;
    // const repoSelector = await container.get('documentRepositorySelector') as DocumentRepositorySelector; // Not used in the current implementation
    const presenter = await container.get('mcpResponsePresenter') as MCPResponsePresenter;
    console.log(`[write_document] Dependencies retrieved successfully`);
    
    // Create document controller with direct dependencies
    console.log(`[write_document] Creating DocumentController...`);
    const documentController = new DocumentController(
      readBranchUseCase,
      writeBranchUseCase,
      readGlobalUseCase,
      writeGlobalUseCase,
      // repoSelector, // Not used in the current implementation
      presenter
    );
  
    // Ensure directories exist for paths (handle nested paths like 'core/file.json')
    // We need to do this for both global and branch memory banks
    try {
      const fs = await import('fs/promises');
      
      if (scope === 'global' && path.includes('/')) {
        const docPath = docs;
        const globalMemoryPath = `${docPath}/global-memory-bank`;
        
        // Extract directory part from path
        const pathParts = path.split('/');
        const dirParts = pathParts.slice(0, -1); // All except the last part (filename)
        
        if (dirParts.length > 0) {
          // Construct the absolute directory path
          const dirPath = `${globalMemoryPath}/${dirParts.join('/')}`;
          console.log(`[write_document] Ensuring global directory exists: ${dirPath}`);
          
          // Use fs promises to ensure the directory exists
          try {
            await fs.mkdir(dirPath, { recursive: true });
            console.log(`[write_document] Global directory created or verified: ${dirPath}`);
          } catch (dirError) {
            console.error(`[write_document] Failed to create global directory: ${dirError}`);
            // Continue anyway, the controller might handle this differently
          }
        }
      } else if (scope === 'branch' && path.includes('/')) {
        // For branch, we need to handle branch directory structure
        const docPath = docs;
        
        // Get branch name either from parameters or via auto-detection
        let branchNameToUse = branch;
        if (!branchNameToUse) {
          console.log(`[write_document] No branch name provided, auto-detecting...`);
          // Use GitService to auto-detect branch in project mode
          const gitService = await container.get('gitService');
          branchNameToUse = await gitService.getCurrentBranchName();
          console.log(`[write_document] Auto-detected branch name: ${branchNameToUse}`);
        }
        
        // Get safe branch name
        const BranchInfo = (await import('../../domain/entities/BranchInfo.js')).BranchInfo;
        const safeBranchName = BranchInfo.create(branchNameToUse).safeName;
        const branchMemoryPath = `${docPath}/branch-memory-bank/${safeBranchName}`;
        
        // Create branch directory if it doesn't exist
        try {
          await fs.mkdir(branchMemoryPath, { recursive: true });
          console.log(`[write_document] Branch directory created or verified: ${branchMemoryPath}`);
        } catch (branchDirError) {
          console.error(`[write_document] Failed to create branch directory: ${branchDirError}`);
        }
        
        // Extract directory part from path
        const pathParts = path.split('/');
        const dirParts = pathParts.slice(0, -1); // All except the last part (filename)
        
        if (dirParts.length > 0) {
          // Construct the absolute directory path
          const dirPath = `${branchMemoryPath}/${dirParts.join('/')}`;
          console.log(`[write_document] Ensuring branch subdirectory exists: ${dirPath}`);
          
          try {
            await fs.mkdir(dirPath, { recursive: true });
            console.log(`[write_document] Branch subdirectory created or verified: ${dirPath}`);
          } catch (dirError) {
            console.error(`[write_document] Failed to create branch subdirectory: ${dirError}`);
          }
        }
      }
    } catch (error) {
      console.error('[write_document] Error ensuring directories exist:', error);
    }
    
    // Call the appropriate controller method based on the scope
    console.log(`[write_document] Calling documentController.writeDocument...`);
    const result = await documentController.writeDocument({
      scope,
      branchName: branch,
      path,
      content,
      patches,
      tags,
      returnContent
    });
    
    // Log the result from the controller
    console.log(`[write_document] DocumentController result:`, {
      success: result.success,
      hasData: result.success && !!result.data,
      dataContent: result.success && result.data?.content ? typeof result.data.content : 'undefined',
      dataTags: result.success && result.data?.tags ? result.data.tags.join(',') : 'undefined'
    });
    
    // Transform the response to match what E2E tests expect
    if (result.success && result.data) {
      // Log the actual structure of the result data for debugging
      console.log(`[write_document] Raw result.data structure:`, JSON.stringify(result.data, null, 2));
      
      // Extract data from the result
      let finalResult;
      
      // Check if the result has a document property structure
      if (result.data.document) {
        console.log(`[write_document] Result has document property structure, extracting directly`);
        // The document property contains the actual data structure we want to return
        
        // Check if the content is nested in another level
        let content = result.data.document.content;
        // Try to use original tags from params, or extract from response
        let tags = params.tags || result.data.document.tags || [];
        
        // Specifically for memory documents, extract tags from metadata if available
        if (content && content.metadata && Array.isArray(content.metadata.tags) && content.metadata.tags.length > 0) {
          console.log(`[write_document] Extracting tags from content.metadata`, content.metadata.tags);
          tags = content.metadata.tags;
        }
        
        finalResult = {
          success: true,
          data: {
            path,
            content: content,
            tags: tags,
            lastModified: result.data.document.lastModified
          }
        };
      } else {
        console.log(`[write_document] Result does not have document property, constructing response`);
        // Fallback for other result structures
        let content = result.data.content;
        // Default to the original requested tags when possible
        let tags = params.tags || [];
        
        // Try to extract tags from various possible locations
        if (!tags.length && Array.isArray(result.data.tags)) {
          tags = result.data.tags;
        } else if (!tags.length && result.data.metadata && Array.isArray(result.data.metadata.tags)) {
          tags = result.data.metadata.tags;
        } else if (!tags.length && content && content.metadata && Array.isArray(content.metadata.tags)) {
          tags = content.metadata.tags;
        }
        
        const lastModified = result.data.lastModified || 
          (result.data.metadata ? result.data.metadata.lastModified : new Date().toISOString());
        
        finalResult = {
          success: true,
          data: {
            path,
            content: content,
            tags: tags,
            lastModified: lastModified
          }
        };
      }
      
      // Debugging the final result structure
      console.log(`[write_document] Final result structure:`, {
        success: finalResult.success,
        hasPath: !!finalResult.data.path,
        hasContent: !!finalResult.data.content,
        contentType: typeof finalResult.data.content,
        hasTags: Array.isArray(finalResult.data.tags),
        tagCount: Array.isArray(finalResult.data.tags) ? finalResult.data.tags.length : 0,
        hasLastModified: !!finalResult.data.lastModified
      });
      
      const response = finalResult;
      
      console.log(`[write_document] Response structure:`, {
        hasContent: !!response.data.content,
        contentType: typeof response.data.content,
        tagsExist: Array.isArray(response.data.tags),
        tagCount: Array.isArray(response.data.tags) ? response.data.tags.length : 0
      });
      
      console.log(`[write_document] Returning successful response`);
      return response;
    }
    
    console.log(`[write_document] Returning original result:`, {
      success: result.success,
      hasError: !result.success,
      errorMessage: !result.success ? 'Error occurred' : undefined
    });
    return result;
  } catch (error) {
    console.error('Error in write_document:', error);
    throw error;
  }
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
  
  try {
    console.log(`[read_document] Starting read_document operation:`, {
      scope,
      branch,
      path,
      docs
    });
    
    // Get the app and container
    await getOrCreateApp(docs);
    
    console.log(`[read_document] Getting dependencies from container...`);
    // Get necessary dependencies from container
    const readBranchUseCase = await container.get('readBranchDocumentUseCase') as ReadBranchDocumentUseCase;
    const writeBranchUseCase = await container.get('writeBranchDocumentUseCase') as WriteBranchDocumentUseCase;
    const readGlobalUseCase = await container.get('readGlobalDocumentUseCase') as ReadGlobalDocumentUseCase;
    const writeGlobalUseCase = await container.get('writeGlobalDocumentUseCase') as WriteGlobalDocumentUseCase;
    // const repoSelector = await container.get('documentRepositorySelector') as DocumentRepositorySelector; // Not used in the current implementation
    const presenter = await container.get('mcpResponsePresenter') as MCPResponsePresenter;
    console.log(`[read_document] Dependencies retrieved successfully`);
    
    // Create document controller with direct dependencies
    console.log(`[read_document] Creating DocumentController...`);
    const documentController = new DocumentController(
      readBranchUseCase,
      writeBranchUseCase,
      readGlobalUseCase,
      writeGlobalUseCase,
      // repoSelector, // Not used in the current implementation
      presenter
    );
  
    // Ensure directories exist for both global and branch paths when reading
    // This helps with tests by ensuring the directory structure exists
    try {
      const fs = await import('fs/promises');
      
      if (scope === 'global' && path.includes('/')) {
        const docPath = docs;
        const globalMemoryPath = `${docPath}/global-memory-bank`;
        
        // Extract directory part from path
        const pathParts = path.split('/');
        const dirParts = pathParts.slice(0, -1); // All except the last part (filename)
        
        if (dirParts.length > 0) {
          // Construct the absolute directory path
          const dirPath = `${globalMemoryPath}/${dirParts.join('/')}`;
          console.log(`[read_document] Checking if global directory exists: ${dirPath}`);
          
          // Use fs promises to check if the directory exists
          try {
            try {
              await fs.access(dirPath);
              console.log(`[read_document] Global directory exists: ${dirPath}`);
            } catch {
              // Directory doesn't exist, create it
              console.log(`[read_document] Global directory doesn't exist, creating: ${dirPath}`);
              await fs.mkdir(dirPath, { recursive: true });
            }
          } catch (dirError) {
            console.error(`[read_document] Failed to check/create global directory: ${dirError}`);
          }
        }
      } else if (scope === 'branch' && path.includes('/')) {
        const docPath = docs;
        
        // Get branch name either from parameters or via auto-detection
        let branchNameToUse = branch;
        if (!branchNameToUse) {
          console.log(`[read_document] No branch name provided, auto-detecting...`);
          // Use GitService to auto-detect branch in project mode
          const gitService = await container.get('gitService');
          branchNameToUse = await gitService.getCurrentBranchName();
          console.log(`[read_document] Auto-detected branch name: ${branchNameToUse}`);
        }
        
        // Get safe branch name
        const BranchInfo = (await import('../../domain/entities/BranchInfo.js')).BranchInfo;
        const safeBranchName = BranchInfo.create(branchNameToUse).safeName;
        const branchMemoryPath = `${docPath}/branch-memory-bank/${safeBranchName}`;
        
        // Create branch directory if it doesn't exist
        try {
          await fs.mkdir(branchMemoryPath, { recursive: true });
          console.log(`[read_document] Branch directory created or verified: ${branchMemoryPath}`);
        } catch (branchDirError) {
          console.error(`[read_document] Failed to create branch directory: ${branchDirError}`);
        }
        
        // Extract directory part from path
        const pathParts = path.split('/');
        const dirParts = pathParts.slice(0, -1); // All except the last part (filename)
        
        if (dirParts.length > 0) {
          // Construct the absolute directory path
          const dirPath = `${branchMemoryPath}/${dirParts.join('/')}`;
          console.log(`[read_document] Checking if branch subdirectory exists: ${dirPath}`);
          
          try {
            try {
              await fs.access(dirPath);
              console.log(`[read_document] Branch subdirectory exists: ${dirPath}`);
            } catch {
              // Directory doesn't exist, create it
              console.log(`[read_document] Branch subdirectory doesn't exist, creating: ${dirPath}`);
              await fs.mkdir(dirPath, { recursive: true });
            }
          } catch (dirError) {
            console.error(`[read_document] Failed to check/create branch subdirectory: ${dirError}`);
          }
        }
      }
    } catch (error) {
      console.error('[read_document] Error ensuring directories exist:', error);
    }
    
    // Call the appropriate controller method based on the scope
    console.log(`[read_document] Calling documentController.readDocument...`);
    const result = await documentController.readDocument({
      scope,
      branchName: branch,
      path
    });
    
    // Log the result from the controller
    console.log(`[read_document] DocumentController result:`, {
      success: result.success,
      hasData: result.success && !!result.data,
      dataContent: result.success && result.data?.content ? typeof result.data.content : 'undefined',
      dataTags: result.success && result.data?.tags ? result.data.tags.join(',') : 'undefined'
    });
    
    // Transform the response to match what E2E tests expect
    if (result.success && result.data) {
      // Log the actual structure of the result data for debugging
      console.log(`[read_document] Raw result.data structure:`, JSON.stringify(result.data, null, 2));
      
      // Extract data from the result
      let finalResult;
      
      // Check if the result has a document property structure
      if (result.data.document) {
        console.log(`[read_document] Result has document property structure, extracting directly`);
        // The document property contains the actual data structure we want to return
        
        // Check if the content is nested in another level
        let content = result.data.document.content;
        let tags = result.data.document.tags || [];
        
        // Specifically for memory documents, extract tags from metadata if available
        if (content && content.metadata && Array.isArray(content.metadata.tags) && content.metadata.tags.length > 0) {
          console.log(`[read_document] Extracting tags from content.metadata`, content.metadata.tags);
          tags = content.metadata.tags;
        }
        
        finalResult = {
          success: true,
          data: {
            path,
            content: content,
            tags: tags,
            lastModified: result.data.document.lastModified
          }
        };
      } else {
        console.log(`[read_document] Result does not have document property, constructing response`);
        // Fallback for other result structures
        let content = result.data.content;
        let tags = [];
        
        // Try to extract tags from various possible locations
        if (Array.isArray(result.data.tags)) {
          tags = result.data.tags;
        } else if (result.data.metadata && Array.isArray(result.data.metadata.tags)) {
          tags = result.data.metadata.tags;
        } else if (content && content.metadata && Array.isArray(content.metadata.tags)) {
          tags = content.metadata.tags;
        }
        
        const lastModified = result.data.lastModified || 
          (result.data.metadata ? result.data.metadata.lastModified : new Date().toISOString());
        
        finalResult = {
          success: true,
          data: {
            path,
            content: content,
            tags: tags,
            lastModified: lastModified
          }
        };
      }
      
      // Debugging the final result structure
      console.log(`[read_document] Final result structure:`, {
        success: finalResult.success,
        hasPath: !!finalResult.data.path,
        hasContent: !!finalResult.data.content,
        contentType: typeof finalResult.data.content,
        hasTags: Array.isArray(finalResult.data.tags),
        tagCount: Array.isArray(finalResult.data.tags) ? finalResult.data.tags.length : 0,
        hasLastModified: !!finalResult.data.lastModified
      });
      
      const response = finalResult;
      
      console.log(`[read_document] Response content type:`, typeof response.data.content);
      console.log(`[read_document] Response structure:`, {
        hasContent: !!response.data.content,
        contentType: typeof response.data.content,
        tagsExist: Array.isArray(response.data.tags),
        tagCount: Array.isArray(response.data.tags) ? response.data.tags.length : 0
      });
      
      console.log(`[read_document] Returning successful response`);
      return response;
    }
    
    console.log(`[read_document] Returning original result:`, {
      success: result.success,
      hasError: !result.success,
      errorMessage: !result.success ? 'Error occurred' : undefined
    });
    return result;
  } catch (error) {
    console.error('Error in read_document:', error);
    throw error;
  }
};
