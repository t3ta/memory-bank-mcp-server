import type { DocumentDTO } from "../../../application/dtos/DocumentDTO.js";
import type { JsonDocumentDTO } from "../../../application/dtos/JsonDocumentDTO.js";
import type { ReadJsonDocumentUseCase, WriteJsonDocumentUseCase, DeleteJsonDocumentUseCase, SearchJsonDocumentsUseCase, UpdateJsonIndexUseCase, GetRecentBranchesUseCase } from "../../../application/usecases/index.js";
import { DocumentType } from "../../../domain/entities/JsonDocument.js";
import { ApplicationError } from "../../../shared/errors/ApplicationError.js";
import { DomainError } from "../../../shared/errors/DomainError.js";
import { InfrastructureError } from "../../../shared/errors/InfrastructureError.js";
import { logger } from "../../../shared/utils/logger.js";
import type { IResponsePresenter } from "../../presenters/interfaces/IResponsePresenter.js";
import type { MCPResponse } from "../../presenters/types/MCPResponse.js";
import type { IBranchController } from "../interfaces/IBranchController.js";


/**
 * Controller for JSON branch memory bank operations
 * Dedicated controller for JSON document operations with branch memory banks
 */
export class JsonBranchController
  implements
  Pick<
    IBranchController,
    | 'readJsonDocument'
    | 'writeJsonDocument'
    | 'deleteJsonDocument'
    | 'listJsonDocuments'
    | 'searchJsonDocuments'
    | 'updateJsonIndex'
    | 'getRecentBranches'
  > {
  readonly _type = 'controller' as const;

  /**
   * Constructor
   * @param readJsonDocumentUseCase Use case for reading JSON documents
   * @param writeJsonDocumentUseCase Use case for writing JSON documents
   * @param deleteJsonDocumentUseCase Use case for deleting JSON documents
   * @param searchJsonDocumentsUseCase Use case for searching JSON documents
   * @param updateJsonIndexUseCase Use case for updating JSON index
   * @param getRecentBranchesUseCase Use case for getting recent branches
   * @param presenter Response presenter
   */
  constructor(
    private readonly readJsonDocumentUseCase: ReadJsonDocumentUseCase,
    private readonly writeJsonDocumentUseCase: WriteJsonDocumentUseCase,
    private readonly deleteJsonDocumentUseCase: DeleteJsonDocumentUseCase,
    private readonly searchJsonDocumentsUseCase: SearchJsonDocumentsUseCase,
    private readonly updateJsonIndexUseCase: UpdateJsonIndexUseCase,
    private readonly getRecentBranchesUseCase: GetRecentBranchesUseCase,
    private readonly presenter: IResponsePresenter
  ) { }

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
      logger.info(`Reading JSON document from branch ${branchName}: ${options.path || options.id}`);

      const result = await this.readJsonDocumentUseCase.execute({
        branchName,
        path: options.path,
        id: options.id,
      });

      return this.presenter.present(result.document);
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
      logger.info(`Writing JSON document to branch ${branchName}: ${document.path || document.id}`);

      // Validate required fields
      if (!document.title) {
        throw new ApplicationError('VALIDATION_ERROR', 'Document title is required');
      }

      if (!document.documentType) {
        throw new ApplicationError('VALIDATION_ERROR', 'Document type is required');
      }

      if (!document.content || Object.keys(document.content).length === 0) {
        throw new ApplicationError(
          'VALIDATION_ERROR',
          'Document content is required and cannot be empty'
        );
      }

      const result = await this.writeJsonDocumentUseCase.execute({
        branchName,
        document: {
          path: document.path || '',
          title: document.title,
          documentType: document.documentType as DocumentType,
          content: document.content,
          tags: document.tags || [],
        },
      });

      return this.presenter.present(result);
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
      logger.info(
        `Deleting JSON document from branch ${branchName}: ${options.path || options.id}`
      );

      // Validate that at least one option is provided
      if (!options.path && !options.id) {
        throw new ApplicationError(
          'VALIDATION_ERROR',
          'Either document path or ID must be provided'
        );
      }

      const result = await this.deleteJsonDocumentUseCase.execute({
        branchName,
        path: options.path,
        id: options.id,
      });

      return this.presenter.present(result);
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
      logger.info(
        `Listing JSON documents in branch ${branchName}${options?.type ? ` of type ${options.type}` : ''
        }${options?.tags ? ` with tags ${options.tags.join(', ')}` : ''}`
      );

      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName,
        documentType: options?.type as DocumentType,
        tags: options?.tags,
      });

      return this.presenter.present(result.documents);
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
  async searchJsonDocuments(
    branchName: string,
    query: string
  ): Promise<MCPResponse<JsonDocumentDTO[]>> {
    try {
      logger.info(`Searching JSON documents in branch ${branchName} with query: ${query}`);

      // For now, we just use tag-based search
      // In the future, this could be extended to support more complex queries
      const tags = query.split(/\s+/).filter((tag) => tag.trim() !== '');

      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName,
        tags: tags.length > 0 ? tags : undefined,
      });

      return this.presenter.present(result.documents);
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
      logger.info(
        `Updating JSON index for branch ${branchName} (force: ${options?.force ? 'yes' : 'no'})`
      );

      const result = await this.updateJsonIndexUseCase.execute({
        branchName,
        fullRebuild: options?.force,
      });

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get recent branches
   * @param limit Maximum number of branches to return
   * @returns Promise resolving to MCP response with recent branches
   */
  async getRecentBranches(limit?: number): Promise<MCPResponse> {
    try {
      logger.info(`Getting recent branches (limit: ${limit || 'default'})`);

      const result = await this.getRecentBranchesUseCase.execute({ limit });

      return this.presenter.present(result);
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
    if (
      error instanceof DomainError ||
      error instanceof ApplicationError ||
      error instanceof InfrastructureError
    ) {
      return this.presenter.presentError(error);
    }

    // Unknown error
    return this.presenter.presentError(
      new ApplicationError(
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        { originalError: error }
      )
    );
  }

  // These methods are not implemented in this controller, as they are specific to Markdown documents
  // They would be implemented in the original BranchController
  readDocument(): Promise<MCPResponse<DocumentDTO>> {
    throw new ApplicationError(
      'NOT_IMPLEMENTED',
      'This method is not implemented in JsonBranchController'
    );
  }

  writeDocument(): Promise<MCPResponse> {
    throw new ApplicationError(
      'NOT_IMPLEMENTED',
      'This method is not implemented in JsonBranchController'
    );
  }

  readCoreFiles(): Promise<MCPResponse<Record<string, DocumentDTO>>> {
    throw new ApplicationError(
      'NOT_IMPLEMENTED',
      'This method is not implemented in JsonBranchController'
    );
  }

  writeCoreFiles(): Promise<MCPResponse> {
    throw new ApplicationError(
      'NOT_IMPLEMENTED',
      'This method is not implemented in JsonBranchController'
    );
  }

  findDocumentsByTags(): Promise<MCPResponse<DocumentDTO[]>> {
    throw new ApplicationError(
      'NOT_IMPLEMENTED',
      'This method is not implemented in JsonBranchController'
    );
  }

  updateTagsIndex(): Promise<MCPResponse> {
    throw new ApplicationError(
      'NOT_IMPLEMENTED',
      'This method is not implemented in JsonBranchController'
    );
  }
}
