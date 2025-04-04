// Removed direct import of rfc6902, using JsonPatchService via DocumentWriterService
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
import { DocumentWriterService, DocumentWriterInput } from '../../services/DocumentWriterService.js'; // Import the new service
import type { IDocumentRepository } from '@/domain/repositories/IDocumentRepository.js'; // Import the common repository interface
// Removed unused import: import { JsonPatchService } from '@/domain/jsonpatch/JsonPatchService.js';


/**
 * Input data for write global document use case
 */
export interface WriteGlobalDocumentInput {
 /**
  * Document data (path, content, tags)
  * Content is used if patches are not provided.
  */
 document: WriteDocumentDTO;

 /**
  * JSON Patch operations (optional, use instead of document.content)
  */
 patches?: any[];

  /**
   * If true, return the full document content in the output. Defaults to false.
   * @optional
   */
  returnContent?: boolean;
}

/**
 * Output data for write global document use case
 */
export interface WriteGlobalDocumentOutput {
  /**
   * Document data after write.
   * Content and tags are included only if `returnContent` was true in the input.
   */
  document: Omit<DocumentDTO, 'content' | 'tags'> & {
    content?: string;
    tags?: string[];
  };
}

/**
 * Use case for writing a document to global memory bank
 */
export class WriteGlobalDocumentUseCase
  implements IUseCase<WriteGlobalDocumentInput, WriteGlobalDocumentOutput> {

  /**
* Constructor
* @param globalRepository Global memory bank repository
* @param documentWriterService Service for writing/patching documents
*/
constructor(
 private readonly globalRepository: IGlobalMemoryBankRepository,
 private readonly documentWriterService: DocumentWriterService // Inject DocumentWriterService
) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteGlobalDocumentInput): Promise<WriteGlobalDocumentOutput> {
    logger.debug('Executing WriteGlobalDocumentUseCase with input:', { input }); // ★ログ追加
    try {
      // ★ログ追加: content と patches の状態を確認
     logger.debug('Checking input document content and patches:', {
       contentExists: input.document?.content !== undefined && input.document?.content !== null,
       patchesExists: input.patches !== undefined && input.patches !== null && Array.isArray(input.patches) && input.patches.length > 0,
       patches: input.patches, // Use input.patches directly
      });
      if (!input.document) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document is required');
      }

      if (!input.document.path) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Document path is required'
        );
      }

     // Basic input validation (delegated most checks to DocumentWriterService)
     // Content/Patches validation is handled by DocumentWriterService

      // ★ content が必須だったチェックは削除 (patchesのみの場合もあるため)
      // if (input.document.content === undefined || input.document.content === null) {
      //   throw new ApplicationError(
      //     ApplicationErrorCodes.INVALID_INPUT,
      //     'Document content is required'
      //   );
      // }

     const documentPath = DocumentPath.create(input.document.path);
     // Extract tags from input DTO if provided
     const tags = (input.document.tags ?? []).map((tag) => Tag.create(tag));


      await this.globalRepository.initialize();

     // --- Create Repository Adapter ---
     const repositoryAdapter: IDocumentRepository = {
       getDocument: async (path: DocumentPath): Promise<MemoryDocument | null> => {
         return this.globalRepository.getDocument(path);
       },
       saveDocument: async (doc: MemoryDocument): Promise<void> => {
         await this.globalRepository.saveDocument(doc);
         // Global repository handles tag index updates internally after save
         await this.globalRepository.updateTagsIndex(); // Ensure index is updated after save
       },
     };

     // --- Prepare Input for DocumentWriterService ---
     const writerInput: DocumentWriterInput = {
       path: documentPath,
       content: input.document.content,
      patches: input.patches, // Use input.patches directly
      tags: tags, // Pass tags from input DTO
     };

     // --- Call DocumentWriterService ---
    // Call DocumentWriterService without assigning the result to an unused variable
    await this.documentWriterService.write(repositoryAdapter, writerInput);

     // --- Return Output ---
     // Re-fetch the document AFTER the save and index update to ensure we return the latest state
     const finalDocument = await this.globalRepository.getDocument(documentPath);
     if (!finalDocument) {
       // This should ideally not happen if saveDocument succeeded
       throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to retrieve the saved document after update: ${documentPath.value}`);
     }


      // returnContent フラグ (デフォルトは false) を見てレスポンスを構築
      const shouldReturnContent = input.returnContent === true; // 明示的に true の場合のみ

     const outputDocument: WriteGlobalDocumentOutput['document'] = {
       path: finalDocument.path.value, // Use finalDocument
       lastModified: finalDocument.lastModified.toISOString(), // Use finalDocument
       // Include content and tags only if requested
       ...(shouldReturnContent && {
         content: finalDocument.content, // Use finalDocument
         tags: finalDocument.tags.map((tag) => tag.value), // Use finalDocument
       }),
     };

      return {
        document: outputDocument,
      };
    } catch (error) {
      // If it's a known domain or application error, re-throw it directly
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }
      // For any other unexpected errors, re-throw them directly as well.
      // (Previously, these were wrapped in a generic ApplicationError)
      logger.error('Unexpected error in WriteGlobalDocumentUseCase:', { error }); // Log unexpected errors
      throw error;
    }
  }
}
