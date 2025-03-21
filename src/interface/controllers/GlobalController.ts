import type { DocumentDTO } from "../../application/dtos/DocumentDTO.js";
import type { JsonDocumentDTO } from "../../application/dtos/JsonDocumentDTO.js";
import type { UpdateTagIndexUseCaseV2 } from "../../application/usecases/common/UpdateTagIndexUseCaseV2.js";
import type { ReadJsonDocumentUseCase, WriteJsonDocumentUseCase, DeleteJsonDocumentUseCase, SearchJsonDocumentsUseCase, UpdateJsonIndexUseCase, ReadGlobalDocumentUseCase, WriteGlobalDocumentUseCase, SearchDocumentsByTagsUseCase, UpdateTagIndexUseCase } from "../../application/usecases/index.js";
import { DocumentType } from "../../domain/entities/JsonDocument.js";
import { ApplicationError } from "../../shared/errors/ApplicationError.js";
import { DomainError } from "../../shared/errors/DomainError.js";
import { InfrastructureError } from "../../shared/errors/InfrastructureError.js";
import { logger } from "../../shared/utils/logger.js";
import type { MCPResponsePresenter } from "../presenters/MCPResponsePresenter.js";
import type { MCPResponse } from "../presenters/types/MCPResponse.js";
import type { IGlobalController } from "./interfaces/IGlobalController.js";


/**
 * Controller for global memory bank operations
 * Handles incoming requests related to global memory bank
 */
export class GlobalController implements IGlobalController {
  readonly _type = 'controller' as const;
  /**
   * Constructor
   * @param readGlobalDocumentUseCase Use case for reading global documents
   * @param writeGlobalDocumentUseCase Use case for writing global documents
   * @param presenter Response presenter
   */
  // Optional dependencies
  private readonly updateTagIndexUseCaseV2?: UpdateTagIndexUseCaseV2;
  private readonly readJsonDocumentUseCase?: ReadJsonDocumentUseCase;
  private readonly writeJsonDocumentUseCase?: WriteJsonDocumentUseCase;
  private readonly deleteJsonDocumentUseCase?: DeleteJsonDocumentUseCase;
  private readonly searchJsonDocumentsUseCase?: SearchJsonDocumentsUseCase;
  private readonly updateJsonIndexUseCase?: UpdateJsonIndexUseCase;

  constructor(
    private readonly readGlobalDocumentUseCase: ReadGlobalDocumentUseCase,
    private readonly writeGlobalDocumentUseCase: WriteGlobalDocumentUseCase,
    private readonly searchDocumentsByTagsUseCase: SearchDocumentsByTagsUseCase,
    private readonly updateTagIndexUseCase: UpdateTagIndexUseCase,
    private readonly presenter: MCPResponsePresenter,
    options?: {
      updateTagIndexUseCaseV2?: UpdateTagIndexUseCaseV2;
      readJsonDocumentUseCase?: ReadJsonDocumentUseCase;
      writeJsonDocumentUseCase?: WriteJsonDocumentUseCase;
      deleteJsonDocumentUseCase?: DeleteJsonDocumentUseCase;
      searchJsonDocumentsUseCase?: SearchJsonDocumentsUseCase;
      updateJsonIndexUseCase?: UpdateJsonIndexUseCase;
    }
  ) {
    // Set optional dependencies
    this.updateTagIndexUseCaseV2 = options?.updateTagIndexUseCaseV2;
    this.readJsonDocumentUseCase = options?.readJsonDocumentUseCase;
    this.writeJsonDocumentUseCase = options?.writeJsonDocumentUseCase;
    this.deleteJsonDocumentUseCase = options?.deleteJsonDocumentUseCase;
    this.searchJsonDocumentsUseCase = options?.searchJsonDocumentsUseCase;
    this.updateJsonIndexUseCase = options?.updateJsonIndexUseCase;
  }

  /**
   * Read document from global memory bank
   * @param path Document path
   * @returns Promise resolving to MCP response with document
   */
  async readDocument(path: string): Promise<MCPResponse<DocumentDTO>> {
    try {
      logger.info(`Reading global document: ${path}`);

      const result = await this.readGlobalDocumentUseCase.execute({ path });

      return this.presenter.present(result.document);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Write document to global memory bank
   * @param path Document path
   * @param content Document content
   * @param tags Optional tags for the document
   * @returns Promise resolving to MCP response with the result
   */
  async writeDocument(path: string, content: string, tags?: string[]): Promise<MCPResponse> {
    try {
      logger.info(`Writing global document: ${path}`);

      await this.writeGlobalDocumentUseCase.execute({
        document: {
          path,
          content,
          tags: tags || [],
        },
      });

      return this.presenter.present({ success: true });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Read core files from global memory bank
   * @returns Promise resolving to MCP response with core files content
   */
  async readCoreFiles(): Promise<MCPResponse<Record<string, DocumentDTO>>> {
    try {
      logger.info('Reading global core files');

      // Define core files to read
      const coreFiles = [
        'architecture.md',
        'coding-standards.md',
        'domain-models.md',
        'glossary.md',
        'tech-stack.md',
        'user-guide.md',
      ];

      // Read each core file
      const result: Record<string, DocumentDTO> = {};

      for (const filePath of coreFiles) {
        try {
          const response = await this.readGlobalDocumentUseCase.execute({ path: filePath });
          result[filePath] = response.document;
        } catch (error) {
          // Log error but continue with other files
          logger.error(`Error reading global core file ${filePath}:`, error);

          // Add empty placeholder for missing file
          result[filePath] = {
            path: filePath,
            content: '',
            tags: [],
            lastModified: new Date().toISOString(),
          };
        }
      }

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update tags index in global memory bank
   * @returns Promise resolving to MCP response with the result
   */
  async updateTagsIndex(): Promise<MCPResponse> {
    try {
      logger.info('Updating global tags index');

      // Use V2 if available, otherwise fall back to V1
      if (this.updateTagIndexUseCaseV2) {
        logger.info('Using UpdateTagIndexUseCaseV2 for global tag index update');
        const result = await this.updateTagIndexUseCaseV2.execute({
          branchName: undefined, // Global memory bank
          fullRebuild: true,
        });
        return this.presenter.present(result);
      } else {
        logger.info('Using UpdateTagIndexUseCase (V1) for global tag index update');
        const result = await this.updateTagIndexUseCase.execute({
          branchName: undefined, // Global memory bank
          fullRebuild: true,
        });
        return this.presenter.present(result);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Find documents by tags in global memory bank
   * @param tags Tags to search for
   * @param matchAllTags Whether to require all tags to match
   * @returns Promise resolving to MCP response with matching documents
   */
  async findDocumentsByTags(
    tags: string[],
    matchAllTags?: boolean
  ): Promise<MCPResponse<DocumentDTO[]>> {
    try {
      logger.info(`Finding global documents by tags: ${tags.join(', ')}`);

      const result = await this.searchDocumentsByTagsUseCase.execute({
        tags,
        matchAllTags,
        branchName: undefined, // Search in global memory bank
      });

      return this.presenter.present(result.documents);
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
      logger.info(`Reading global JSON document: ${options.path || options.id}`);

      if (!this.readJsonDocumentUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.readJsonDocumentUseCase.execute({
        branchName: undefined, // Global memory bank
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
      logger.info(`Writing global JSON document: ${document.path}`);

      if (!this.writeJsonDocumentUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.writeJsonDocumentUseCase.execute({
        branchName: undefined, // Global memory bank
        document: {
          path: document.path || '',
          title: document.title,
          documentType: document.documentType,
          content: document.content,
          tags: document.tags,
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
      logger.info(`Deleting global JSON document: ${options.path || options.id}`);

      if (!this.deleteJsonDocumentUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.deleteJsonDocumentUseCase.execute({
        branchName: undefined, // Global memory bank
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
      logger.info('Listing global JSON documents');

      if (!this.searchJsonDocumentsUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName: undefined, // Global memory bank
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
      logger.info(`Searching global JSON documents with query: ${query}`);

      if (!this.searchJsonDocumentsUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName: undefined, // Global memory bank
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
      logger.info(`Updating global JSON index (force: ${options?.force ? 'yes' : 'no'})`);

      if (!this.updateJsonIndexUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.updateJsonIndexUseCase.execute({
        branchName: undefined, // Global memory bank
        fullRebuild: options?.force,
      });

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
