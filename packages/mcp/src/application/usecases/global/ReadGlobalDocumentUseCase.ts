import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import type { IGlobalMemoryBankRepository } from "../../../domain/repositories/IGlobalMemoryBankRepository.js";
import { ApplicationError, ApplicationErrorCodes } from "../../../shared/errors/ApplicationError.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import type { DocumentDTO } from "../../dtos/DocumentDTO.js";
import type { IUseCase } from "../../interfaces/IUseCase.js";


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
      if (!input.path) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Document path is required'
        );
      }

      const documentPath = DocumentPath.create(input.path);

      const document = await this.globalRepository.getDocument(documentPath);

      if (!document) {
        throw new DomainError(
          DomainErrorCodes.DOCUMENT_NOT_FOUND,
          `Document "${input.path}" not found in global memory bank`
        );
      }

      let parsedContent: string | object;
      try {
        // Attempt to parse the content as JSON
        parsedContent = JSON.parse(document.content);
      } catch (parseError) {
        // If parsing fails, keep the original string content
        parsedContent = document.content;
      }

      return {
        document: {
          path: document.path.value,
          content: parsedContent, // Return parsed object or original string
          tags: document.tags.map((tag) => tag.value),
          lastModified: document.lastModified.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // Pass the original error as the 'cause' for better error chaining
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to read document: ${(error as Error).message}`,
        undefined, // No additional details needed here
        { cause: error as Error } // Pass the original error as cause
      );
    }
  }
}
