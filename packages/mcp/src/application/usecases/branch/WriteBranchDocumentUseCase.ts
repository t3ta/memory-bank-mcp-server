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
  ApplicationErrors, // Use this for error creation
} from '../../../shared/errors/ApplicationError.js';
import { logger } from '../../../shared/utils/logger.js'; // Import logger
import type { IGitService } from '@/infrastructure/git/IGitService.js';
import type { IConfigProvider } from '@/infrastructure/config/interfaces/IConfigProvider.js';
import { DocumentWriterService, DocumentWriterInput } from '../../services/DocumentWriterService.js'; // Import the new service
import type { IDocumentRepository } from '@/domain/repositories/IDocumentRepository.js'; // Import the common repository interface

/**
 * Input data for write branch document use case
 */
export interface WriteBranchDocumentInput {
  /**
   * Branch name
   */
  branchName?: string;

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
private readonly documentWriterService: DocumentWriterService; // Inject DocumentWriterService

/**
 * Constructor
* @param branchRepository Branch memory bank repository
* @param documentWriterService Service for writing/patching documents
* @param gitService Git service
* @param configProvider Configuration provider
*/
constructor(
 private readonly branchRepository: IBranchMemoryBankRepository,
 documentWriterService: DocumentWriterService, // Inject DocumentWriterService
 private readonly gitService: IGitService,
 private readonly configProvider: IConfigProvider
) {
 this.documentWriterService = documentWriterService;
}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteBranchDocumentInput): Promise<WriteBranchDocumentOutput> {
    try {
     // documentToSave is now handled within DocumentWriterService

      // --- Determine Branch Name ---
      let branchNameToUse = input.branchName;

      if (!branchNameToUse) {
        const config = this.configProvider.getConfig(); // ConfigProviderから設定取得
        if (config.isProjectMode) { // プロジェクトモードかチェック
          this.componentLogger.info('Branch name not provided in project mode, attempting to detect current branch...');
          try {
            branchNameToUse = await this.gitService.getCurrentBranchName();
            this.componentLogger.info(`Current branch name automatically detected: ${branchNameToUse}`);
          } catch (error) {
            this.componentLogger.error('Failed to get current branch name', { error });
            // ★★★ cause に元のエラーオブジェクトを渡す ★★★
            throw ApplicationErrors.executionFailed(
              'Branch name is required but could not be automatically determined. Please provide it explicitly or ensure you are in a Git repository.',
              error instanceof Error ? error : undefined // cause に Error オブジェクトを渡す
            );
          }
        } else {
          // プロジェクトモードでない場合は、ブランチ名の省略はエラー
          this.componentLogger.warn('Branch name omitted outside of project mode.');
          throw ApplicationErrors.invalidInput('Branch name is required when not running in project mode.');
        }
      }

      // --- Input Validation (using determined branch name) ---
      this.componentLogger.info('Executing write branch document use case', {
        branchName: branchNameToUse, // Use determined branch name for logging
        documentPath: input.document?.path, // Use optional chaining for safety
        hasContent: input.document?.content !== undefined && input.document?.content !== null,
        hasPatches: input.patches && Array.isArray(input.patches) && input.patches.length > 0,
      });

     // Basic input validation (delegated most checks to DocumentWriterService)
     if (!input.document) {
       throw ApplicationErrors.invalidInput('Document object is required');
     }
     if (!input.document.path) {
       throw ApplicationErrors.invalidInput('Document path is required');
     }

// --- Prepare Domain Objects ---
   const branchInfo = BranchInfo.create(branchNameToUse!);
   const documentPath = DocumentPath.create(input.document.path);
   const tags = (input.document.tags ?? []).map((tag) => Tag.create(tag));

   // --- Guard for branchContext.json (Keep specific logic in UseCase) ---
   if (documentPath.value === 'branchContext.json') {
       const hasPatches = input.patches && Array.isArray(input.patches) && input.patches.length > 0;
       if (hasPatches) {
           // Disallow patch operations on branchContext.json
           throw ApplicationErrors.invalidInput(
               'Patch operations are currently not allowed for branchContext.json'
           );
       }
       // Validate content if provided
       const content = input.document.content;
       if (typeof content === 'string') { // Only validate if content is provided
           if (content.trim() === '' || content.trim() === '{}') {
               throw ApplicationErrors.invalidInput(
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
               throw ApplicationErrors.invalidInput(
                   `Invalid JSON content for branchContext.json: ${(parseError as Error).message}`,
                   { originalError: parseError }
               );
           }
       } else if (content !== undefined && content !== null) {
            // If content exists but is not a string, it's invalid
            throw ApplicationErrors.invalidInput('Invalid content type for branchContext.json, must be a JSON string.');
       }
       // If content is null/undefined (and no patches), it's allowed (e.g., initialization)
   }

// --- Ensure Branch Exists ---
const branchExists = await this.branchRepository.exists(branchInfo.safeName); // Use safeName here
if (!branchExists) {
  this.componentLogger.info(`Branch '${branchInfo.safeName}' does not exist. Initializing...`); // Use safeName
  try {
    await this.branchRepository.initialize(branchInfo); // Pass BranchInfo object
    this.componentLogger.info(`Branch '${branchInfo.safeName}' initialized successfully.`); // Use safeName
  } catch (initError) {
    this.componentLogger.error(`Failed to initialize branch '${branchInfo.safeName}'`, { originalError: initError }); // Use safeName
    // ★★★ ApplicationErrors.branchInitializationFailed の引数を修正 ★★★
    throw ApplicationErrors.branchInitializationFailed(
      branchInfo.name, // branchName
      initError instanceof Error ? initError : undefined, // cause
      // details はオプションなので省略可能、またはメッセージを含める
      { message: `Failed to initialize branch '${branchInfo.name}': ${(initError as Error).message}` }
    );
  }
}

   // --- Create Repository Adapter ---
   // This adapter provides the simple IDocumentRepository interface expected by DocumentWriterService,
   // while internally using the branch-specific repository and the determined branchInfo.
   const repositoryAdapter: IDocumentRepository = {
     getDocument: async (path: DocumentPath): Promise<MemoryDocument | null> => {
       // Use the specific branch repository and branchInfo
       return this.branchRepository.getDocument(branchInfo, path);
     },
     saveDocument: async (doc: MemoryDocument): Promise<void> => {
       // Use the specific branch repository and branchInfo
       await this.branchRepository.saveDocument(branchInfo, doc);
       // Note: Tag indexing for branches is handled within BranchFileSystemRepository.saveDocument
     },
   };

   // --- Prepare Input for DocumentWriterService ---
   const writerInput: DocumentWriterInput = {
     path: documentPath,
     content: input.document.content, // Pass content or patches
     patches: input.patches,
     tags: tags, // Pass tags (WriterService puts them on MemoryDocument, repo handles indexing)
   };

   // --- Call DocumentWriterService ---
   // The core logic of validation, patching, or content writing happens here.
   const savedDocument = await this.documentWriterService.write(repositoryAdapter, writerInput);

     // Document is already saved by the documentWriterService call above

      // --- Return Output ---
      // returnContent フラグ (デフォルトは false) を見てレスポンスを構築
      const shouldReturnContent = input.returnContent === true; // 明示的に true の場合のみ

     const outputDocument: WriteBranchDocumentOutput['document'] = {
       path: savedDocument.path.value, // Use the document returned by the service
       lastModified: savedDocument.lastModified.toISOString(),
       // Include content and tags only if requested
       ...(shouldReturnContent && {
         content: savedDocument.content,
         tags: savedDocument.tags.map((tag) => tag.value),
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
      // ★★★ cause に元のエラーオブジェクトを渡す ★★★
      throw ApplicationErrors.executionFailed(`Unexpected error: ${(error as Error).message}`, error instanceof Error ? error : undefined);
    }
  }
}
