import { IUseCase } from '../interfaces/IUseCase.js';
import { DocumentDTO } from '../dtos/DocumentDTO.js';
import { IGlobalMemoryBankRepository } from '../../domain/repositories/IGlobalMemoryBankRepository.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../shared/errors/ApplicationError.js';

/**
 * Input data for read global document use case
 */
export interface ReadGlobalDocumentInput {
  /**
   * Document path
   */
  path: string;
}

/**
 * Output data for read global document use case
 */
export interface ReadGlobalDocumentOutput {
  /**
   * Document data
   */
  document: DocumentDTO;
}

/**
 * Use case for reading a document from global memory bank
 */
export class ReadGlobalDocumentUseCase
  implements IUseCase<ReadGlobalDocumentInput, ReadGlobalDocumentOutput> {
  /**
   * Constructor
   * @param globalRepository Global memory bank repository
   */
  constructor(private readonly globalRepository: IGlobalMemoryBankRepository) { }

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: ReadGlobalDocumentInput): Promise<ReadGlobalDocumentOutput> {
    try {
      // Validate input
      if (!input.path) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Document path is required'
        );
      }

      // Create domain objects
      const documentPath = DocumentPath.create(input.path);

      // Get document from repository
      const document = await this.globalRepository.getDocument(documentPath);

      // Check if document exists
      if (!document) {
        throw new DomainError(
          DomainErrorCodes.DOCUMENT_NOT_FOUND,
          `Document "${input.path}" not found in global memory bank`
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
