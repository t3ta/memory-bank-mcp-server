import { IBranchController } from './interfaces/IBranchController.js';
import { ReadBranchDocumentUseCase } from '../../application/usecases/branch/ReadBranchDocumentUseCase.js';
import { WriteBranchDocumentUseCase } from '../../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { SearchDocumentsByTagsUseCase } from '../../application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { UpdateTagIndexUseCase } from '../../application/usecases/common/UpdateTagIndexUseCase.js';
import { GetRecentBranchesUseCase } from '../../application/usecases/common/GetRecentBranchesUseCase.js';
import { MCPResponsePresenter } from '../presenters/MCPResponsePresenter.js';
import { MCPResponse } from '../presenters/types/index.js';
import { DocumentDTO } from '../../application/dtos/index.js';
import { DomainError } from '../../shared/errors/DomainError.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Controller for branch memory bank operations
 * Handles incoming requests related to branch memory banks
 */
export class BranchController implements IBranchController {
  private readonly coreFiles = [
    'branchContext.md',
    'activeContext.md',
    'systemPatterns.md',
    'progress.md'
  ];

  /**
   * Constructor
   * @param readBranchDocumentUseCase Use case for reading branch documents
   * @param writeBranchDocumentUseCase Use case for writing branch documents
   * @param presenter Response presenter
   */
  constructor(
    private readonly readBranchDocumentUseCase: ReadBranchDocumentUseCase,
    private readonly writeBranchDocumentUseCase: WriteBranchDocumentUseCase,
    private readonly searchDocumentsByTagsUseCase: SearchDocumentsByTagsUseCase,
    private readonly updateTagIndexUseCase: UpdateTagIndexUseCase,
    private readonly getRecentBranchesUseCase: GetRecentBranchesUseCase,
    private readonly presenter: MCPResponsePresenter
  ) {}

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
  async writeDocument(branchName: string, path: string, content: string, tags?: string[]): Promise<MCPResponse> {
    try {
      logger.info(`Writing document to branch ${branchName}: ${path}`);
      
      await this.writeBranchDocumentUseCase.execute({
        branchName,
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
   * Read core files from branch memory bank
   * @param branchName Branch name
   * @returns Promise resolving to MCP response with core files content
   */
  async readCoreFiles(branchName: string): Promise<MCPResponse<Record<string, DocumentDTO>>> {
    try {
      logger.info(`Reading core files from branch ${branchName}`);
      
      // Read each core file
      const result: Record<string, DocumentDTO> = {};
      
      for (const filePath of this.coreFiles) {
        try {
          const response = await this.readBranchDocumentUseCase.execute({ 
            branchName, 
            path: filePath 
          });
          
          result[filePath] = response.document;
        } catch (error) {
          // Log error but continue with other files
          logger.error(`Error reading core file ${filePath} from branch ${branchName}:`, error);
          
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
        throw new DomainError(
          'INVALID_INPUT',
          'Files must be provided as an object'
        );
      }
      
      // Write each core file
      const promises: Promise<void>[] = [];
      
      for (const [fileName, fileContent] of Object.entries(files)) {
        if (this.coreFiles.includes(fileName)) {
          let content: string;
          
          // Handle different input formats
          if (typeof fileContent === 'string') {
            content = fileContent;
          } else if (fileContent && typeof fileContent === 'object' && 'content' in fileContent) {
            content = fileContent.content as string;
          } else {
            logger.warn(`Invalid content format for ${fileName}, skipping`);
            continue;
          }
          
          promises.push(
            this.writeBranchDocumentUseCase.execute({
              branchName,
              path: fileName,
              content,
              tags: [] // Core files have predefined tags, no need to set them here
            })
          );
        }
      }
      
      // Wait for all write operations to complete
      await Promise.all(promises);
      
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
      
      const result = await this.getRecentBranchesUseCase.execute({ limit });
      
      return this.presenter.present(result);
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
  async findDocumentsByTags(branchName: string, tags: string[], matchAllTags?: boolean): Promise<MCPResponse<DocumentDTO[]>> {
    try {
      logger.info(`Finding documents by tags in branch ${branchName}: ${tags.join(', ')}`);
      
      const result = await this.searchDocumentsByTagsUseCase.execute({
        branchName,
        tags,
        matchAllTags
      });
      
      return this.presenter.present(result.documents);
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
      logger.info(`Updating tags index for branch ${branchName} (fullRebuild: ${fullRebuild ? 'yes' : 'no'})`);
      
      const result = await this.updateTagIndexUseCase.execute({
        branchName,
        fullRebuild
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
