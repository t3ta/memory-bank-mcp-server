import type { CoreFilesDTO } from "../../application/dtos/CoreFilesDTO.js";
import type { DocumentDTO } from "../../application/dtos/DocumentDTO.js";
import type { JsonDocumentDTO } from "../../application/dtos/JsonDocumentDTO.js";
import type { UpdateTagIndexUseCaseV2 } from "../../application/usecases/common/UpdateTagIndexUseCaseV2.js";
import type {
  ReadBranchDocumentUseCase,
  WriteBranchDocumentUseCase,
  SearchDocumentsByTagsUseCase,
  UpdateTagIndexUseCase,
  GetRecentBranchesUseCase,
  ReadBranchCoreFilesUseCase,
  CreateBranchCoreFilesUseCase,
  ReadJsonDocumentUseCase,
  WriteJsonDocumentUseCase,
  DeleteJsonDocumentUseCase,
  SearchJsonDocumentsUseCase,
  UpdateJsonIndexUseCase,
} from "../../application/usecases/index.js";
import { DocumentType } from "../../domain/entities/JsonDocument.js";
import { ApplicationErrors } from "../../shared/errors/ApplicationError.js"; // Import ApplicationErrors
import { DomainErrors } from "../../shared/errors/DomainError.js"; // Import DomainErrors
// Removed unused InfrastructureError import
import { BaseError } from "../../shared/errors/BaseError.js"; // Import BaseError
import { logger } from "../../shared/utils/logger.js";
import type { MCPResponsePresenter } from "../presenters/MCPResponsePresenter.js";
import type { MCPResponse } from "../presenters/types/MCPResponse.js";
import type { IBranchController } from "./interfaces/IBranchController.js"; // Added .js extension

/**
 * Controller for branch memory bank operations
 * Handles incoming requests related to branch memory bank
 */
export class BranchController implements IBranchController {
  readonly _type = 'controller' as const;
  private readonly componentLogger = logger.withContext({ component: 'BranchController' }); // Add component logger

  // Optional dependencies
  private readonly updateTagIndexUseCaseV2?: UpdateTagIndexUseCaseV2;
  private readonly readJsonDocumentUseCase?: ReadJsonDocumentUseCase;
  private readonly writeJsonDocumentUseCase?: WriteJsonDocumentUseCase;
  private readonly deleteJsonDocumentUseCase?: DeleteJsonDocumentUseCase;
  private readonly searchJsonDocumentsUseCase?: SearchJsonDocumentsUseCase;
  private readonly updateJsonIndexUseCase?: UpdateJsonIndexUseCase;

  constructor(
    private readonly readBranchDocumentUseCase: ReadBranchDocumentUseCase,
    private readonly writeBranchDocumentUseCase: WriteBranchDocumentUseCase,
    private readonly searchDocumentsByTagsUseCase: SearchDocumentsByTagsUseCase,
    private readonly updateTagIndexUseCase: UpdateTagIndexUseCase,
    private readonly getRecentBranchesUseCase: GetRecentBranchesUseCase,
    private readonly readBranchCoreFilesUseCase: ReadBranchCoreFilesUseCase,
    private readonly createBranchCoreFilesUseCase: CreateBranchCoreFilesUseCase,
    private readonly presenter: MCPResponsePresenter,
    optionalDependencies?: {
      updateTagIndexUseCaseV2?: UpdateTagIndexUseCaseV2;
      readJsonDocumentUseCase?: ReadJsonDocumentUseCase;
      writeJsonDocumentUseCase?: WriteJsonDocumentUseCase;
      deleteJsonDocumentUseCase?: DeleteJsonDocumentUseCase;
      searchJsonDocumentsUseCase?: SearchJsonDocumentsUseCase;
      updateJsonIndexUseCase?: UpdateJsonIndexUseCase;
    }
  ) {
    this.updateTagIndexUseCaseV2 = optionalDependencies?.updateTagIndexUseCaseV2;
    this.readJsonDocumentUseCase = optionalDependencies?.readJsonDocumentUseCase;
    this.writeJsonDocumentUseCase = optionalDependencies?.writeJsonDocumentUseCase;
    this.deleteJsonDocumentUseCase = optionalDependencies?.deleteJsonDocumentUseCase;
    this.searchJsonDocumentsUseCase = optionalDependencies?.searchJsonDocumentsUseCase;
    this.updateJsonIndexUseCase = optionalDependencies?.updateJsonIndexUseCase;
  }

  /**
   * Read document from branch memory bank
   * @param branchName Branch name
   * @param path Document path
   * @returns Promise resolving to MCP response with document content
   */
  async readDocument(branchName: string, path: string): Promise<MCPResponse<DocumentDTO>> {
    try {
      this.componentLogger.info(`Reading document from branch ${branchName}: ${path}`); // Use componentLogger

      const result = await this.readBranchDocumentUseCase.execute({
        branchName,
        path,
      });

      return this.presenter.presentSuccess(result.document);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Write document to branch memory bank
   * @param params Parameters for writing the document
   * @returns Promise resolving to MCP response with the result
   */
  async writeDocument(params: {
    branchName: string;
    path: string;
    content: string;
    tags?: string[];
  }): Promise<MCPResponse> {
    try {
      this.componentLogger.info(`Writing document to branch ${params.branchName}: ${params.path}`);

      const result = await this.writeBranchDocumentUseCase.execute({
        branchName: params.branchName,
        document: {
          path: params.path,
          content: params.content,
          tags: params.tags || [],
        },
      });

      return this.presenter.presentSuccess(result); // Changed present to presentSuccess
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Find documents by tags in branch memory bank
   * @param params Parameters for finding documents by tags
   * @param params.branchName Branch name
   * @param params.tags Tags to search for
   * @param params.matchAllTags Whether to require all tags to match
   * @returns Promise resolving to MCP response with matching documents
   */
  async findDocumentsByTags(params: {
    branchName: string;
    tags: string[];
    matchAllTags?: boolean;
  }): Promise<MCPResponse<DocumentDTO[]>> {
    try {
      this.componentLogger.info(
        `Finding documents in branch ${params.branchName} with tags: ${params.tags.join(', ')}${
          params.matchAllTags ? ' (matching all)' : ''
        }`
      );

      const result = await this.searchDocumentsByTagsUseCase.execute({
        branchName: params.branchName,
        tags: params.tags,
        matchAllTags: params.matchAllTags
      });

      return this.presenter.presentSuccess(result.documents);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update tags index in branch memory bank
   * @param branchName Branch name
   * @param fullRebuild Whether to perform full rebuild of the index
   * @returns Promise resolving to MCP response with the result
   */
  async updateTagsIndex(branchName: string, fullRebuild?: boolean): Promise<MCPResponse> {
    try {
      this.componentLogger.info(`Updating tags index for branch ${branchName} (rebuild: ${fullRebuild ? 'yes' : 'no'})`);

      if (this.updateTagIndexUseCaseV2) {
        const result = await this.updateTagIndexUseCaseV2.execute({
          branchName,
          fullRebuild,
        });

        return this.presenter.presentSuccess(result);
      }

      const result = await this.updateTagIndexUseCase.execute({
        branchName,
        fullRebuild,
      });

      return this.presenter.presentSuccess(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get recent branches
   * @param limit Maximum number of branches to return
   * @returns Promise resolving to MCP response with list of recent branches
   */
  async getRecentBranches(limit?: number): Promise<MCPResponse<string[]>> {
    try {
      this.componentLogger.info(`Getting recent branches (limit: ${limit || 'none'})`);

      const result = await this.getRecentBranchesUseCase.execute({ limit });

      // Extract branch names from RecentBranchDTO[]
      const branchNames = result.branches.map(branch => branch.name);

      return this.presenter.presentSuccess(branchNames);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Read core files from branch memory bank
   * @param branchName Branch name
   * @returns Promise resolving to MCP response with core files content
   */
  async readCoreFiles(branchName: string): Promise<MCPResponse<Record<string, DocumentDTO>>> {
    try {
      this.componentLogger.info(`Reading core files from branch ${branchName}`);

      const result = await this.readBranchCoreFilesUseCase.execute({
        branchName
      });

      // Format files to match the expected DocumentDTO structure
      const formattedFiles: Record<string, DocumentDTO> = {};

      // Convert each core file to DocumentDTO format
      Object.entries(result.files || {}).forEach(([path, file]) => {
        formattedFiles[path] = {
          path,
          content: file.content,
          tags: ['core', 'branch-context'],
          lastModified: file.lastModified || new Date().toISOString()
        };
      });

      return this.presenter.presentSuccess(formattedFiles);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Write core files to branch memory bank
   * @param branchName Branch name
   * @param files Core files content
   * @returns Promise resolving to MCP response with the result
   */
  async writeCoreFiles(branchName: string, files: Record<string, any>): Promise<MCPResponse> {
    try {
      this.componentLogger.info(`Writing core files to branch ${branchName}`); // Use componentLogger

      // Validate input
      if (!files || typeof files !== 'object') {
        throw DomainErrors.validationError('Files must be provided as an object'); // Use factory method
      }

      // Prepare CoreFilesDTO from the input files (assuming they are already JSON objects or strings)
      const coreFiles: CoreFilesDTO = {};

      // Process activeContext.json (assuming input is already a JSON object)
      if (files['activeContext.json']) {
        // Directly assign the object, assuming CreateBranchCoreFilesUseCase expects an object
        coreFiles.activeContext = files['activeContext.json'];
      }

      // Process progress.json (assuming input is already a JSON object)
      if (files['progress.json']) {
        // Directly assign the object
        coreFiles.progress = files['progress.json'];
      }

      // Process systemPatterns.json (assuming input is already a JSON object)
      if (files['systemPatterns.json']) {
        // Directly assign the object
        coreFiles.systemPatterns = files['systemPatterns.json'];
      }

      const result = await this.createBranchCoreFilesUseCase.execute({
        branchName,
        files: coreFiles
      });

      return this.presenter.presentSuccess(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Read JSON document from branch memory bank
   * @param branchName Branch name
   * @param options Options for reading document (path or ID)
   * @returns Promise resolving to MCP response with JSON document
   */
  async readJsonDocument(
    branchName: string,
    options: { path?: string; id?: string }
  ): Promise<MCPResponse<JsonDocumentDTO>> {
    try {
      this.componentLogger.info(`Reading JSON document from branch ${branchName}: ${options.path || options.id}`); // Use componentLogger

      if (!this.readJsonDocumentUseCase) {
        throw DomainErrors.featureNotAvailable('readJsonDocument'); // Use factory method
      }

      const result = await this.readJsonDocumentUseCase.execute({
        branchName,
        path: options.path,
        id: options.id,
      });

      return this.presenter.presentSuccess(result.document); // Changed present to presentSuccess
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Write JSON document to branch memory bank
   * @param branchName Branch name
   * @param document Document data to write
   * @returns Promise resolving to MCP response with the result
   */
  async writeJsonDocument(branchName: string, document: JsonDocumentDTO): Promise<MCPResponse> {
    try {
      this.componentLogger.info(`Writing JSON document to branch ${branchName}: ${document.path || document.id}`); // Use componentLogger

      if (!this.writeJsonDocumentUseCase) {
        throw DomainErrors.featureNotAvailable('writeJsonDocument'); // Use factory method
      }

      const result = await this.writeJsonDocumentUseCase.execute({
        branchName,
        document: {
          id: document.id,
          path: document.path || '',
          title: document.title,
          documentType: document.documentType,
          content: document.content,
          tags: document.tags,
        },
      });

      return this.presenter.presentSuccess(result); // Changed present to presentSuccess
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete JSON document from branch memory bank
   * @param branchName Branch name
   * @param options Options for deleting document (path or ID)
   * @returns Promise resolving to MCP response with the result
   */
  async deleteJsonDocument(
    branchName: string,
    options: { path?: string; id?: string }
  ): Promise<MCPResponse> {
    try {
      this.componentLogger.info(`Deleting JSON document from branch ${branchName}: ${options.path || options.id}`); // Use componentLogger

      if (!this.deleteJsonDocumentUseCase) {
        throw DomainErrors.featureNotAvailable('deleteJsonDocument'); // Use factory method
      }

      const result = await this.deleteJsonDocumentUseCase.execute({
        branchName,
        path: options.path,
        id: options.id,
      });

      return this.presenter.presentSuccess(result); // Changed present to presentSuccess
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List JSON documents in branch memory bank
   * @param branchName Branch name
   * @param options Options for listing documents (type, tags)
   * @returns Promise resolving to MCP response with list of documents
   */
  async listJsonDocuments(
    branchName: string,
    options?: { type?: string; tags?: string[] }
  ): Promise<MCPResponse<JsonDocumentDTO[]>> {
    try {
      this.componentLogger.info(`Listing JSON documents in branch ${branchName}`); // Use componentLogger

      if (!this.searchJsonDocumentsUseCase) {
        throw DomainErrors.featureNotAvailable('listJsonDocuments'); // Use factory method
      }

      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName,
        documentType: options?.type as DocumentType,
        tags: options?.tags,
      });

      return this.presenter.presentSuccess(result.documents); // Changed present to presentSuccess
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Search JSON documents in branch memory bank
   * @param branchName Branch name
   * @param query Search query
   * @returns Promise resolving to MCP response with matching documents
   */
  async searchJsonDocuments(branchName: string, query: string): Promise<MCPResponse<JsonDocumentDTO[]>> {
    try {
      this.componentLogger.info(`Searching JSON documents in branch ${branchName} with query: ${query}`); // Use componentLogger

      if (!this.searchJsonDocumentsUseCase) {
        throw DomainErrors.featureNotAvailable('searchJsonDocuments'); // Use factory method
      }

      // Note: SearchJsonDocumentsUseCase doesn't support direct text queries
      // We need to modify the implementation to support text search
      // For now, just search by document type
      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName,
        documentType: '*' as DocumentType, // Use wildcard type to get all documents
      });

      return this.presenter.presentSuccess(result.documents); // Changed present to presentSuccess
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update JSON index in branch memory bank
   * @param branchName Branch name
   * @param options Options for updating index (force rebuild)
   * @returns Promise resolving to MCP response with the result
   */
  async updateJsonIndex(branchName: string, options?: { force?: boolean }): Promise<MCPResponse> {
    try {
      this.componentLogger.info(`Updating JSON index for branch ${branchName} (force: ${options?.force ? 'yes' : 'no'})`); // Use componentLogger

      if (!this.updateJsonIndexUseCase) {
        throw DomainErrors.featureNotAvailable('updateJsonIndex'); // Use factory method
      }

      const result = await this.updateJsonIndexUseCase.execute({
        branchName,
        fullRebuild: options?.force,
      });

      return this.presenter.presentSuccess(result); // Changed present to presentSuccess
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle errors in controller methods
   * @param error Error to handle
   * @returns Formatted error response
   */
  private handleError(error: any): MCPResponse {
    this.componentLogger.error('Error details:', { // Use componentLogger
      errorType: error.constructor.name,
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Check if it's a BaseError (covers Domain, App, Infra if they inherit)
    if (error instanceof BaseError) {
      return this.presenter.presentError(error);
    }

    // Handle unknown/native errors
    this.componentLogger.warn('Handling unknown error type', { errorName: error?.constructor?.name });
    return this.presenter.presentError(
      // Wrap unknown errors in a generic ApplicationError or similar
      ApplicationErrors.unexpectedControllerError( // Use factory method
        'BranchController',
        error instanceof Error ? error : undefined,
        { originalError: error, message: error instanceof Error ? error.message : 'An unexpected controller error occurred' }
      ) // Using ApplicationError for unexpected interface/controller level issues
    );
  }
}
