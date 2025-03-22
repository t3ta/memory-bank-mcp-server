import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import { Tag } from "../../../domain/entities/Tag.js";
import type { IGlobalMemoryBankRepository } from "../../../domain/repositories/IGlobalMemoryBankRepository.js";
import { ApplicationError, ApplicationErrorCodes } from "../../../shared/errors/ApplicationError.js";
import { DomainError } from "../../../shared/errors/DomainError.js";
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
  // Flag to disable Markdown writing
  private readonly disableMarkdownWrites: boolean;

  /**
   * Constructor
   * @param globalRepository Global memory bank repository
   * @param options Options for the use case
   */
  constructor(
    private readonly globalRepository: IGlobalMemoryBankRepository,
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
  async execute(input: WriteGlobalDocumentInput): Promise<WriteGlobalDocumentOutput> {
    try {
      // Validate input
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
      const documentPath = DocumentPath.create(input.document.path);

      // Extract tags from document content if it's JSON
      let tags: Tag[] = [];
      if (documentPath.value.endsWith('.json')) {
        try {
          const parsed = JSON.parse(input.document.content);
          if (parsed.metadata?.tags) {
            console.log('[DEBUG] Found tags in metadata:', parsed.metadata.tags);
            tags = parsed.metadata.tags.map((tag: string) => {
              console.log(`[DEBUG] Creating tag: "${tag}"`);
              return Tag.create(tag);
            });
          }
        } catch (error) {
          console.error('[DEBUG] Failed to parse document content as JSON:', error);
        }
      }

      // Fallback to provided tags if no tags were found in metadata
      if (tags.length === 0) {
        console.log('[DEBUG] Using provided tags:', input.document.tags);
        tags = (input.document.tags ?? []).map((tag) => Tag.create(tag));
      }

      // Check if markdown writes are disabled
      if (this.disableMarkdownWrites && documentPath.value.toLowerCase().endsWith('.md')) {
        const jsonPath = documentPath.value.replace(/\.md$/, '.json');
        throw new ApplicationError(
          ApplicationErrorCodes.OPERATION_NOT_ALLOWED,
          `Writing to Markdown files is disabled. Please use JSON format instead: ${jsonPath}`
        );
      }

      // Initialize global memory bank if needed
      await this.globalRepository.initialize();

      // Create or update document
      const existingDocument = await this.globalRepository.getDocument(documentPath);

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
      await this.globalRepository.saveDocument(document);

      // Update tags index
      await this.globalRepository.updateTagsIndex();

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
