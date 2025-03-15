import { IGlobalController } from './interfaces/IGlobalController.js';
import { ReadGlobalDocumentUseCase } from '../../application/usecases/global/ReadGlobalDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '../../application/usecases/global/WriteGlobalDocumentUseCase.js';
import { MCPResponsePresenter } from '../presenters/MCPResponsePresenter.js';
import { MCPResponse } from '../presenters/types/index.js';
import { DocumentDTO } from '../../application/dtos/index.js';
import { Tag } from '../../domain/entities/Tag.js';
import { DomainError } from '../../shared/errors/DomainError.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Controller for global memory bank operations
 * Handles incoming requests related to global memory bank
 */
export class GlobalController implements IGlobalController {
  /**
   * Constructor
   * @param readGlobalDocumentUseCase Use case for reading global documents
   * @param writeGlobalDocumentUseCase Use case for writing global documents
   * @param presenter Response presenter
   */
  constructor(
    private readonly readGlobalDocumentUseCase: ReadGlobalDocumentUseCase,
    private readonly writeGlobalDocumentUseCase: WriteGlobalDocumentUseCase,
    private readonly presenter: MCPResponsePresenter
  ) {}

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
        path,
        content,
        tags: tags || []
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
        'user-guide.md'
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
            lastModified: new Date().toISOString()
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
      
      // Not implemented yet - should be a separate use case
      throw new ApplicationError(
        'NOT_IMPLEMENTED',
        'updateTagsIndex is not implemented yet'
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Find documents by tags in global memory bank
   * @param tags Tags to search for
   * @returns Promise resolving to MCP response with matching documents
   */
  async findDocumentsByTags(tags: string[]): Promise<MCPResponse<DocumentDTO[]>> {
    try {
      logger.info(`Finding global documents by tags: ${tags.join(', ')}`);
      
      // Not implemented yet - should be a separate use case
      throw new ApplicationError(
        'NOT_IMPLEMENTED',
        'findDocumentsByTags is not implemented yet'
      );
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
    if (error instanceof DomainError || 
        error instanceof ApplicationError || 
        error instanceof InfrastructureError) {
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
}
