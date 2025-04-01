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
  async readDocument(branchName: string, path: string) {
    try {
      this.componentLogger.info('Reading branch document', { operation: 'readDocument', branchName, path });
      const document = await this.readBranchDocumentUseCase.execute({
        branchName,
        path,
      });

      return this.presenter.presentSuccess(document);
    } catch (error) {
      this.componentLogger.error('Failed to read branch document', { operation: 'readDocument', branchName, path, error });
      return this.handleError(error);
    }
  }

  /**
   * Write a branch document
   */
  async writeDocument(branchName: string, path: string, content: any) {
    try {
      this.componentLogger.info('Writing branch document', { operation: 'writeDocument', branchName, path });
      await this.writeBranchDocumentUseCase.execute({
        branchName,
        document: {
          path: path,
          content: content,
        }
      });

      return this.presenter.presentSuccess({ message: 'Document written successfully' });
    } catch (error) {
      this.componentLogger.error('Failed to write branch document', { operation: 'writeDocument', branchName, path, error });
      return this.handleError(error);
    }
  }

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
