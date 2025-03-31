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
import { logger } from '../../../shared/utils/logger.js'; // Import logger

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

  private readonly componentLogger = logger.withContext({ component: 'WriteBranchDocumentUseCase' }); // Add logger instance

  /**
   * Constructor
   * @param branchRepository Branch memory bank repository
   */
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository
  ) {
  }

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteBranchDocumentInput): Promise<WriteBranchDocumentOutput> {
    try {
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

      const branchInfo = BranchInfo.create(input.branchName);
      const documentPath = DocumentPath.create(input.document.path);
      const tags = (input.document.tags ?? []).map((tag) => Tag.create(tag));

      // Ensure branch exists before attempting to save document
      const branchExists = await this.branchRepository.exists(branchInfo.safeName);
      if (!branchExists) {
        this.componentLogger.info(`Branch ${branchInfo.safeName} does not exist. Initializing...`);
        try {
          await this.branchRepository.initialize(branchInfo);
          this.componentLogger.info(`Branch ${branchInfo.safeName} initialized successfully.`);
        } catch (initError) {
          this.componentLogger.error(`Failed to initialize branch ${branchInfo.safeName}`, { originalError: initError });
          // Rethrow or handle initialization error appropriately
          throw new ApplicationError(
            ApplicationErrorCodes.BRANCH_INITIALIZATION_FAILED,
            `Failed to initialize branch: ${(initError as Error).message}`,
            { originalError: initError }
          );
        }
      }

      const existingDocument = await this.branchRepository.getDocument(branchInfo, documentPath);

      let document: MemoryDocument;
      if (existingDocument) {
        document = existingDocument.updateContent(input.document.content);
        if (input.document.tags) {
          document = document.updateTags(tags);
        }
      } else {
        document = MemoryDocument.create({
          path: documentPath,
          content: input.document.content,
          tags,
          lastModified: new Date(),
        });
      }

      await this.branchRepository.saveDocument(branchInfo, document);

      return {
        document: {
          path: document.path.value,
          content: document.content,
          tags: document.tags.map((tag) => tag.value),
          lastModified: document.lastModified.toISOString(),
        },
      };
    } catch (error) {
      // If it's a known domain or application error, re-throw it directly
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }
      // For any other unexpected errors, re-throw them directly as well.
      this.componentLogger.error('Unexpected error in WriteBranchDocumentUseCase:', { error }); // Log unexpected errors
      throw error;
    }
  }
}
