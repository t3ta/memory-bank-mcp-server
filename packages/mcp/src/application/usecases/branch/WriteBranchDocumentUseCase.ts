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
      let documentToSave: MemoryDocument; // Declare here
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
      const hasContent = input.document.content !== undefined && input.document.content !== null; // 空文字列は true とする
      // Ensure patches is an array before checking length
      const hasPatches = input.patches && Array.isArray(input.patches) && input.patches.length > 0;

      // Allow initialization (no content, no patches) - this case is handled below
      // content が undefined または null で、かつ patches もない場合のみエラー
      if ((input.document.content === undefined || input.document.content === null) && !hasPatches) { // ★ OR 条件に修正
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Either document content or patches must be provided'
        );
      }
      // content と patches の排他チェック
      if (hasContent && hasPatches) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Cannot provide both document content and patches simultaneously');
      }
      // 不要な else if を削除
      // else if (hasPatches && !Array.isArray(input.patches)) { ... }
      // else if (hasContent && typeof input.document.content !== 'string' && typeof input.document.content !== 'object') { ... }

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
const existingDocument = await this.branchRepository.getDocument(branchInfo, documentPath);

if (hasPatches) {
  // --- Patch Logic ---
  this.componentLogger.debug('Processing write request with patches.', { path: documentPath.value });

  // Guard: Disallow patch operations on branchContext.json for now
  if (documentPath.value === 'branchContext.json') {
    throw new ApplicationError(
      ApplicationErrorCodes.INVALID_INPUT,
      'Patch operations are currently not allowed for branchContext.json'
    );
  }

  if (!existingDocument) {
    throw new ApplicationError(ApplicationErrorCodes.NOT_FOUND, `Document not found at path ${documentPath.value}, cannot apply patches.`);
  }

  try {
    let currentContentObject: any;
    if (typeof existingDocument.content === 'string') {
      try {
        currentContentObject = JSON.parse(existingDocument.content);
      } catch (parseError) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_STATE, `Failed to parse existing document content as JSON for patching: ${(parseError as Error).message}`);
      }
    } else if (typeof existingDocument.content === 'object' && existingDocument.content !== null) {
      currentContentObject = existingDocument.content;
    } else {
       throw new ApplicationError(ApplicationErrorCodes.INVALID_STATE, `Existing document content is not a string or object, cannot apply patches. Type: ${typeof existingDocument.content}`);
    }

    const patchOperations = (input.patches ?? []).map(p =>
        JsonPatchOperation.create(p.op, p.path, p.value, p.from)
    );

    const patchedContent = this.patchService.apply(currentContentObject, patchOperations);
    const stringifiedContent = JSON.stringify(patchedContent, null, 2);
    documentToSave = existingDocument.updateContent(stringifiedContent);

  } catch (patchError) {
    this.componentLogger.error(`Failed to apply JSON patch to ${documentPath.value}`, { error: patchError });
    throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to apply JSON patch: ${(patchError as Error).message}`);
  }

  // Update tags if provided with patches
  if (input.document.tags) {
     documentToSave = documentToSave.updateTags(tags);
  }

} else if (hasContent) {
  // --- Content Logic ---
  this.componentLogger.debug('Processing write request with content.', { path: documentPath.value });

  // Guard: Validate content for branchContext.json
  if (documentPath.value === 'branchContext.json') {
    const content = input.document.content;
    if (typeof content !== 'string' || content.trim() === '' || content.trim() === '{}') {
      throw new ApplicationError(
        ApplicationErrorCodes.INVALID_INPUT,
        'Content for branchContext.json cannot be empty or an empty object string'
      );
    }
    try {
      const parsedContent = JSON.parse(content);
      if (typeof parsedContent !== 'object' || parsedContent === null) { throw new Error('Parsed content is not an object.'); }
      const requiredKeys = ['schema', 'metadata', 'content'];
      for (const key of requiredKeys) { if (!(key in parsedContent)) { throw new Error(`Missing required key: ${key}`); } }
      this.componentLogger.debug('branchContext.json content validation passed.');
    } catch (parseError) {
      throw new ApplicationError(
        ApplicationErrorCodes.INVALID_INPUT,
        `Invalid JSON content for branchContext.json: ${(parseError as Error).message}`,
        { originalError: parseError }
      );
    }
  }

  // Proceed with content update/creation
  if (existingDocument) {
    documentToSave = existingDocument.updateContent(input.document.content);
    if (input.document.tags) {
      documentToSave = documentToSave.updateTags(tags);
    }
  } else {
    documentToSave = MemoryDocument.create({
      path: documentPath,
      content: input.document.content,
      tags,
      lastModified: new Date(),
    });
  }
} else {
   // --- Initialization Logic (No content, No non-empty patches) ---
   this.componentLogger.debug('Processing write request with no content or patches (initialization or no-op).', { path: documentPath.value });
   if (!existingDocument) {
       this.componentLogger.info(`Initializing empty document at ${documentPath.value}`);
       documentToSave = MemoryDocument.create({
           path: documentPath,
           content: '{}',
           tags: tags,
           lastModified: new Date(),
       });
   } else {
       this.componentLogger.warn(`Write request with no content/patches for existing document ${documentPath.value}. No changes made.`);
       const minimalOutputDocument: WriteBranchDocumentOutput['document'] = {
           path: existingDocument.path.value,
           lastModified: existingDocument.lastModified.toISOString(),
       };
       return { document: minimalOutputDocument };
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
