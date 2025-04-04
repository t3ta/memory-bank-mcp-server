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
private readonly patchService: JsonPatchService; // Add patch service instance variable

/**
 * Constructor
 * @param branchRepository Branch memory bank repository
 * @param patchService JSON Patch service implementation
 */
constructor(
  private readonly branchRepository: IBranchMemoryBankRepository,
  patchService: JsonPatchService, // Inject JsonPatchService
  private readonly gitService: IGitService,
  private readonly configProvider: IConfigProvider
) {
  this.patchService = patchService;
}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteBranchDocumentInput): Promise<WriteBranchDocumentOutput> {
    try {
      let documentToSave: MemoryDocument; // Declare here

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

      // Remaining validations...
      if (!input.document) {
        // Even if using patches, the document object (for path, tags) is needed
        throw ApplicationErrors.invalidInput('Document object is required');
      }
      if (!input.document.path) {
        throw ApplicationErrors.invalidInput('Document path is required');
      }

      // Check if content is provided and is not an empty string
      const hasContent = input.document.content !== undefined && input.document.content !== null; // 空文字列は true とする
      // Ensure patches is an array before checking length
      const hasPatches = input.patches && Array.isArray(input.patches) && input.patches.length > 0;

      // Allow initialization (no content, no patches) - this case is handled below
      // content が undefined または null で、かつ patches もない場合のみエラー
      if ((input.document.content === undefined || input.document.content === null) && !hasPatches) { // ★ OR 条件に修正
        throw ApplicationErrors.invalidInput(
          'Either document content or patches must be provided'
        );
      }
      // content と patches の排他チェック
      if (hasContent && hasPatches) {
        throw ApplicationErrors.invalidInput('Cannot provide both document content and patches simultaneously');
      }

// --- Prepare Domain Objects ---
const branchInfo = BranchInfo.create(branchNameToUse!);
const documentPath = DocumentPath.create(input.document.path);
const tags = (input.document.tags ?? []).map((tag) => Tag.create(tag));

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

// --- Determine Document to Save ---
const existingDocument = await this.branchRepository.getDocument(branchInfo, documentPath);

if (hasPatches) {
  // --- Patch Logic ---
  this.componentLogger.debug('Processing write request with patches.', { path: documentPath.value });

  // Guard: Disallow patch operations on branchContext.json for now
  // Guard: Disallow patch operations on branchContext.json for now
  if (documentPath.value === 'branchContext.json') {
    // Guard condition met, throw error
    throw ApplicationErrors.invalidInput(
      'Patch operations are currently not allowed for branchContext.json'
    );
  }

  if (!existingDocument) {
    throw ApplicationErrors.notFound('Document', documentPath.value, { message: 'Cannot apply patches to non-existent document.'});
  }

  try {
    let currentContentObject: any;
    if (typeof existingDocument.content === 'string') {
      try {
        currentContentObject = JSON.parse(existingDocument.content);
      } catch (parseError) {
        // ★★★ ApplicationErrors.executionFailed に修正 ★★★
        throw ApplicationErrors.executionFailed(`Failed to parse existing document content as JSON for patching: ${(parseError as Error).message}`);
      }
    } else if (typeof existingDocument.content === 'object' && existingDocument.content !== null) {
      currentContentObject = existingDocument.content;
    } else {
       // ★★★ ApplicationErrors.executionFailed に修正 ★★★
       throw ApplicationErrors.executionFailed(`Existing document content is not a string or object, cannot apply patches. Type: ${typeof existingDocument.content}`);
    }

    const patchOperations = (input.patches ?? []).map(p =>
        JsonPatchOperation.create(p.op, p.path, p.value, p.from)
    );

    // ★★★ test 操作を自前で検証 (Global からコピー) ★★★
    const testOperations = patchOperations.filter(op => op.op === 'test');
    if (testOperations.length > 0) {
      this.componentLogger.debug('Validating test operations before applying patch', { path: documentPath.value, testOperations });
      for (const testOp of testOperations) {
        // testOp の型を TestOperation に限定 (value が必須)
        if (testOp.op !== 'test' || testOp.value === undefined) {
           throw ApplicationErrors.invalidInput(`Invalid test operation format: ${JSON.stringify(testOp)}`);
        }
        try {
           // JSON Pointer で値を取得 (JsonPath.segments を使用)
           const expectedValue = testOp.value;
           let actualValue: any = currentContentObject;
           const segments = testOp.path.segments.slice(1); // ルートを示す最初の空文字列を除外

           for (const segment of segments) {
              // JsonPath.segments はデコード済みなのでそのまま使用
              if (actualValue && typeof actualValue === 'object' && segment in actualValue) {
                 actualValue = actualValue[segment];
              } else if (Array.isArray(actualValue) && /^\d+$/.test(segment)) {
                 // 配列インデックスの場合
                 const index = parseInt(segment, 10);
                 if (index >= 0 && index < actualValue.length) {
                    actualValue = actualValue[index];
                 } else {
                    // インデックス範囲外ならパスが存在しない
                    throw new Error(`Path not found at index: ${segment}`);
                 }
              } else {
                 // パスが存在しない場合、テスト失敗
                 throw new Error(`Path not found: ${testOp.path.path}`); // エラーメッセージには元のパス文字列を表示
              }
           }

           // 値を比較 (JSON 文字列にして比較するのが確実)
           if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
              throw new Error(`Value mismatch at path ${testOp.path.path}. Expected: ${JSON.stringify(expectedValue)}, Actual: ${JSON.stringify(actualValue)}`); // エラーメッセージには元のパス文字列を表示
           }
           this.componentLogger.debug('Test operation successful:', { testOp });

        } catch (testError) {
           this.componentLogger.error('Patch test operation failed:', { path: documentPath.value, testOp, error: testError });
           const cause = testError instanceof Error ? testError : undefined;
           throw ApplicationErrors.invalidInput(`Patch test operation failed: ${cause?.message ?? 'Test failed'}`, { cause });
        }
      }
      // test 操作がすべて成功した場合のみ次に進む
    }
    // ★★★ test 操作以外のパッチを適用 ★★★
    const nonTestOperations = patchOperations.filter(op => op.op !== 'test');
    const patchedContent = this.patchService.apply(currentContentObject, nonTestOperations); // test 以外の操作を適用
    const stringifiedContent = JSON.stringify(patchedContent, null, 2);
    documentToSave = existingDocument.updateContent(stringifiedContent);
    // ★★★ パッチ適用成功後にタグを更新 ★★★
    if (input.document.tags) {
        documentToSave = documentToSave.updateTags(tags);
        this.componentLogger.debug('Tags updated along with patches.', { path: documentPath.value, newTags: input.document.tags });
    }
    // ★★★ ここまで ★★★

  } catch (patchError) {
    this.componentLogger.error(`Failed to apply JSON patch to ${documentPath.value}`, { error: patchError });
    // ★★★ ApplicationErrors.executionFailed に修正 ★★★
    throw ApplicationErrors.executionFailed(`Failed to apply JSON patch: ${(patchError as Error).message}`);
  }

  // ★ タグ更新処理は try ブロック内に移動したので、ここは削除 ★

} else if (hasContent) {
  // --- Content Logic ---
  this.componentLogger.debug('Processing write request with content.', { path: documentPath.value });

  // Guard: Validate content for branchContext.json
  if (documentPath.value === 'branchContext.json') {
    const content = input.document.content;
    if (typeof content !== 'string' || content.trim() === '' || content.trim() === '{}') {
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
        { originalError: parseError } // ここは details として渡すので OK
      );
    }
  }

  // Proceed with content update/creation
  if (existingDocument) {
    // content が undefined の場合は空文字列を渡す
    documentToSave = existingDocument.updateContent(input.document.content ?? '');
    if (input.document.tags) {
      documentToSave = documentToSave.updateTags(tags);
    }
  } else {
    documentToSave = MemoryDocument.create({
      path: documentPath,
      // content が undefined の場合は空文字列を渡す
      content: input.document.content ?? '',
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
      // ★★★ cause に元のエラーオブジェクトを渡す ★★★
      throw ApplicationErrors.executionFailed(`Unexpected error: ${(error as Error).message}`, error instanceof Error ? error : undefined);
    }
  }
}
