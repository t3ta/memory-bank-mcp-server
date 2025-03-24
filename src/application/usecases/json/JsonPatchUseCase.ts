import { JsonDocumentRepository } from '../../../domain/repositories/JsonDocumentRepository.js';
import { JsonPatchOperation } from '../../../domain/jsonpatch/JsonPatchOperation.js';
import { JsonPatchService } from '../../../domain/jsonpatch/JsonPatchService.js';
import { FastJsonPatchAdapter } from '../../../domain/jsonpatch/FastJsonPatchAdapter.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import { JsonDocument } from '../../../domain/entities/JsonDocument.js';
import { DocumentVersionInfo } from '../../../domain/entities/DocumentVersionInfo.js';
import { DocumentEventEmitter } from '../../../domain/events/DocumentEventEmitter.js';
import { EventType } from '../../../domain/events/EventType.js';

/**
 * JSON Patchを使用してドキュメントを部分的に更新するユースケース
 */
export class JsonPatchUseCase {
  private readonly repository: JsonDocumentRepository;
  private readonly patchService: JsonPatchService;
  private readonly eventEmitter: DocumentEventEmitter;

  /**
   * コンストラクタ
   * @param repository JSONドキュメントリポジトリ
   * @param eventEmitter ドキュメントイベントエミッタ
   * @param patchService JsonPatchService（省略時はFastJsonPatchAdapterを使用）
   */
  constructor(
    repository: JsonDocumentRepository,
    eventEmitter: DocumentEventEmitter,
    patchService?: JsonPatchService
  ) {
    this.repository = repository;
    this.eventEmitter = eventEmitter;
    this.patchService = patchService ?? new FastJsonPatchAdapter();
  }

  /**
   * ドキュメントにパッチ操作を適用する
   * @param path ドキュメントパス
   * @param branch ブランチ名（指定時はブランチメモリバンク、未指定時はグローバルメモリバンク）
   * @param operations 適用するパッチ操作の配列
   * @param updateReason 更新理由（省略可）
   * @returns 更新されたJSONドキュメント
   * @throws DomainError ドキュメントが見つからない、操作が無効、その他のエラー
   */
  async execute(
    path: string,
    operations: JsonPatchOperation[],
    branch?: string,
    updateReason?: string
  ): Promise<JsonDocument> {
    // ドキュメントの取得
    const document = await this.getDocument(path, branch);
    if (!document) {
      throw new DomainError(
        DomainErrorCodes.DOCUMENT_NOT_FOUND,
        `Document not found: ${path}${branch ? ` in branch ${branch}` : ''}`
      );
    }

    // パッチ操作のバリデーション
    const isValid = this.patchService.validate(document.content, operations);
    if (!isValid) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        'Invalid JSON patch operation'
      );
    }

    // パッチ操作の適用
    const updatedContent = this.patchService.apply(document.content, operations);

    // 新しいドキュメントバージョンの作成
    const updatedVersionInfo = new DocumentVersionInfo({
      version: document.versionInfo.version + 1,
      lastModified: new Date(),
      modifiedBy: 'system',
      updateReason: updateReason || 'Updated via JSON Patch'
    });

    // 更新されたドキュメントの作成
    const updatedDocument = new JsonDocument({
      path: document.path,
      branch: document.branch,
      content: updatedContent,
      versionInfo: updatedVersionInfo
    });

    // ドキュメントの保存
    const savedDocument = await this.saveDocument(updatedDocument);

    // 更新イベントの発行
    this.eventEmitter.emit(EventType.DOCUMENT_UPDATED, {
      path: savedDocument.path,
      branch: savedDocument.branch,
      versionInfo: savedDocument.versionInfo
    });

    return savedDocument;
  }

  /**
   * 複数のパッチ操作をアトミックに適用する
   * @param path ドキュメントパス
   * @param operations 適用するパッチ操作の配列
   * @param branch ブランチ名（指定時はブランチメモリバンク、未指定時はグローバルメモリバンク）
   * @param updateReason 更新理由（省略可）
   * @returns 更新されたJSONドキュメント
   * @throws DomainError ドキュメントが見つからない、操作が無効、その他のエラー
   */
  async executeBatch(
    path: string,
    operations: JsonPatchOperation[],
    branch?: string,
    updateReason?: string
  ): Promise<JsonDocument> {
    // 通常のexecuteメソッドを使用（すでにアトミック性を保証している）
    return this.execute(path, operations, branch, updateReason || 'Batch update via JSON Patch');
  }

  /**
   * 2つのドキュメント間の差分をパッチ操作として生成する
   * @param sourcePath 元のドキュメントのパス
   * @param targetPath 目標のドキュメントのパス
   * @param sourceBranch 元のドキュメントのブランチ（省略可）
   * @param targetBranch 目標のドキュメントのブランチ（省略可）
   * @returns 生成されたパッチ操作の配列
   * @throws DomainError ドキュメントが見つからない場合
   */
  async generatePatch(
    sourcePath: string,
    targetPath: string,
    sourceBranch?: string,
    targetBranch?: string
  ): Promise<JsonPatchOperation[]> {
    // 元ドキュメントの取得
    const sourceDocument = await this.getDocument(sourcePath, sourceBranch);
    if (!sourceDocument) {
      throw new DomainError(
        DomainErrorCodes.DOCUMENT_NOT_FOUND,
        `Source document not found: ${sourcePath}${sourceBranch ? ` in branch ${sourceBranch}` : ''}`
      );
    }

    // 目標ドキュメントの取得
    const targetDocument = await this.getDocument(targetPath, targetBranch);
    if (!targetDocument) {
      throw new DomainError(
        DomainErrorCodes.DOCUMENT_NOT_FOUND,
        `Target document not found: ${targetPath}${targetBranch ? ` in branch ${targetBranch}` : ''}`
      );
    }

    // パッチ操作の生成
    return this.patchService.generatePatch(sourceDocument.content, targetDocument.content);
  }

  /**
   * テスト条件を検証してからパッチ操作を適用する
   * @param path ドキュメントパス
   * @param operations テスト操作と更新操作を含む配列
   * @param branch ブランチ名（指定時はブランチメモリバンク、未指定時はグローバルメモリバンク）
   * @param updateReason 更新理由（省略可）
   * @returns 更新されたJSONドキュメント
   * @throws DomainError ドキュメントが見つからない、テストが失敗、操作が無効、その他のエラー
   */
  async executeConditional(
    path: string,
    operations: JsonPatchOperation[],
    branch?: string,
    updateReason?: string
  ): Promise<JsonDocument> {
    // executeメソッドを使用（テスト失敗時はpatchServiceのapplyメソッドが例外を投げる）
    return this.execute(
      path,
      operations,
      branch,
      updateReason || 'Conditional update via JSON Patch'
    );
  }

  /**
   * ドキュメントを取得する（ブランチ指定の有無に応じて適切なリポジトリメソッドを使用）
   * @param path ドキュメントパス
   * @param branch ブランチ名（省略可）
   * @returns JSONドキュメントまたはnull（見つからない場合）
   */
  private async getDocument(path: string, branch?: string): Promise<JsonDocument | null> {
    return branch
      ? await this.repository.findBranchDocument(path, branch)
      : await this.repository.findGlobalDocument(path);
  }

  /**
   * ドキュメントを保存する（ブランチ指定の有無に応じて適切なリポジトリメソッドを使用）
   * @param document 保存するドキュメント
   * @returns 保存されたドキュメント
   */
  private async saveDocument(document: JsonDocument): Promise<JsonDocument> {
    return document.branch
      ? await this.repository.saveBranchDocument(document)
      : await this.repository.saveGlobalDocument(document);
  }
}
