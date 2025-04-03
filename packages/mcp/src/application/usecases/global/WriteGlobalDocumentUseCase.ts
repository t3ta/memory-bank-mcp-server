import * as rfc6902 from 'rfc6902'; // ★rfc6902をインポート
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
    logger.debug('Executing WriteGlobalDocumentUseCase with input:', { input }); // ★ログ追加
    try {
      // ★ログ追加: content と patches の状態を確認
      logger.debug('Checking input document content and patches:', {
        contentExists: input.document?.content !== undefined && input.document?.content !== null,
        // ★anyにキャストしてpatchesの存在を確認
        patchesExists: (input.document as any)?.patches !== undefined && (input.document as any)?.patches !== null,
        patches: (input.document as any)?.patches, // patches の内容も確認 (anyキャスト)
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

      // ★ content と patches の存在チェック
      const hasContent = input.document.content !== undefined && input.document.content !== null;
      const hasPatches = (input.document as any).patches !== undefined && (input.document as any).patches !== null;

      // ★ content と patches の排他チェック
      if (!hasContent && !hasPatches) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Either document content or patches must be provided'
        );
      }
      if (hasContent && hasPatches) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Document content and patches cannot be provided simultaneously'
        );
      }

      // ★ content が必須だったチェックは削除 (patchesのみの場合もあるため)
      // if (input.document.content === undefined || input.document.content === null) {
      //   throw new ApplicationError(
      //     ApplicationErrorCodes.INVALID_INPUT,
      //     'Document content is required'
      //   );
      // }

      const documentPath = DocumentPath.create(input.document.path);

      // ★ タグ抽出ロジックは content がある場合のみ実行
      let tags: Tag[] = []; // メタデータから抽出されたタグを保持する変数
      if (hasContent && documentPath.value.endsWith('.json')) {
        try {
          // content が null/undefined でないことは上でチェック済み
          const parsed = JSON.parse(input.document.content!);
          if (parsed.metadata?.tags && Array.isArray(parsed.metadata.tags)) {
            logger.debug('Found tags in metadata:', { tags: parsed.metadata.tags });
            tags = parsed.metadata.tags
              .filter((tag: any): tag is string => typeof tag === 'string') // 文字列のみを対象 ★any型指定
              .map((tag: string) => {
                try {
                   return Tag.create(tag);
                } catch (tagError) {
                   logger.warn(`Skipping invalid tag found in metadata: "${tag}"`, { path: documentPath.value, error: tagError });
                   return null; // 無効なタグはスキップ
                }
              })
              .filter((tag: any): tag is Tag => tag !== null); // nullを除去 ★any型指定
          }
        } catch (error) {
          // JSONパースエラーは許容しない（content自体が無効なため）
          logger.error(`Invalid JSON content provided for tag extraction in ${documentPath.value}:`, { error });
          throw new DomainError(
            'DOMAIN_ERROR.VALIDATION_ERROR',
            'Document content is not valid JSON (detected during tag extraction)',
            { cause: error instanceof Error ? error : undefined, path: documentPath.value }
          );
        }
      }

      // ★ tags がメタデータから抽出されなかった場合、input.document.tags を使う
      // このロジックは後続のタグ更新処理に統合されたため削除
      // if (hasContent && tags.length === 0) {
      //   logger.debug('Using provided tags (content mode):', { tags: input.document.tags });
      //   tags = (input.document.tags ?? []).map((tag) => Tag.create(tag));
      // }


      await this.globalRepository.initialize();

      const existingDocument = await this.globalRepository.getDocument(documentPath);

      let document: MemoryDocument;

      // ★ hasPatches と hasContent で処理を分岐
      if (hasPatches) {
        // patches を使う場合は既存ドキュメントが必須
        if (!existingDocument) {
          throw new ApplicationError(
            ApplicationErrorCodes.NOT_FOUND,
            `Document not found at path: ${documentPath.value}. Cannot apply patches.`
          );
        }
        try {
          // 既存ドキュメントの内容をJSONとしてパース
          let currentContentObject = JSON.parse(existingDocument.content);
          // ★ パッチ適用前にディープコピーを作成 (元のオブジェクトを変更しないため)
          const contentToPatch = JSON.parse(JSON.stringify(currentContentObject));
          const patches = (input.document as any).patches as rfc6902.Operation[]; // 型アサーション追加

          // ★ パッチ適用前に 'test' 操作を検証
          const testOperations = patches.filter(op => op.op === 'test');
          if (testOperations.length > 0) {
            logger.debug('Validating test operations before applying patch', { path: documentPath.value, testOperations });
            for (const testOp of testOperations) {
              // testOp の型を TestOperation に限定 (value が必須)
              if (testOp.op !== 'test' || testOp.value === undefined) {
                 throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, `Invalid test operation format: ${JSON.stringify(testOp)}`);
              }
              try {
                 // JSON Pointer で値を取得 (簡易実装) - rfc6902 に get がないので自前でやる
                 const pointer = testOp.path;
                 const expectedValue = testOp.value;
                 let actualValue: any = contentToPatch;
                 const parts = pointer.split('/').slice(1); // 先頭の '/' を除き、パスを分割

                 for (const part of parts) {
                    // ~1 を / に、~0 を ~ にデコード
                    const decodedPart = part.replace(/~1/g, '/').replace(/~0/g, '~');
                    if (actualValue && typeof actualValue === 'object' && decodedPart in actualValue) {
                       actualValue = actualValue[decodedPart];
                    } else if (Array.isArray(actualValue) && /^\d+$/.test(decodedPart)) {
                       // 配列インデックスの場合
                       const index = parseInt(decodedPart, 10);
                       if (index >= 0 && index < actualValue.length) {
                          actualValue = actualValue[index];
                       } else {
                          // インデックス範囲外ならパスが存在しない
                          throw new Error(`Path not found at index: ${decodedPart}`);
                       }
                    } else {
                       // パスが存在しない場合、テスト失敗
                       throw new Error(`Path not found: ${pointer}`);
                    }
                 }

                 // 値を比較 (JSON 文字列にして比較するのが確実)
                 if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
                    throw new Error(`Value mismatch at path ${pointer}. Expected: ${JSON.stringify(expectedValue)}, Actual: ${JSON.stringify(actualValue)}`);
                 }
                 logger.debug('Test operation successful:', { testOp });

              } catch (testError) {
                 logger.error('Test operation failed:', { path: documentPath.value, testOp, error: testError });
                 const cause = testError instanceof Error ? testError : undefined;
                 throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, `Patch test operation failed: ${cause?.message ?? 'Test failed'}`, { cause });
              }
            }
            // test 操作がすべて成功した場合のみ次に進む
          }

          // パッチを適用 (test 操作も含む - rfc6902 は test を無視しないはず)
          // ★ パッチ適用直前のオブジェクトとパッチ内容をログ出力 (削除)
          // logger.debug('Applying patches to object:', { path: documentPath.value, contentToPatch, patches });
          // logger.debug('Applying patches:', { path: documentPath.value, patches });
          // ★ applyPatch の返り値も確認するため、一時的に変数に格納 (削除)
          // const applyPatchResult = rfc6902.applyPatch(contentToPatch, patches); // コピーに適用
          rfc6902.applyPatch(contentToPatch, patches); // applyPatch を直接呼び出し (返り値は使わない)
          // ★ パッチ適用後のオブジェクト構造をログ出力 (削除)
          // logger.debug('Object after applying patches (using original object):', { path: documentPath.value, contentToPatch });
          // ★ applyPatch の返り値もログ出力 (削除)
          // logger.debug('Return value of applyPatch:', { path: documentPath.value, applyPatchResult });
          // 整形して保存 (null, 2 でインデント) - 変更されたはずの contentToPatch を使う
          // ★ content 内の metadata.tags も更新する
          const inputTagsRaw = (input.document as any).tags;
          if (inputTagsRaw !== undefined && Array.isArray(inputTagsRaw)) {
            const newTags = inputTagsRaw.map((tag: string) => tag); // 文字列の配列として取得
            logger.debug('Updating metadata.tags in content before stringify', { path: documentPath.value, newTags });
            if (!contentToPatch.metadata) {
              contentToPatch.metadata = {}; // metadata がなければ作成
            }
            contentToPatch.metadata.tags = newTags; // content 内の metadata.tags を更新
          }

          const updatedContentString = JSON.stringify(contentToPatch, null, 2);
          // ドキュメント内容を更新 (lastModified も更新される)
          document = existingDocument.updateContent(updatedContentString);
          // ★ MemoryDocument オブジェクト自体のタグも更新する (リポジトリ層での利用のため)
          if (inputTagsRaw !== undefined && Array.isArray(inputTagsRaw)) {
            const newDomainTags = inputTagsRaw.map((tag: string) => Tag.create(tag));
            logger.debug('Re-applying tags to MemoryDocument object after updateContent', { path: documentPath.value, newTags: newDomainTags.map(t => t.value) });
            document = document.updateTags(newDomainTags); // ★ updateTags を呼び出す
          }
// ★ パッチ適用後の内容をログ出力 (削除)
// logger.debug('Content after applying patches:', { path: documentPath.value, updatedContentString });
// logger.debug('Applied patches successfully', { path: documentPath.value }); // 重複ログ削除

        } catch (error) {
          // ★ キャッチしたエラーの詳細をログ出力 (削除)
          // logger.error('Caught error during patch application:', { path: documentPath.value, errorName: (error instanceof Error ? error.name : typeof error), errorMessage: (error instanceof Error ? error.message : String(error)), errorObject: error });
          logger.error('Failed to apply patches:', { path: documentPath.value, error }); // このログは残す
          // ★ PatchError のチェックを error.name に変更し、error の型チェックを追加
          if (error instanceof Error && error.name === 'PatchError') {
             throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, `Failed to apply patch: ${error.message}`, { cause: error });
          } else if (error instanceof SyntaxError) {
             throw new ApplicationError(ApplicationErrorCodes.INVALID_STATE, `Existing document content is not valid JSON, cannot apply patches: ${documentPath.value}`, { cause: error });
          }
          // その他の予期せぬエラー
          const cause = error instanceof Error ? error : undefined;
          // ★ INTERNAL_ERROR を USE_CASE_EXECUTION_FAILED に変更
          throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `An unexpected error occurred while applying patches: ${cause?.message ?? 'Unknown error'}`, { cause });
        }

      } else if (hasContent) {
        // content を使う場合 (既存のロジック)
        if (existingDocument) {
          // content で上書き (lastModified も更新される)
          document = existingDocument.updateContent(input.document.content!); // !: hasContent=true なので null/undefined ではない
        } else {
          // 新規作成
          document = MemoryDocument.create({
            path: documentPath,
            content: input.document.content!, // !: hasContent=true なので null/undefined ではない
            tags: [], // tags は後で更新するので空で初期化
            lastModified: new Date(), // 新規作成時の時刻
          });
        }
      } else {
        // このケースは入力チェックで弾かれているはずだが念のため
        // ★ INTERNAL_ERROR を USE_CASE_EXECUTION_FAILED に変更
        throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, 'Invalid state: No content or patches provided.');
      }

      // ★ タグの更新ロジックを削除
      // ユースケースレベルでタグを更新しても、リポジトリの saveDocument 後に
      // refreshTagIndex がファイル全体からタグを再生成するため、
      // ここでのタグ更新は意味がない。
      // タグ情報は refreshTagIndex が正しく最新のファイル内容から抽出することを期待する。
      /* // コメントアウト開始
      const inputTagsRaw = (input.document as any).tags;
      if (inputTagsRaw !== undefined && Array.isArray(inputTagsRaw)) {
        const newTags = inputTagsRaw.map((tag: string) => Tag.create(tag));
        logger.debug('Updating tags based on input.document.tags', { path: documentPath.value, newTags: newTags.map(t => t.value) });
        document = MemoryDocument.create({
           path: document.path,
           content: document.content,
           tags: newTags,
           lastModified: document.lastModified
        });
      } else if (hasContent && tags.length > 0) {
         const currentTagValues = document.tags.map(t => t.value).sort();
         const extractedTagValues = tags.map(t => t.value).sort();
         if (JSON.stringify(currentTagValues) !== JSON.stringify(extractedTagValues)) {
            logger.debug('Applying tags extracted from metadata', { path: documentPath.value, tags: extractedTagValues });
            document = MemoryDocument.create({
               path: document.path,
               content: document.content,
               tags: tags,
               lastModified: document.lastModified
            });
         }
      }
      */ // コメントアウト終了

      // ★ saveDocument 直前の document オブジェクトの内容を確認 (削除)
      // logger.debug('Saving document with tags:', { path: document.path.value, tags: document.tags.map(t => t.value), lastModified: document.lastModified });
      await this.globalRepository.saveDocument(document);
      // ★★★ updateTagsIndex の完了を await で待つ ★★★
      await this.globalRepository.updateTagsIndex();

      // --- Return Output ---
      // ★★★ タグ更新が反映された最新のドキュメント情報を再取得 ★★★
      // ★★★ updateTagsIndex の完了を確実に待つために、さらに待機時間を追加 (例: 1000ms) ★★★
      await new Promise(resolve => setTimeout(resolve, 1000));
      const savedDocument = await this.globalRepository.getDocument(documentPath);
      if (!savedDocument) {
         // 保存したはずのドキュメントが見つからないのは異常系
         // ★ INTERNAL_ERROR を USE_CASE_EXECUTION_FAILED に変更
         throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to retrieve the saved document: ${documentPath.value}`);
      }
      // logger.debug('Retrieved saved document for output', { path: savedDocument.path.value, tags: savedDocument.tags.map(t => t.value), lastModified: savedDocument.lastModified }); // デバッグログ削除


      // returnContent フラグ (デフォルトは false) を見てレスポンスを構築
      const shouldReturnContent = input.returnContent === true; // 明示的に true の場合のみ

      const outputDocument: WriteGlobalDocumentOutput['document'] = {
        path: savedDocument.path.value, // ★ savedDocument を使う
        lastModified: savedDocument.lastModified.toISOString(), // ★ savedDocument を使う
        // returnContent が true の場合のみ content と tags を含める
        ...(shouldReturnContent && {
          content: savedDocument.content, // ★ savedDocument を使う
          tags: savedDocument.tags.map((tag) => tag.value), // ★ savedDocument を使う
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
