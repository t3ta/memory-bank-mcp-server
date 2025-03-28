import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { WriteDocumentDTO } from '../../dtos/WriteDocumentDTO.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../shared/errors/ApplicationError.js';

/**
 * Input data for write branch document use case
 */
export interface WriteBranchDocumentInput {
  /**
   * Branch name
   */
  branchName: string;

  /**
   * Document data
   */
  document: WriteDocumentDTO;
}

/**
 * Output data for write branch document use case
 */
export interface WriteBranchDocumentOutput {
  /**
   * Document data after write
   */
  document: DocumentDTO;
}

/**
 * Use case for writing a document to branch memory bank
 */
export class WriteBranchDocumentUseCase
  implements IUseCase<WriteBranchDocumentInput, WriteBranchDocumentOutput> {
  // Flag to disable Markdown writing
  private readonly disableMarkdownWrites: boolean;

  /**
   * Constructor
   * @param branchRepository Branch memory bank repository
   * @param options Options for the use case
   */
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository,
    options?: {
      /**
       * Whether to disable Markdown writes
       * @default false
       */
      disableMarkdownWrites?: boolean;
    }
  ) {
    this.disableMarkdownWrites = options?.disableMarkdownWrites ?? false;
  }

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteBranchDocumentInput): Promise<WriteBranchDocumentOutput> {
    try {
      // Validate input
      if (!input.branchName) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Branch name is required');
      }

      if (!input.document) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document is required');
      }

      if (!input.document.path) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Document path is required'
        );
      }

      if (input.document.content === undefined || input.document.content === null) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Document content is required'
        );
      }

      // Create domain objects
      const branchInfo = BranchInfo.create(input.branchName);
      const documentPath = DocumentPath.create(input.document.path);
      const tags = (input.document.tags ?? []).map((tag) => Tag.create(tag));

      // マークダウンサポートは廃止されたので、ここでの拡張子チェックは不要
      /*
      if (this.disableMarkdownWrites && documentPath.extension.toLowerCase() === 'md') {
        const jsonPath = documentPath.value.replace(/\.md$/, '.json');
        throw new ApplicationError(
          ApplicationErrorCodes.OPERATION_NOT_ALLOWED,
          `Writing to Markdown files is disabled. Please use JSON format instead: ${jsonPath}`
        );
      }
      */
      const existingDocument = await this.branchRepository.getDocument(branchInfo, documentPath);

      let document: MemoryDocument;

      if (existingDocument) {
        // Update existing document
        document = existingDocument.updateContent(input.document.content);

        // Update tags if provided
        if (input.document.tags) {
          document = document.updateTags(tags);
        }
      } else {
        // Create new document
        document = MemoryDocument.create({
          path: documentPath,
          content: input.document.content,
          tags,
          lastModified: new Date(),
        });
      }

      // Save document
      await this.branchRepository.saveDocument(branchInfo, document);

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
        `Failed to write document: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
