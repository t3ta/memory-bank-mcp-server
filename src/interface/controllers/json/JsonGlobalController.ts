import { IGlobalController } from '../interfaces/IGlobalController';
import { DocumentType } from '../../../domain/entities/JsonDocument';
import { MCPResponse } from '../../presenters/types/index';
import { DocumentDTO, JsonDocumentDTO } from '../../../application/dtos/index';
import { DomainError } from '../../../shared/errors/DomainError';
import { ApplicationError } from '../../../shared/errors/ApplicationError';
import { InfrastructureError } from '../../../shared/errors/InfrastructureError';
import { IResponsePresenter } from '../../presenters/interfaces/IResponsePresenter';
import { logger } from '../../../shared/utils/logger';

// Import use cases
import { ReadJsonDocumentUseCase } from '../../../application/usecases/json/ReadJsonDocumentUseCase';
import { WriteJsonDocumentUseCase } from '../../../application/usecases/json/WriteJsonDocumentUseCase';
import { DeleteJsonDocumentUseCase } from '../../../application/usecases/json/DeleteJsonDocumentUseCase';
import { SearchJsonDocumentsUseCase } from '../../../application/usecases/json/SearchJsonDocumentsUseCase';
import { UpdateJsonIndexUseCase } from '../../../application/usecases/json/UpdateJsonIndexUseCase';

/**
 * Controller for JSON global memory bank operations
 * Dedicated controller for JSON document operations with global memory bank
 */
export class JsonGlobalController
  implements
    Pick<
      IGlobalController,
      | 'readJsonDocument'
      | 'writeJsonDocument'
      | 'deleteJsonDocument'
      | 'listJsonDocuments'
      | 'searchJsonDocuments'
      | 'updateJsonIndex'
    >
{
  readonly _type = 'controller' as const;

  /**
   * Constructor
   * @param readJsonDocumentUseCase Use case for reading JSON documents
   * @param writeJsonDocumentUseCase Use case for writing JSON documents
   * @param deleteJsonDocumentUseCase Use case for deleting JSON documents
   * @param searchJsonDocumentsUseCase Use case for searching JSON documents
   * @param updateJsonIndexUseCase Use case for updating JSON index
   * @param presenter Response presenter
   */
  constructor(
    private readonly readJsonDocumentUseCase: ReadJsonDocumentUseCase,
    private readonly writeJsonDocumentUseCase: WriteJsonDocumentUseCase,
    private readonly deleteJsonDocumentUseCase: DeleteJsonDocumentUseCase,
    private readonly searchJsonDocumentsUseCase: SearchJsonDocumentsUseCase,
    private readonly updateJsonIndexUseCase: UpdateJsonIndexUseCase,
    private readonly presenter: IResponsePresenter
  ) {}

  /**
   * Read JSON document from global memory bank
   * @param options Options for reading document (path or ID)
   * @returns Promise resolving to MCP response with JSON document
   */
  async readJsonDocument(options: {
    path?: string;
    id?: string;
  }): Promise<MCPResponse<JsonDocumentDTO>> {
    try {
      logger.info(`Reading JSON document from global memory bank: ${options.path || options.id}`);

      const result = await this.readJsonDocumentUseCase.execute({
        path: options.path,
        id: options.id,
      });

      return this.presenter.present(result.document);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Write JSON document to global memory bank
   * @param document Document data to write
   * @returns Promise resolving to MCP response with the result
   */
  async writeJsonDocument(document: JsonDocumentDTO): Promise<MCPResponse> {
    try {
      logger.info(`Writing JSON document to global memory bank: ${document.path || document.id}`);

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
   * Delete JSON document from global memory bank
   * @param options Options for deleting document (path or ID)
   * @returns Promise resolving to MCP response with the result
   */
  async deleteJsonDocument(options: { path?: string; id?: string }): Promise<MCPResponse> {
    try {
      logger.info(`Deleting JSON document from global memory bank: ${options.path || options.id}`);

      // Validate that at least one option is provided
      if (!options.path && !options.id) {
        throw new ApplicationError(
          'VALIDATION_ERROR',
          'Either document path or ID must be provided'
        );
      }

      const result = await this.deleteJsonDocumentUseCase.execute({
        path: options.path,
        id: options.id,
      });

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List JSON documents in global memory bank
   * @param options Options for listing documents (type, tags)
   * @returns Promise resolving to MCP response with list of documents
   */
  async listJsonDocuments(options?: {
    type?: string;
    tags?: string[];
  }): Promise<MCPResponse<JsonDocumentDTO[]>> {
    try {
      logger.info(
        `Listing JSON documents in global memory bank${
          options?.type ? ` of type ${options.type}` : ''
        }${options?.tags ? ` with tags ${options.tags.join(', ')}` : ''}`
      );

      const result = await this.searchJsonDocumentsUseCase.execute({
        documentType: options?.type as DocumentType,
        tags: options?.tags,
      });

      return this.presenter.present(result.documents);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Search JSON documents in global memory bank
   * @param query Search query
   * @returns Promise resolving to MCP response with matching documents
   */
  async searchJsonDocuments(query: string): Promise<MCPResponse<JsonDocumentDTO[]>> {
    try {
      logger.info(`Searching JSON documents in global memory bank with query: ${query}`);

      // For now, we just use tag-based search
      // In the future, this could be extended to support more complex queries
      const tags = query.split(/\s+/).filter((tag) => tag.trim() !== '');

      const result = await this.searchJsonDocumentsUseCase.execute({
        tags: tags.length > 0 ? tags : undefined,
      });

      return this.presenter.present(result.documents);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update JSON index in global memory bank
   * @param options Options for updating index (force rebuild)
   * @returns Promise resolving to MCP response with the result
   */
  async updateJsonIndex(options?: { force?: boolean }): Promise<MCPResponse> {
    try {
      logger.info(
        `Updating JSON index for global memory bank (force: ${options?.force ? 'yes' : 'no'})`
      );

      const result = await this.updateJsonIndexUseCase.execute({
        fullRebuild: options?.force,
      });

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
  // They would be implemented in the original GlobalController

  readDocument(): Promise<MCPResponse<DocumentDTO>> {
    throw new ApplicationError(
      'NOT_IMPLEMENTED',
      'This method is not implemented in JsonGlobalController'
    );
  }

  writeDocument(): Promise<MCPResponse> {
    throw new ApplicationError(
      'NOT_IMPLEMENTED',
      'This method is not implemented in JsonGlobalController'
    );
  }

  findDocumentsByTags(): Promise<MCPResponse<DocumentDTO[]>> {
    throw new ApplicationError(
      'NOT_IMPLEMENTED',
      'This method is not implemented in JsonGlobalController'
    );
  }

  updateTagsIndex(): Promise<MCPResponse> {
    throw new ApplicationError(
      'NOT_IMPLEMENTED',
      'This method is not implemented in JsonGlobalController'
    );
  }
}
