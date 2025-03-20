import { IUseCase } from '../interfaces/IUseCase.js';
import { DocumentDTO } from '../dtos/DocumentDTO.js';
import { IBranchMemoryBankRepository } from '../../domain/repositories/IBranchMemoryBankRepository.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { BranchInfo } from '../../domain/entities/BranchInfo.js';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../shared/errors/ApplicationError.js';

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
  /**
   * Constructor
   * @param branchRepository Branch memory bank repository
   */
  constructor(private readonly branchRepository: IBranchMemoryBankRepository) { }

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: ReadBranchDocumentInput): Promise<ReadBranchDocumentOutput> {
    try {
      // Validate input
      if (!input.branchName) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Branch name is required');
      }

      if (!input.path) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Document path is required'
        );
      }

      // Create domain objects
      const branchInfo = BranchInfo.create(input.branchName);
      const documentPath = DocumentPath.create(input.path);

      // Check if branch exists
      const branchExists = await this.branchRepository.exists(input.branchName);

      if (!branchExists) {
        throw new DomainError(
          DomainErrorCodes.BRANCH_NOT_FOUND,
          `Branch "${input.branchName}" not found`
        );
      }

      // Get document from repository
      const document = await this.branchRepository.getDocument(branchInfo, documentPath);

      // Check if document exists
      if (!document) {
        throw new DomainError(
          DomainErrorCodes.DOCUMENT_NOT_FOUND,
          `Document "${input.path}" not found in branch "${input.branchName}"`
        );
      }

      // Transform to DTO
      return {
        document: {
          path: document.path.value,
          content: document.content,
          tags: document.tags.map((tag) => tag.value),
          lastModified: document.lastModified.toISOString(),
        },
      };
    } catch (error) {
      // Re-throw domain and application errors
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // Wrap other errors
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to read document: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
