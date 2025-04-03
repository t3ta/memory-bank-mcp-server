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
// Removed direct import of rfc6902
import { JsonPatchService } from '../../../domain/jsonpatch/JsonPatchService.js'; // Import the service interface
import { JsonPatchOperation } from '../../../domain/jsonpatch/JsonPatchOperation.js'; // Keep this if needed for input type, or adjust input type

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
  document: WriteDocumentDTO; // Keep this for content-based writes

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
 * Output data for write branch document use case
 */
export interface WriteBranchDocumentOutput {
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
 * Use case for writing a document to branch memory bank
 */
export class WriteBranchDocumentUseCase
  implements IUseCase<WriteBranchDocumentInput, WriteBranchDocumentOutput> {

  private readonly componentLogger = logger.withContext({ component: 'WriteBranchDocumentUseCase' }); // Add logger instance
private readonly patchService: JsonPatchService; // Add patch service instance variable

/**
 * Constructor
 * @param branchRepository Branch memory bank repository
 * @param patchService JSON Patch service implementation
 */
constructor(
  private readonly branchRepository: IBranchMemoryBankRepository,
  patchService: JsonPatchService // Inject JsonPatchService
) {
  this.patchService = patchService;
}
// Removed extra closing brace

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteBranchDocumentInput): Promise<WriteBranchDocumentOutput> {
    try {
      // --- Input Validation ---
      if (!input.branchName) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Branch name is required');
      }
      if (!input.document) {
        // Even if using patches, the document object (for path, tags) is needed
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document object is required');
      }
      if (!input.document.path) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document path is required');
      }

      // Check if content is provided and is not an empty string
      const hasContent = input.document.content !== undefined && input.document.content !== null && input.document.content !== '';
      // Ensure patches is an array before checking length
      const hasPatches = input.patches && Array.isArray(input.patches) && input.patches.length > 0;

      if (hasContent && hasPatches) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Cannot provide both document content and patches simultaneously');
      }
      // Allow initialization (no content, no patches) - this case is handled below
      if (!hasContent && !hasPatches) {
         this.componentLogger.debug('Neither content nor non-empty patches provided, proceeding (possibly for initialization).');
      } else if (hasPatches && !Array.isArray(input.patches)) { // Redundant check but safe
         throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Patches must be an array');
      } else if (hasContent && typeof input.document.content !== 'string' && typeof input.document.content !== 'object') {
         throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document content must be a string or object');
      }

      // --- Guard for branchContext.json ---
      if (input.document.path === 'branchContext.json') {
        this.componentLogger.debug('Applying specific guards for branchContext.json');

        if (hasPatches) {
          // Disallow patch operations on branchContext.json for now
          throw new ApplicationError(
            ApplicationErrorCodes.INVALID_INPUT,
            'Patch operations are currently not allowed for branchContext.json'
          );
        }

        if (hasContent) {
          const content = input.document.content;
          // Check if content is a non-empty string
          if (typeof content !== 'string' || content.trim() === '' || content.trim() === '{}') {
            throw new ApplicationError(
              ApplicationErrorCodes.INVALID_INPUT,
              'Content for branchContext.json cannot be empty or an empty object string'
            );
          }
          // Check if content is valid JSON and has required keys
          try {
            const parsedContent = JSON.parse(content);
            if (typeof parsedContent !== 'object' || parsedContent === null) {
              throw new Error('Parsed content is not an object.');
            }
            const requiredKeys = ['schema', 'metadata', 'content'];
            for (const key of requiredKeys) {
              if (!(key in parsedContent)) {
                throw new Error(`Missing required key: ${key}`);
              }
            }
            // Optional: Add more specific checks for metadata or content structure if needed
            this.componentLogger.debug('branchContext.json content validation passed.');
          } catch (parseError) {
            throw new ApplicationError(
              ApplicationErrorCodes.INVALID_INPUT,
              `Invalid JSON content for branchContext.json: ${(parseError as Error).message}`,
              { originalError: parseError }
            );
          }
        }
        // If neither content nor patches (and path is branchContext.json),
        // it might be an initialization attempt which is allowed by default logic later.
        // Or it might be an invalid request if the file already exists.
        // The existing logic handles the initialization case (L219-L241).
      }

      // --- Prepare Domain Objects ---
      const branchInfo = BranchInfo.create(input.branchName);
      const documentPath = DocumentPath.create(input.document.path);
      const tags = (input.document.tags ?? []).map((tag) => Tag.create(tag));

      // --- Ensure Branch Exists ---
      const branchExists = await this.branchRepository.exists(branchInfo.safeName);
      if (!branchExists) {
        this.componentLogger.info(`Branch ${branchInfo.safeName} does not exist. Initializing...`);
        try {
          await this.branchRepository.initialize(branchInfo);
          this.componentLogger.info(`Branch ${branchInfo.safeName} initialized successfully.`);
        } catch (initError) {
          this.componentLogger.error(`Failed to initialize branch ${branchInfo.safeName}`, { originalError: initError });
          throw new ApplicationError(
            ApplicationErrorCodes.BRANCH_INITIALIZATION_FAILED, // Keep specific error code
            `Failed to initialize branch: ${(initError as Error).message}`,
            { originalError: initError }
          );
        }
      }

      // --- Determine Document to Save ---
      let documentToSave: MemoryDocument;
      const existingDocument = await this.branchRepository.getDocument(branchInfo, documentPath);

      if (hasPatches) {
        // --- Patch Logic ---
        if (!existingDocument) {
          // Use existing error code and provide detail in message
          throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Document not found at path ${documentPath.value}, cannot apply patches.`);
        }

        try {
          let currentContentObject: any;
          if (typeof existingDocument.content === 'string') {
            try {
              currentContentObject = JSON.parse(existingDocument.content);
            } catch (parseError) {
              // Use existing error code
              throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to parse existing document content as JSON for patching: ${(parseError as Error).message}`);
            }
          } else if (typeof existingDocument.content === 'object' && existingDocument.content !== null) {
            currentContentObject = existingDocument.content;
          } else {
             // Use existing error code
             throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Existing document content is not a string or object, cannot apply patches. Type: ${typeof existingDocument.content}`);
          }

          // Log arguments before calling applyPatch
          // console.error('--- Applying patch - Current Object:', JSON.stringify(currentContentObject, null, 2)); // DEBUG LOG REMOVED
          // console.error('--- Applying patch - Patches:', JSON.stringify(input.patches, null, 2)); // DEBUG LOG REMOVED

          // Convert input patches (any[]) to JsonPatchOperation[]
          // Assuming input.patches contains objects like { op: 'add', path: '/a', value: 1 }
          const patchOperations = (input.patches ?? []).map(p =>
              JsonPatchOperation.create(p.op, p.path, p.value, p.from)
          );

          // Apply the patches using the injected patch service
          const patchedContent = this.patchService.apply(currentContentObject, patchOperations);

          // Update the document content
          // Convert patched object back to JSON string before updating content
          // Convert patched object back to JSON string before updating content
          // Log patched content before stringifying using console.error for visibility
          // console.error('--- Patched content (object):', JSON.stringify(patchedContent, null, 2)); // DEBUG LOG REMOVED
          const stringifiedContent = JSON.stringify(patchedContent, null, 2);
          // Log stringified content using console.error for visibility
          // console.error('--- Stringified patched content:', stringifiedContent); // DEBUG LOG REMOVED
          documentToSave = existingDocument.updateContent(stringifiedContent);
          // Log success message using console.error
          // console.error(`--- Document patched successfully: ${documentPath.value}`); // DEBUG LOG REMOVED

        } catch (patchError) {
          this.componentLogger.error(`Failed to apply JSON patch to ${documentPath.value}`, { error: patchError });
          // Use existing error code
          throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to apply JSON patch: ${(patchError as Error).message}`);
        }

        // Update tags if provided with patches (tags might be in input.document.tags)
        if (input.document.tags) {
           documentToSave = documentToSave.updateTags(tags);
        }

      } else if (hasContent) {
        // --- Content Logic ---
        if (existingDocument) {
          documentToSave = existingDocument.updateContent(input.document.content);
          if (input.document.tags) {
            documentToSave = documentToSave.updateTags(tags);
          }
        } else {
          // Create new document with content
          documentToSave = MemoryDocument.create({
            path: documentPath,
            content: input.document.content,
            tags,
            lastModified: new Date(),
          });
        }
      } else {
         // --- Initialization Logic (No content, No non-empty patches) ---
         if (!existingDocument) {
             this.componentLogger.info(`Initializing empty document at ${documentPath.value}`);
             documentToSave = MemoryDocument.create({
                 path: documentPath,
                 content: '{}', // Initialize with empty JSON object string
                 tags: tags, // Apply tags even during initialization if provided
                 lastModified: new Date(),
             });
         } else {
             this.componentLogger.warn(`Write request with no content/patches for existing document ${documentPath.value}. No changes made.`);
             // Return existing document data as success
             // ★★★ ここも修正後の Output 型に合わせる必要がある ★★★
             const minimalOutputDocument: WriteBranchDocumentOutput['document'] = {
                 path: existingDocument.path.value,
                 lastModified: existingDocument.lastModified.toISOString(),
                 // content と tags は含めない
             };
             return {
                 document: minimalOutputDocument,
             };
         }
      }

      // --- Save Document ---
      await this.branchRepository.saveDocument(branchInfo, documentToSave);

      // --- Return Output ---
      // returnContent フラグ (デフォルトは false) を見てレスポンスを構築
      const shouldReturnContent = input.returnContent === true; // 明示的に true の場合のみ

      // ★★★ 型注釈を修正後の Output 型に合わせる ★★★
      const outputDocument: WriteBranchDocumentOutput['document'] = {
        path: documentToSave.path.value,
        lastModified: documentToSave.lastModified.toISOString(),
        // returnContent が true の場合のみ content と tags を含める
        ...(shouldReturnContent && {
          content: documentToSave.content,
          tags: documentToSave.tags.map((tag) => tag.value),
        }),
      };

      return {
        document: outputDocument,
      };
    } catch (error) {
      // --- Error Handling ---
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }
      this.componentLogger.error('Unexpected error in WriteBranchDocumentUseCase:', { error });
      // Wrap unexpected errors
      throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Unexpected error: ${(error as Error).message}`, { originalError: error });
    }
  }
}
