import { logger } from '../../shared/utils/logger.js';
import { MCPResponsePresenter } from '../presenters/MCPResponsePresenter.js';
import { ReadBranchDocumentUseCase } from '../../application/usecases/branch/ReadBranchDocumentUseCase.js';
import { WriteBranchDocumentUseCase } from '../../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { SearchDocumentsByTagsUseCase } from '../../application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { UpdateTagIndexUseCase } from '../../application/usecases/common/UpdateTagIndexUseCase.js';
import { GetRecentBranchesUseCase } from '../../application/usecases/common/GetRecentBranchesUseCase.js';
import { ReadBranchCoreFilesUseCase } from '../../application/usecases/common/ReadBranchCoreFilesUseCase.js';
import { CreateBranchCoreFilesUseCase } from '../../application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { DomainErrors } from '../../shared/errors/DomainError.js';
import type { IConfigProvider } from '../../infrastructure/config/interfaces/IConfigProvider.js';
import { ApplicationErrors } from '../../shared/errors/ApplicationError.js';
import { BaseError } from '../../shared/errors/BaseError.js';

/**
 * Controller for branch related operations
 */
export class BranchController {
  private readonly componentLogger = logger.withContext({ component: 'BranchController' });

  constructor(
    private readonly readBranchDocumentUseCase: ReadBranchDocumentUseCase,
    private readonly writeBranchDocumentUseCase: WriteBranchDocumentUseCase,
    private readonly searchDocumentsByTagsUseCase: SearchDocumentsByTagsUseCase,
    private readonly updateTagIndexUseCase: UpdateTagIndexUseCase,
    private readonly getRecentBranchesUseCase: GetRecentBranchesUseCase,
    private readonly readBranchCoreFilesUseCase: ReadBranchCoreFilesUseCase,
    private readonly createBranchCoreFilesUseCase: CreateBranchCoreFilesUseCase,
    private readonly presenter: MCPResponsePresenter,
    private readonly configProvider: IConfigProvider, // Inject ConfigProvider
  ) { }

  /**
   * Read a branch document
   */

  async readDocument(branchName: string | undefined, path: string) {
    try {
      // branchName が undefined でもログにはそのまま記録される
      this.componentLogger.info('Reading branch document', { operation: 'readDocument', branchName, path });
      // UseCase にそのまま渡す（UseCase側で undefined を処理）
      const document = await this.readBranchDocumentUseCase.execute({
        branchName, // undefined の可能性あり
        path,
      });

      return this.presenter.presentSuccess(document);
    } catch (error) {
      // エラーログでも branchName は undefined の可能性がある
      this.componentLogger.error('Failed to read branch document', { operation: 'readDocument', branchName, path, error });
      return this.handleError(error);
    }
  }

  /**
   * Write a branch document
   */
  async writeDocument(params: {
    branchName?: string;
    path: string;
    content?: string; // Explicitly define content as string
    tags?: string[];
    patches?: any[]; // Add patches parameter
  }) {
    // Destructure params
    const { branchName, path, content, tags, patches } = params;
    try {
      // Determine conditions first
      const hasPatches = patches && Array.isArray(patches) && patches.length > 0;
      // Check if content is not undefined, not null, AND not an empty string
      const hasContent = content !== undefined && content !== null && content !== '';

      // branchName が undefined でもログにはそのまま記録される
      this.componentLogger.info('Writing branch document', { operation: 'writeDocument', branchName, path, hasContent, hasPatches });


      if (hasPatches) {

        // Call WriteBranchDocumentUseCase with patches
        const result = await this.writeBranchDocumentUseCase.execute({
          branchName, // undefined の可能性あり
          document: { // Pass path and tags from the document object
            path: path,
            tags: tags,

            content: undefined // Pass undefined when using patches
          },
          patches: patches // Pass the patches array
        });
        // Log the result from the use case and the data being presented

       return this.presenter.presentSuccess(result.document);
      } else if (hasContent) {

        // If content is provided (and no patches), call the existing UseCase
        // Content is already known to be a non-empty string here due to hasContent check
        const result = await this.writeBranchDocumentUseCase.execute({
          branchName, // undefined の可能性あり
          document: { // Pass data matching WriteDocumentDTO
            path: path,
            content: content, // Pass the valid string content
            tags: tags // Pass tags if available
          }
          // No patches field here
        });
         // Return the document DTO directly from the use case result
        return this.presenter.presentSuccess(result.document);
      } else {

        // Handle the case where neither content nor patches are provided (or patches is an empty array)
        // This might need a dedicated initialization UseCase or logic.
        // For now, return the initialization message similar to routes.ts logic.
        // Or call UseCase with empty content for initialization? Let's return a specific message for now.
        const patchesType = typeof patches;
        const patchesValue = JSON.stringify(patches);
        const patchesLength = Array.isArray(patches) ? patches.length : 'N/A';
        const contentType = typeof content;
        const contentValue = JSON.stringify(content);
        const debugMessage = `DEBUG: Entered init branch unexpectedly. patches type: ${patchesType}, patches length: ${patchesLength}, patches value: ${patchesValue}, content type: ${contentType}, content value: ${contentValue}`;
        // branchName が undefined でもログにはそのまま記録される
        this.componentLogger.info(debugMessage, { operation: 'writeDocument', branchName, path });
        // Return debug information in the response
        return this.presenter.presentSuccess({ message: debugMessage });
      }
    } catch (error) {
      // Log the error with destructured variables available in this scope
      // エラーログでも branchName は undefined の可能性がある
      this.componentLogger.error('Failed to write branch document', { operation: 'writeDocument', branchName, path, error }); // Log with available context
      return this.handleError(error);
    }
  } // Closing brace for the writeDocument method

  /**
   * Read core files for a branch
   */
  async readCoreFiles(branchName: string) {
    try {
      this.componentLogger.info('Reading branch core files', { operation: 'readCoreFiles', branchName });
      const result = await this.readBranchCoreFilesUseCase.execute({ branchName });
      return this.presenter.presentSuccess(result);
    } catch (error) {
      this.componentLogger.error('Failed to read branch core files', { operation: 'readCoreFiles', branchName, error });
      return this.handleError(error);
    }
  }

  /**
   * Create core files for a branch
   */
  async createCoreFiles(branchName: string, files: Record<string, any>) {
    try {
      this.validateFiles(files);
      this.componentLogger.info('Creating branch core files', { operation: 'createCoreFiles', branchName });

      await this.createBranchCoreFilesUseCase.execute({
        branchName: branchName,
        files,
      });

      return this.presenter.presentSuccess({ message: 'Core files created successfully' });
    } catch (error) {
      this.componentLogger.error('Failed to create branch core files', { operation: 'createCoreFiles', branchName, error });
      return this.handleError(error);
    }
  }

  /**
   * Search documents by tags
   */
  // Update method signature and implementation to use new input schema
  // Update method signature: remove docs from params as it's obtained via configProvider
  async searchByTags(params: {
    tags: string[];
    branchName: string;
    match?: 'and' | 'or';
    // Removed 'docs' from params type
  }) {
    try {
      const { tags, branchName, match } = params; // Remove docs from destructuring
      this.componentLogger.info('Searching branch documents by tags', { operation: 'searchByTags', branchName, tags, match });
      // Get docs path from injected configProvider
      const docsPath = this.configProvider.getConfig().docsRoot; // Use a different variable name
      if (!docsPath) {
        throw new Error("Docs path could not be determined from config.");
      }

      const result = await this.searchDocumentsByTagsUseCase.execute({
        tags,
        branchName,
        match: match ?? 'or', // Default to 'or'
        scope: 'branch', // Always search within the specified branch
        docs: docsPath, // Pass determined docs path
      });
      return this.presenter.presentSuccess(result); // Return the SearchResults object
    } catch (error) {
      this.componentLogger.error('Failed to search documents by tags', { operation: 'searchByTags', branchName: params.branchName, tags: params.tags, match: params.match, error }); // Use params.tags
      return this.handleError(error);
    }
  }

  /**
   * Update tag index for a branch
   */
  async updateTagIndex(branchName: string) {
    try {
      this.componentLogger.info('Updating tag index', { operation: 'updateTagIndex', branchName });
      await this.updateTagIndexUseCase.execute({ branchName });
      return this.presenter.presentSuccess({ message: 'Tag index updated successfully' });
    } catch (error) {
      this.componentLogger.error('Failed to update tag index', { operation: 'updateTagIndex', error });
      return this.handleError(error);
    }
  }

  /**
   * Get recent branches
   */
  async getRecentBranches() {
    try {
      this.componentLogger.info('Getting recent branches', { operation: 'getRecentBranches' });
      const branches = await this.getRecentBranchesUseCase.execute({});
      return this.presenter.presentSuccess(branches);
    } catch (error) {
      this.componentLogger.error('Failed to get recent branches', { operation: 'getRecentBranches', error });
      return this.handleError(error);
    }
  }

  /**
   * Validate files input
   */
  private validateFiles(files: any): void {
    if (!files || typeof files !== 'object') {
      throw DomainErrors.validationError('Files must be provided as an object');
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown) {
    if (error instanceof BaseError) {
      return this.presenter.presentError(error);
    }

    // Convert unknown errors to ApplicationError
    const applicationError = ApplicationErrors.unexpectedControllerError(
      'BranchController',
      error instanceof Error ? error : undefined
    );
    return this.presenter.presentError(applicationError);
  }
}
