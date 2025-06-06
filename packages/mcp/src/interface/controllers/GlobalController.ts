import * as rfc6902 from 'rfc6902'; // ★ rfc6902 をインポート
import type { DocumentDTO } from "../../application/dtos/DocumentDTO.js";
import type { WriteDocumentDTO } from "../../application/dtos/WriteDocumentDTO.js"; // ★ WriteDocumentDTO をインポート
import { ApplicationError, ApplicationErrorCodes } from "../../shared/errors/ApplicationError.js"; // ★ ApplicationError と Codes をインポート
import type { JsonDocumentDTO } from "../../application/dtos/JsonDocumentDTO.js";
import type { UpdateTagIndexUseCaseV2 } from "../../application/usecases/common/UpdateTagIndexUseCaseV2.js";
import type { SearchDocumentsByTagsInput } from "../../application/usecases/common/SearchDocumentsByTagsUseCase.js";
type SearchResults = any; // Use any for now
import type { ReadJsonDocumentUseCase, WriteJsonDocumentUseCase, DeleteJsonDocumentUseCase, SearchJsonDocumentsUseCase, UpdateJsonIndexUseCase, ReadGlobalDocumentUseCase, WriteGlobalDocumentUseCase, SearchDocumentsByTagsUseCase, UpdateTagIndexUseCase } from "../../application/usecases/index.js";
import { DocumentType } from "../../domain/entities/JsonDocument.js";
import { BaseError } from "../../shared/errors/BaseError.js";
import { DomainError, DomainErrors } from "../../shared/errors/DomainError.js";
import { logger } from "../../shared/utils/logger.js";
import type { MCPResponsePresenter } from "../presenters/types/MCPResponsePresenter.js";
import type { MCPResponse } from "../presenters/types/MCPResponse.js";
import type { IGlobalController } from "./interfaces/IGlobalController.js";
import type { IConfigProvider } from "../../infrastructure/config/interfaces/IConfigProvider.js";
/**
 * Parameters for the writeDocument method in GlobalController
 */
interface WriteGlobalDocumentParams {
  path: string;
  content?: string | Record<string, unknown>; // Allow object
  patches?: rfc6902.Operation[];
  tags?: string[];
}



/**
 * Controller for global memory bank operations
 * Handles incoming requests related to global memory bank
 */
export class GlobalController implements IGlobalController {
  readonly _type = 'controller' as const;
  private readonly componentLogger = logger.withContext({ component: 'GlobalController' });

  /**
   * Constructor
   * @param readGlobalDocumentUseCase Use case for reading global documents
   * @param writeGlobalDocumentUseCase Use case for writing global documents
   * @param searchDocumentsByTagsUseCase Use case for searching documents by tags
   * @param updateTagIndexUseCase Use case for updating tag index
   * @param presenter Response presenter
   * @param options Optional dependencies like JSON document use cases and V2 tag index
   */
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
    private readonly configProvider: IConfigProvider,
    options?: {
      updateTagIndexUseCaseV2?: UpdateTagIndexUseCaseV2;
      readJsonDocumentUseCase?: ReadJsonDocumentUseCase;
      writeJsonDocumentUseCase?: WriteJsonDocumentUseCase;
      deleteJsonDocumentUseCase?: DeleteJsonDocumentUseCase;
      searchJsonDocumentsUseCase?: SearchJsonDocumentsUseCase;
      updateJsonIndexUseCase?: UpdateJsonIndexUseCase;
    }
  ) {
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
      this.componentLogger.info(`Reading global document`, { operation: 'readDocument', path });

      const result = await this.readGlobalDocumentUseCase.execute({ path });

      return this.presenter.presentSuccess(result.document); // Already correct, no change needed here
    } catch (error) {
      return this.handleError(error, 'readDocument');
    }
  }

  /**
   * Write document to global memory bank
   * @param path Document path
   * @param content Document content
   * @param tags Optional tags for the document
   * @returns Promise resolving to MCP response with the result
   */
  async writeDocument(params: WriteGlobalDocumentParams): Promise<MCPResponse> {
    const { path: docPath, content, patches, tags: tagStrings } = params; // patches を追加
    try {
      this.componentLogger.info(`Writing global document`, { operation: 'writeDocument', docPath, hasContent: !!content, hasPatches: !!patches }); // ログに情報追加

      // content と patches の排他チェック (ユースケースでもやるけど、コントローラーでもやるのが親切)
      const hasContent = content !== undefined && content !== null;
      const hasPatches = patches !== undefined && patches !== null;

      if (!hasContent && !hasPatches) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Either content or patches must be provided');
      }
      if (hasContent && hasPatches) {
         throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Cannot provide both content and patches');
      }

      // ユースケースに渡す document オブジェクトを構築
      // ユースケースに渡す document オブジェクトを構築
      // WriteDocumentDTO には content が必須だが、patches を使う場合は content は不要。
      // ユースケース側で patches を any キャストで受け取っているので、それに合わせる。
      let documentInput: WriteDocumentDTO | { path: string; tags?: string[]; patches: rfc6902.Operation[] };

      if (hasContent) {
        // content がある場合は WriteDocumentDTO 型
        documentInput = {
          path: docPath,
          content: content, // content は必須なので設定
          tags: tagStrings || [],
        };
      } else if (hasPatches) {
        // patches がある場合は、content を含まず patches を持つオブジェクトを作成
        // ユースケース側で any キャストされることを想定
        documentInput = {
          path: docPath,
          tags: tagStrings || [],
          patches: patches, // patches を設定
        };
      } else {
        // このケースは上のチェックで弾かれるはず
        throw new Error('Invalid state: No content or patches');
      }


      // Execute the use case and store the result
      const result = await this.writeGlobalDocumentUseCase.execute({
        // documentInput は WriteDocumentDTO | { ... patches ... } 型だが、
        // ユースケースの execute は WriteGlobalDocumentInput (document: WriteDocumentDTO) を期待している。
        // しかし、ユースケース内部で patches を any キャストで扱っているので、このまま渡す。
        // (より厳密にするならユースケースの型定義を見直すべきだが、既存実装に合わせる)
        document: documentInput as WriteDocumentDTO, // ユースケースの型定義に合わせるためのキャスト
      });

      // Pass the result from the use case to the presenter
      return this.presenter.presentSuccess(result);
    } catch (error) {
      return this.handleError(error, 'writeDocument');
    }
  }

  /**
   * Read core files from global memory bank
   * @returns Promise resolving to MCP response with core files
   */
  async readCoreFiles(): Promise<MCPResponse<Record<string, DocumentDTO>>> {
    try {
      this.componentLogger.info('Reading global core files', { operation: 'readCoreFiles' });

      const coreFiles = [
        'architecture.json',
        'coding-standards.json',
        'domain-models.json',
        'glossary.json',
        'tech-stack.json',
        'user-guide.json',
      ];

      const result: Record<string, DocumentDTO> = {};

      for (const documentPath of coreFiles) {
        try {
          const docResult = await this.readGlobalDocumentUseCase.execute({ path: documentPath });

          if (docResult && docResult.document) {
            result[documentPath.replace('.json', '')] = docResult.document;
          } else {
            result[documentPath.replace('.json', '')] = {
              path: documentPath,
              content: '',
              tags: ['global', 'core', documentPath.replace('.json', '')],
              lastModified: new Date().toISOString(),
            };
          }
        } catch (error) {
          this.componentLogger.error(`Error reading global core file`, { operation: 'readCoreFiles', documentPath, error });
          result[documentPath.replace('.json', '')] = {
            path: documentPath,
            content: '',
            tags: ['global', 'core', documentPath.replace('.json', '')],
            lastModified: new Date().toISOString(),
          };
        }
      }

      return this.presenter.presentSuccess(result); // Already correct, no change needed here
    } catch (error) {
      return this.handleError(error, 'readCoreFiles');
    }
  }

  /**
   * Update tags index in global memory bank
   * @returns Promise resolving to MCP response with the result
   */
  async updateTagsIndex(): Promise<MCPResponse> {
    try {
      this.componentLogger.info('Updating global tags index', { operation: 'updateTagsIndex' });

      if (this.updateTagIndexUseCaseV2) {
        this.componentLogger.info('Using UpdateTagIndexUseCaseV2 for global tag index update', { operation: 'updateTagsIndex' });
        const result = await this.updateTagIndexUseCaseV2.execute({
          branchName: undefined, // Global memory bank
          fullRebuild: true,
        });
        return this.presenter.presentSuccess(result); // Already correct, no change needed here
      } else {
        this.componentLogger.info('Using UpdateTagIndexUseCase (V1) for global tag index update', { operation: 'updateTagsIndex' });
        const result = await this.updateTagIndexUseCase.execute({
          branchName: undefined, // Global memory bank
          fullRebuild: true,
        });
        return this.presenter.presentSuccess(result); // Already correct, no change needed here
      }
    } catch (error) {
      return this.handleError(error, 'updateTagsIndex');
    }
  }

  // Remove the old findDocumentsByTags method

  /**
   * Search documents by tags in memory banks
   * @param input Search parameters (tags, match, scope, branch, docs)
   * @returns Promise resolving to MCP response with search results
   */
  async searchDocumentsByTags(input: SearchDocumentsByTagsInput): Promise<MCPResponse<SearchResults>> {
    try {
      this.componentLogger.info(`Searching documents by tags`, { operation: 'searchDocumentsByTags', input });

      // Ensure 'docs' path is provided, default scope to 'global' if not specified and branchName is absent
      const searchInput: SearchDocumentsByTagsInput = {
        ...input,
        scope: input.scope ?? (input.branchName ? 'all' : 'global'), // Default scope logic
        docs: this.configProvider.getConfig().docsRoot // Use injected configProvider
      };

      if (!searchInput.docs) {
        throw new Error("Docs path is missing in configuration or input.");
      }


      // Pass the correct input structure to the use case
      // Pass the correct input structure including docs path
      const result = await this.searchDocumentsByTagsUseCase.execute(searchInput);

      this.componentLogger.info(`Search completed`, { operation: 'searchDocumentsByTags', count: result.results.length });
      return this.presenter.presentSuccess(result);
    } catch (error) {
      return this.handleError(error, 'searchDocumentsByTags');
    }
  }

  /**
   * Handle errors in controller methods
   * @param error Error to handle
   * @returns Formatted error response
   */
  private handleError(error: any, operation?: string): MCPResponse {
    this.componentLogger.error('Error details:', {
      operation, // Add operation context
      errorType: error.constructor.name,
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof BaseError || error instanceof DomainError) {
      return this.presenter.presentError(error);
    }

    if (DomainErrors.unexpectedError) {
      return this.presenter.presentError(
        DomainErrors.unexpectedError(
          error instanceof Error ? error.message : 'An unexpected error occurred',
          { originalError: error }
        )
      );
    } else {
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
      this.componentLogger.info(`Reading global JSON document`, { operation: 'readJsonDocument', path: options.path, id: options.id });

      if (!this.readJsonDocumentUseCase) {
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
        );
      }

      const result = await this.readJsonDocumentUseCase.execute({
        branchName: undefined, // Global memory bank
        path: options.path,
        id: options.id,
      });

      return this.presenter.presentSuccess(result.document); // Already correct, no change needed here
    } catch (error) {
      return this.handleError(error, 'readJsonDocument');
    }
  }

  /**
   * Write JSON document to global memory bank
   * @param document Document data to write
   * @returns Promise resolving to MCP response with the result
   */
  async writeJsonDocument(document: JsonDocumentDTO): Promise<MCPResponse> {
    try {
      this.componentLogger.info(`Writing global JSON document`, { operation: 'writeJsonDocument', path: document.path });

      if (!this.writeJsonDocumentUseCase) {
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

      return this.presenter.presentSuccess(result); // Already correct, no change needed here
    } catch (error) {
      return this.handleError(error, 'writeJsonDocument');
    }
  }

  /**
   * Delete JSON document from global memory bank
   * @param options Options for deleting document (path or ID)
   * @returns Promise resolving to MCP response with the result
   */
  async deleteJsonDocument(options: { path?: string; id?: string }): Promise<MCPResponse> {
    try {
      this.componentLogger.info(`Deleting global JSON document`, { operation: 'deleteJsonDocument', path: options.path, id: options.id });

      if (!this.deleteJsonDocumentUseCase) {
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
        );
      }

      const result = await this.deleteJsonDocumentUseCase.execute({
        branchName: undefined, // Global memory bank
        path: options.path,
        id: options.id,
      });

      return this.presenter.presentSuccess(result); // Already correct, no change needed here
    } catch (error) {
      return this.handleError(error, 'deleteJsonDocument');
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
      this.componentLogger.info('Listing global JSON documents', { operation: 'listJsonDocuments', type: options?.type, tags: options?.tags });

      if (!this.searchJsonDocumentsUseCase) {
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
        );
      }

      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName: undefined, // Global memory bank
        documentType: options?.type as DocumentType,
        tags: options?.tags,
      });

      return this.presenter.presentSuccess(result.documents); // Already correct, no change needed here
    } catch (error) {
      return this.handleError(error, 'listJsonDocuments');
    }
  }

  /**
   * Search JSON documents in global memory bank
   * @param query Search query
   * @returns Promise resolving to MCP response with matching documents
   */
  async searchJsonDocuments(query: string): Promise<MCPResponse<JsonDocumentDTO[]>> {
    try {
      this.componentLogger.info(`Searching global JSON documents`, { operation: 'searchJsonDocuments', query });

      if (!this.searchJsonDocumentsUseCase) {
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
        );
      }

      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName: undefined, // Global memory bank
      });

      return this.presenter.presentSuccess(result.documents); // Already correct, no change needed here
    } catch (error) {
      return this.handleError(error, 'searchJsonDocuments');
    }
  }

  /**
   * Update JSON index in global memory bank
   * @param options Options for updating index (force rebuild)
   * @returns Promise resolving to MCP response with the result
   */
  async updateJsonIndex(options?: { force?: boolean }): Promise<MCPResponse> {
    try {
      this.componentLogger.info(`Updating global JSON index`, { operation: 'updateJsonIndex', force: options?.force });

      if (!this.updateJsonIndexUseCase) {
        throw DomainErrors.featureNotAvailable(
          'JSON document features'
        );
      }

      const result = await this.updateJsonIndexUseCase.execute({
        branchName: undefined, // Global memory bank
        fullRebuild: options?.force,
      });

      return this.presenter.presentSuccess(result); // Already correct, no change needed here
    } catch (error) {
      return this.handleError(error, 'updateJsonIndex');
    }
  }
}
