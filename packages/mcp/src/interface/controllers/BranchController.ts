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
import { ApplicationError } from "../../shared/errors/ApplicationError.js";
import { DomainError } from "../../shared/errors/DomainError.js";
import { InfrastructureError } from "../../shared/errors/InfrastructureError.js";
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
   * Read document from branch memory bank
   * @param branchName Branch name
   * @param path Document path
   * @returns Promise resolving to MCP response with document
   */
  async readDocument(branchName: string, path: string): Promise<MCPResponse<DocumentDTO>> {
    try {
      logger.info(`Reading document from branch ${branchName}: ${path}`);

      const result = await this.readBranchDocumentUseCase.execute({
        branchName,
        path
      });

      // 自動JSONパース処理の追加
      // jsonファイルかつcontent.textフィールドが存在する場合、JSONとしてパースを試みる
      const document = result.document;
      if (document && path.endsWith('.json') && document.content) {
        try {
          // 文字列をJSONとしてパース
          const jsonDoc = JSON.parse(document.content);

          // memory_document_v1またはmemory_document_v2スキーマを持つドキュメントで、
          // content.textフィールドがある場合は自動的にパースを試みる
          if (
            (jsonDoc.schema === 'memory_document_v1' || jsonDoc.schema === 'memory_document_v2') &&
            jsonDoc.content &&
            typeof jsonDoc.content === 'object' &&
            'text' in jsonDoc.content &&
            typeof jsonDoc.content.text === 'string'
          ) {
            logger.debug(`Attempting to auto-parse content.text field in JSON document: ${path}`);

            try {
              // content.textをJSONとしてパース
              const parsedText = JSON.parse(jsonDoc.content.text);
              // パースに成功したら、元のJSONオブジェクトのcontent.textをパース済みのオブジェクトに置き換え
              jsonDoc.content.text = parsedText;
              // 置き換えたJSONオブジェクトを文字列化して元のdocumentに設定
              document.content = JSON.stringify(jsonDoc, null, 2);
              logger.debug(`Successfully auto-parsed content.text in JSON document: ${path}`);
            } catch (parseError) {
              // パースに失敗した場合は元のまま（パースしない）
              logger.debug(`Failed to auto-parse content.text in JSON document ${path}, it's probably not a valid JSON string`);
            }
          }
        } catch (error) {
          // JSONとしてパースできなかった場合は何もしない
          logger.debug(`Document ${path} is not a valid JSON`);
        }
      }

      return this.presenter.present(document);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Write document to branch memory bank
   * @param branchName Branch name
   * @param path Document path
   * @param content Document content
   * @param tags Optional tags for the document
   * @returns Promise resolving to MCP response with the result
   */
  async writeDocument(
    branchName: string,
    path: string,
    content: string,
    tags?: string[]
  ): Promise<MCPResponse> {
    try {
      logger.info(`Writing document to branch ${branchName}: ${path}`);

      await this.writeBranchDocumentUseCase.execute({
        branchName,
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
   * Read core files from branch memory bank
   * @param branchName Branch name
   * @returns Promise resolving to MCP response with core files content
   */
  async readCoreFiles(branchName: string): Promise<MCPResponse<Record<string, DocumentDTO>>> {
    try {
      logger.info(`Reading core files from branch ${branchName}`);

      // Use the new ReadBranchCoreFilesUseCase
      const result = await this.readBranchCoreFilesUseCase.execute({
        branchName,
      });

      // Format response to maintain backward compatibility
      const formattedResult: Record<string, DocumentDTO> = {};

      // All core files are using .json format

      // Map results from ReadBranchCoreFilesUseCase to DocumentDTO format
      // Content should be the stringified JSON object from the use case result

      // If activeContext exists in the result
      if (result.files.activeContext) {
        const fileName = 'activeContext.json';
        formattedResult[fileName] = {
          path: fileName,
          // Stringify the JSON object received from the use case
          content: JSON.stringify(result.files.activeContext, null, 2),
          tags: ['core', 'active-context'],
          lastModified: new Date().toISOString(), // Consider using actual lastModified if available
        };
      }

      // If progress exists in the result
      if (result.files.progress) {
        const fileName = 'progress.json';
        formattedResult[fileName] = {
          path: fileName,
          // Stringify the JSON object received from the use case
          content: JSON.stringify(result.files.progress, null, 2),
          tags: ['core', 'progress'],
          lastModified: new Date().toISOString(), // Consider using actual lastModified if available
        };
      }

      // If systemPatterns exists in the result
      if (result.files.systemPatterns) {
        const fileName = 'systemPatterns.json';
        formattedResult[fileName] = {
          path: fileName,
          // Stringify the JSON object received from the use case
          content: JSON.stringify(result.files.systemPatterns, null, 2),
          tags: ['core', 'system-patterns'],
          lastModified: new Date().toISOString(), // Consider using actual lastModified if available
        };
      }

      // Read branchContext.json
      const branchFileName = 'branchContext.json';
      try {
        const branchContextResult = await this.readBranchDocumentUseCase.execute({
          branchName,
          path: branchFileName,
        });
        formattedResult[branchFileName] = branchContextResult.document;
      } catch (error) {
        // Log error if branchContext.json cannot be read, but don't throw.
        // The use case might handle creation or it might be optional depending on context.
        logger.warn(`Could not read ${branchFileName} for branch ${branchName}:`, error);
        // Optionally add a placeholder if needed by the caller, but often it's better to return only existing files.
        // formattedResult[branchFileName] = { path: branchFileName, content: '', tags: ['core', 'branch-context'], lastModified: new Date().toISOString() };
      }

      return this.presenter.present(formattedResult);
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
      logger.info(`Writing core files to branch ${branchName}`);

      // Validate input
      if (!files || typeof files !== 'object') {
        // Assuming DomainError constructor takes code as string
        throw new DomainError(
          'VALIDATION_ERROR',
          'Files must be provided as an object'
        );
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

      // Use the new CreateBranchCoreFilesUseCase
      let result: any;
      if (Object.keys(coreFiles).length > 0) {
        result = await this.createBranchCoreFilesUseCase.execute({
          branchName,
          files: coreFiles,
        });
      }

      return this.presenter.present(result || { success: true });
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

      const result = await this.getRecentBranchesUseCase.execute({
        limit: limit || 10, // Default limit if not specified
      });

      return this.presenter.present(result.branches);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Find documents by tags in branch memory bank
   * @param branchName Branch name
   * @param tags Tags to search for
   * @param matchAllTags Whether to require all tags to match
   * @returns Promise resolving to MCP response with matching documents
   */
  async findDocumentsByTags(
    branchName: string,
    tags: string[],
    matchAllTags?: boolean
  ): Promise<MCPResponse<DocumentDTO[]>> {
    try {
      logger.info(`Finding documents by tags in branch ${branchName}: ${tags.join(', ')}`);
      logger.debug('Search request:', { branchName, tags, matchAllTags });

      // Delegate to SearchDocumentsByTagsUseCase
      const result = await this.searchDocumentsByTagsUseCase.execute({
        branchName,
        tags,
        matchAllTags,
      });

      logger.debug('Search result:', {
        branchName,
        tags,
        matchAllTags,
        documentsFound: result.documents.length,
        searchInfo: result.searchInfo
      });

      return this.presenter.present(result.documents);
    } catch (error) {
      logger.error('Failed to search documents by tags:', {
        branchName,
        tags,
        matchAllTags,
        error: error instanceof Error ? error.message : String(error)
      });
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
      logger.info(`Updating tags index for branch ${branchName} (fullRebuild: ${fullRebuild ? 'yes' : 'no'})`);

      // Use V2 if available, otherwise fall back to V1
      if (this.updateTagIndexUseCaseV2) {
        logger.info('Using UpdateTagIndexUseCaseV2 for branch tag index update');
        const result = await this.updateTagIndexUseCaseV2.execute({
          branchName,
          fullRebuild: fullRebuild || false,
        });
        return this.presenter.present(result);
      } else {
        logger.info('Using UpdateTagIndexUseCase (V1) for branch tag index update');
        const result = await this.updateTagIndexUseCase.execute({
          branchName,
          fullRebuild: fullRebuild || false,
        });
        return this.presenter.present(result);
      }
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
      logger.info(`Reading JSON document from branch ${branchName}: ${options.path || options.id}`);

      if (!this.readJsonDocumentUseCase) {
        throw new DomainError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

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

      if (!this.writeJsonDocumentUseCase) {
        throw new DomainError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
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
      logger.info(`Deleting JSON document from branch ${branchName}: ${options.path || options.id}`);

      if (!this.deleteJsonDocumentUseCase) {
        throw new DomainError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
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
      logger.info(`Listing JSON documents in branch ${branchName}`);

      if (!this.searchJsonDocumentsUseCase) {
        throw new DomainError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

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
  async searchJsonDocuments(branchName: string, query: string): Promise<MCPResponse<JsonDocumentDTO[]>> {
    try {
      logger.info(`Searching JSON documents in branch ${branchName} with query: ${query}`);

      if (!this.searchJsonDocumentsUseCase) {
        throw new DomainError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      // Note: SearchJsonDocumentsUseCase doesn't support direct text queries
      // We need to modify the implementation to support text search
      // For now, just search by document type
      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName,
        documentType: '*' as DocumentType, // Use wildcard type to get all documents
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
      logger.info(`Updating JSON index for branch ${branchName} (force: ${options?.force ? 'yes' : 'no'})`);

      if (!this.updateJsonIndexUseCase) {
        throw new DomainError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.updateJsonIndexUseCase.execute({
        branchName,
        fullRebuild: options?.force,
      });

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Removed unused private methods:
  // - extractContent
  // - parseActiveContextContent
  // - parseProgressContent
  // - parseSystemPatternsContent
  // - generateActiveContextContent
  // - generateProgressContent
  // - generateSystemPatternsContent

  /**
   * Handle errors in controller methods
   * @param error Error to handle
   * @returns Formatted error response
   */
  private handleError(error: any): MCPResponse {
    logger.error('Error details:', {
      errorType: error.constructor.name,
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Remove BaseError check, assume DomainError covers ApplicationError and InfrastructureError if needed, or adjust based on actual hierarchy
    if (error instanceof DomainError || error instanceof ApplicationError || error instanceof InfrastructureError) {
      return this.presenter.presentError(error);
    }

    // Unknown error - Wrap in a standard error type if possible, e.g., ApplicationError or DomainError
    // Using DomainError as per previous context
    return this.presenter.presentError(
      new DomainError( // Assuming DomainError can represent unexpected errors
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        { originalError: error }
      )
    );
  }
}
