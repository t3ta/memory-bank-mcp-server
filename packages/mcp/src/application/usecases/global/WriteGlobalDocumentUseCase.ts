import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import { Tag } from "../../../domain/entities/Tag.js";
import type { IGlobalMemoryBankRepository } from "../../../domain/repositories/IGlobalMemoryBankRepository.js";
import { ApplicationError, ApplicationErrorCodes } from "../../../shared/errors/ApplicationError.js";
import { DomainError } from "../../../shared/errors/DomainError.js";
import { logger } from "../../../shared/utils/logger.js";
import type { DocumentDTO } from "../../dtos/DocumentDTO.js";
import type { WriteDocumentDTO } from "../../dtos/WriteDocumentDTO.js";
import type { IUseCase } from "../../interfaces/IUseCase.js";


/**
 * Input data for write global document use case
 */
export interface WriteGlobalDocumentInput {
  /**
   * Document data
   */
  document: WriteDocumentDTO;
}

/**
 * Output data for write global document use case
 */
export interface WriteGlobalDocumentOutput {
  /**
   * Document data after write
   */
  document: DocumentDTO;
}

/**
 * Use case for writing a document to global memory bank
 */
export class WriteGlobalDocumentUseCase
  implements IUseCase<WriteGlobalDocumentInput, WriteGlobalDocumentOutput> {

  /**
   * Constructor
   * @param globalRepository Global memory bank repository
   */
  constructor(
    private readonly globalRepository: IGlobalMemoryBankRepository
  ) {
  }

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteGlobalDocumentInput): Promise<WriteGlobalDocumentOutput> {
    try {
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

      const documentPath = DocumentPath.create(input.document.path);

      let tags: Tag[] = [];
      if (documentPath.value.endsWith('.json')) {
        try {
          const parsed = JSON.parse(input.document.content);
          if (parsed.metadata?.tags) {
            logger.debug('Found tags in metadata:', { tags: parsed.metadata.tags });
            tags = parsed.metadata.tags.map((tag: string) => {
              logger.debug('Creating tag:', { tag });
              return Tag.create(tag);
            });
          }
        } catch (error) {
          logger.error('Failed to parse document content as JSON:', { error, path: documentPath.value });
        }
      }

      if (tags.length === 0) {
        logger.debug('Using provided tags:', { tags: input.document.tags });
        tags = (input.document.tags ?? []).map((tag) => Tag.create(tag));
      }


      await this.globalRepository.initialize();

      const existingDocument = await this.globalRepository.getDocument(documentPath);

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

      await this.globalRepository.saveDocument(document);
      await this.globalRepository.updateTagsIndex();

      return {
        document: {
          path: document.path.value,
          content: document.content,
          tags: document.tags.map((tag) => tag.value),
          lastModified: document.lastModified.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to write document: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
