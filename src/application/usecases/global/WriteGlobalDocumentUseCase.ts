import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { WriteDocumentDTO } from '../../dtos/WriteDocumentDTO.js';
import { IGlobalMemoryBankRepository } from '../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../shared/errors/ApplicationError.js';

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
export class WriteGlobalDocumentUseCase implements IUseCase<WriteGlobalDocumentInput, WriteGlobalDocumentOutput> {
  /**
   * Constructor
   * @param globalRepository Global memory bank repository
   */
  constructor(
    private readonly globalRepository: IGlobalMemoryBankRepository
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteGlobalDocumentInput): Promise<WriteGlobalDocumentOutput> {
    try {
      // Validate input
      if (!input.document) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Document is required'
        );
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
      const tags = (input.document.tags ?? []).map(tag => Tag.create(tag));
      
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
          lastModified: new Date()
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
          tags: document.tags.map(tag => tag.value),
          lastModified: document.lastModified.toISOString()
        }
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
