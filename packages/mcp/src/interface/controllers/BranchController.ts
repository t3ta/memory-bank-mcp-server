import type { DocumentDTO } from "../../application/dtos/DocumentDTO.js";
import type { JsonDocumentDTO } from "../../application/dtos/JsonDocumentDTO.js";
import type { UpdateTagIndexUseCaseV2 } from "../../application/usecases/common/UpdateTagIndexUseCaseV2.js";
import type {
  ReadBranchDocumentUseCase,
  WriteBranchDocumentUseCase,
  SearchDocumentsByTagsUseCase,
  UpdateTagIndexUseCase,
  GetRecentBranchesUseCase,
  ReadJsonDocumentUseCase,
  WriteJsonDocumentUseCase,
  DeleteJsonDocumentUseCase,
  SearchJsonDocumentsUseCase,
  UpdateJsonIndexUseCase,
} from "../../application/usecases/index.js";
import { DocumentType } from "../../domain/entities/JsonDocument.js";
import { BaseError } from "../../shared/errors/BaseError.js";
import { DomainError } from "../../shared/errors/DomainError.js";
import { logger } from "../../shared/utils/logger.js";
import type { MCPResponsePresenter } from "../presenters/types/MCPResponsePresenter.js";
import type { MCPResponse } from "../presenters/types/MCPResponse.js";
import type { IBranchController } from "./interfaces/IBranchController.js";

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

      return this.presenter.present(result.document);
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

      // Define core files to read
      const coreFilePaths = [
        'progress.json',
        'activeContext.json',
        'branchContext.json',
        'systemPattern.json',
      ];

      const result: Record<string, DocumentDTO> = {};

      // Read each core file
      for (const path of coreFilePaths) {
        try {
          const readResult = await this.readBranchDocumentUseCase.execute({
            branchName,
            path,
          });
          
          result[path] = readResult.document;
        } catch (error) {
          // Log error but continue with other files
          logger.error(`Error reading core file ${path} from branch ${branchName}:`, error);
          
          // Add empty placeholder for missing file
          result[path] = {
            path,
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
   * Write core files to branch memory bank
   * @param branchName Branch name
   * @param files Core files content
   * @returns Promise resolving to MCP response with the result
   */
  async writeCoreFiles(branchName: string, files: Record<string, any>): Promise<MCPResponse> {
    try {
      logger.info(`Writing core files to branch ${branchName}`);

      // Process each file in the record
      for (const [path, content] of Object.entries(files)) {
        await this.writeBranchDocumentUseCase.execute({
          branchName,
          document: {
            path,
            content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
            tags: ['core'],
          },
        });
      }

      return this.presenter.present({ success: true });
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

      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName,
        query,
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

    if (error instanceof BaseError || error instanceof DomainError) {
      return this.presenter.presentError(error);
    }

    // Unknown error
    return this.presenter.presentError(
      new DomainError(
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        { originalError: error }
      )
    );
  }
}
