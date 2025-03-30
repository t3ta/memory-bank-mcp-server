import type { DocumentDTO } from "../../application/dtos/DocumentDTO.js";
import type { JsonDocumentDTO } from "../../application/dtos/JsonDocumentDTO.js";
import type { UpdateTagIndexUseCaseV2 } from "../../application/usecases/common/UpdateTagIndexUseCaseV2.js";
import type { ReadJsonDocumentUseCase, WriteJsonDocumentUseCase, DeleteJsonDocumentUseCase, SearchJsonDocumentsUseCase, UpdateJsonIndexUseCase, ReadGlobalDocumentUseCase, WriteGlobalDocumentUseCase, SearchDocumentsByTagsUseCase, UpdateTagIndexUseCase } from "../../application/usecases/index.js";
import { DocumentType } from "../../domain/entities/JsonDocument.js";
import { BaseError } from "../../shared/errors/BaseError.js";
import { DomainError, DomainErrors } from "../../shared/errors/DomainError.js"; // Import DomainErrors factory
import { logger } from "../../shared/utils/logger.js";
import type { MCPResponsePresenter } from "../presenters/types/MCPResponsePresenter.js";
import type { MCPResponse } from "../presenters/types/MCPResponse.js";
import type { IGlobalController } from "./interfaces/IGlobalController.js";


/**
 * Controller for global memory bank operations
 * Handles incoming requests related to global memory bank
 */
export class GlobalController implements IGlobalController {
  readonly _type = 'controller' as const;
  private readonly componentLogger = logger.withContext({ component: 'GlobalController' }); // Add component logger

  /**
   * Constructor
   * @param readGlobalDocumentUseCase Use case for reading global documents
   * @param writeGlobalDocumentUseCase Use case for writing global documents
   * @param searchDocumentsByTagsUseCase Use case for searching documents by tags
   * @param updateTagIndexUseCase Use case for updating tag index
   * @param presenter Response presenter
   * @param options Optional dependencies like JSON document use cases and V2 tag index
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
      this.componentLogger.info(`Reading global document`, { path }); // Use componentLogger

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
  // パラメータをオブジェクトリテラル型に変更
  async writeDocument(params: {
    path: string;
    content: string;
    tags?: string[];
  }): Promise<MCPResponse> {
    const { path: docPath, content, tags: tagStrings } = params; // 分割代入、path と tags は内部変数と衝突するため別名に
    try {
      this.componentLogger.info(`Writing global document`, { docPath }); // Use componentLogger, path -> docPath に変更

      await this.writeGlobalDocumentUseCase.execute({
        document: {
          path: docPath, // path -> docPath に変更
          content,
          tags: tagStrings || [], // tags -> tagStrings に変更
        },
      });

      return this.presenter.present({ success: true });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Read core files from global memory bank
   * @returns Promise resolving to MCP response with core files
   */
  async readCoreFiles(): Promise<MCPResponse<Record<string, DocumentDTO>>> {
    try {
      this.componentLogger.info('Reading global core files'); // Use componentLogger

      // Define core files to read directly
      const coreFiles = [
        'architecture.json',
        'coding-standards.json',
        'domain-models.json',
        'glossary.json',
        'tech-stack.json',
        'user-guide.json',
      ];

      // Read each core file directly
      const result: Record<string, DocumentDTO> = {};

      for (const documentPath of coreFiles) {
        try {
          // Try to read the document from the global memory bank
          const docResult = await this.readGlobalDocumentUseCase.execute({ path: documentPath });

          if (docResult && docResult.document) {
            result[documentPath.replace('.json', '')] = docResult.document;
          } else {
            // Add empty placeholder for missing file
            result[documentPath.replace('.json', '')] = {
              path: documentPath,
              content: '',
              tags: ['global', 'core', documentPath.replace('.json', '')],
              lastModified: new Date().toISOString(),
            };
          }
        } catch (error) {
          // Log error but continue with other files
          this.componentLogger.error(`Error reading global core file`, { documentPath, error }); // Use componentLogger

          // Add empty placeholder for missing file
          result[documentPath.replace('.json', '')] = {
            path: documentPath,
            content: '',
            tags: ['global', 'core', documentPath.replace('.json', '')],
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
      this.componentLogger.info('Updating global tags index'); // Use componentLogger

      // Use V2 if available, otherwise fall back to V1
      if (this.updateTagIndexUseCaseV2) {
        this.componentLogger.info('Using UpdateTagIndexUseCaseV2 for global tag index update'); // Use componentLogger
        const result = await this.updateTagIndexUseCaseV2.execute({
          branchName: undefined, // Global memory bank
          fullRebuild: true,
        });
        return this.presenter.present(result);
      } else {
        this.componentLogger.info('Using UpdateTagIndexUseCase (V1) for global tag index update'); // Use componentLogger
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
      this.componentLogger.info(`Finding global documents by tags`, { tags: tags.join(', ') }); // Use componentLogger
      this.componentLogger.debug('Search request:', { tags, matchAllTags }); // Use componentLogger

      // SearchDocumentsByTagsUseCaseに検索を委譲
      const result = await this.searchDocumentsByTagsUseCase.execute({
        tags,
        matchAllTags,
        branchName: undefined, // Search in global memory bank
      });

      this.componentLogger.debug('Search result:', { // Use componentLogger
        tags,
        matchAllTags,
        documentsFound: result.documents.length,
        searchInfo: result.searchInfo
      });

      return this.presenter.present(result.documents);
    } catch (error) {
      this.componentLogger.error('Failed to search documents by tags:', { // Use componentLogger
        tags,
        matchAllTags,
        error: error instanceof Error ? error.message : String(error)
      });
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

    if (error instanceof BaseError || error instanceof DomainError) {
      return this.presenter.presentError(error);
    }

    // Unknown error - Use factory if available, otherwise keep constructor
    // Check if DomainErrors.unexpectedError exists
    if (DomainErrors.unexpectedError) {
       return this.presenter.presentError(
         DomainErrors.unexpectedError(
           error instanceof Error ? error.message : 'An unexpected error occurred',
           { originalError: error }
         )
       );
    } else {
       // Fallback to constructor if factory doesn't exist yet
       return this.presenter.presentError(
         new DomainError(
           'UNEXPECTED_ERROR',
           error instanceof Error ? error.message : 'An unexpected error occurred',
           { originalError: error }
         )
       );
    }
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
      this.componentLogger.info(`Reading global JSON document`, { path: options.path, id: options.id }); // Use componentLogger

      if (!this.readJsonDocumentUseCase) {
        // Use featureNotAvailable factory
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
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
      this.componentLogger.info(`Writing global JSON document`, { path: document.path }); // Use componentLogger

      if (!this.writeJsonDocumentUseCase) {
        // Use featureNotAvailable factory
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
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
      this.componentLogger.info(`Deleting global JSON document`, { path: options.path, id: options.id }); // Use componentLogger

      if (!this.deleteJsonDocumentUseCase) {
        // Use featureNotAvailable factory
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
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
      this.componentLogger.info('Listing global JSON documents', { type: options?.type, tags: options?.tags }); // Use componentLogger

      if (!this.searchJsonDocumentsUseCase) {
        // Use featureNotAvailable factory
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
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
      this.componentLogger.info(`Searching global JSON documents`, { query }); // Use componentLogger

      if (!this.searchJsonDocumentsUseCase) {
        // Use featureNotAvailable factory
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
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
      this.componentLogger.info(`Updating global JSON index`, { force: options?.force }); // Use componentLogger

      if (!this.updateJsonIndexUseCase) {
        // Use featureNotAvailable factory
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
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
