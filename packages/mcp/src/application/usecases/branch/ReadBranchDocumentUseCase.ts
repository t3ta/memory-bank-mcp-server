import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DomainErrors } from '../../../shared/errors/DomainError.js';
import { ApplicationErrors, ErrorUtils } from '../../../shared/errors/index.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Input data for read branch document use case
 */
export interface ReadBranchDocumentInput {
  /**
   * Branch name
   */
  branchName: string;

  /**
   * Document path
   */
  path: string;
}

/**
 * Output data for read branch document use case
 */
export interface ReadBranchDocumentOutput {
  /**
   * Document data
   */
  document: DocumentDTO;
}

/**
 * Use case for reading a document from branch memory bank
 */
export class ReadBranchDocumentUseCase
  implements IUseCase<ReadBranchDocumentInput, ReadBranchDocumentOutput> {
  // Create component-specific logger
  private readonly useCaseLogger = logger.withContext({ 
    component: 'ReadBranchDocumentUseCase' 
  });

  /**
   * Constructor
   * @param branchRepository Branch memory bank repository
   */
  constructor(private readonly branchRepository: IBranchMemoryBankRepository) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: ReadBranchDocumentInput): Promise<ReadBranchDocumentOutput> {
    // Log the execution with structured context
    this.useCaseLogger.info('Executing read branch document use case', { 
      branchName: input.branchName,
      documentPath: input.path 
    });

    // Validate input
    if (!input.branchName) {
      throw ApplicationErrors.invalidInput('Branch name is required');
    }

    if (!input.path) {
      throw ApplicationErrors.invalidInput('Document path is required');
    }

    return await ErrorUtils.wrapAsync(
      this.executeInternal(input),
      (error) => ApplicationErrors.executionFailed(
        'ReadBranchDocumentUseCase',
        error instanceof Error ? error : undefined,
        { input }
      )
    );
  }

  /**
   * Internal execution logic wrapped with error handling
   */
  private async executeInternal(input: ReadBranchDocumentInput): Promise<ReadBranchDocumentOutput> {
    // Create domain objects
    const branchInfo = BranchInfo.create(input.branchName);
    const documentPath = DocumentPath.create(input.path);

    // Check if branch exists
    const branchExists = await this.branchRepository.exists(input.branchName);

    if (!branchExists) {
      this.useCaseLogger.warn('Branch not found', { branchName: input.branchName });
      throw DomainErrors.branchNotFound(input.branchName);
    }

    // Get document from repository
    const document = await this.branchRepository.getDocument(branchInfo, documentPath);

    // Check if document exists
    if (!document) {
      this.useCaseLogger.warn('Document not found', { 
        branchName: input.branchName,
        documentPath: input.path 
      });
      throw DomainErrors.documentNotFound(input.path, { branchName: input.branchName });
    }

    this.useCaseLogger.debug('Document retrieved successfully', {
      documentPath: input.path,
      documentType: document.type
    });

    // Transform to DTO
    return {
      document: {
        path: document.path.value,
        content: document.content,
        tags: document.tags.map((tag) => tag.value),
        lastModified: document.lastModified.toISOString(),
      },
    };
  }
}
