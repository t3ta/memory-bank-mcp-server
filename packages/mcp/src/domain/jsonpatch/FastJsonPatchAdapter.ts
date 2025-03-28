// ESモジュールとして明示的にインポート - より厳格なESM方式
import * as jsonpatchNs from 'fast-json-patch';
// 全ての環境で動作するようにデフォルトエクスポートを確実に取得
const jsonpatch = (jsonpatchNs.default === undefined) ? jsonpatchNs : jsonpatchNs.default;
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import { JsonPatchOperation } from './JsonPatchOperation.js';
import { JsonPatchService } from './JsonPatchService.js';

/**
 * fast-json-patchライブラリと統合するためのアダプタークラス
 * JsonPatchServiceインターフェースを実装
 */
export class FastJsonPatchAdapter implements JsonPatchService {
  private readonly options?: any;

  /**
   * コンストラクタ
   * @param options fast-json-patchライブラリのオプション
   */
  constructor(options?: any) {
    this.options = options;
  }

  /**
   * JsonPatchServiceインターフェースのapplyメソッド実装
   * @param document 対象のドキュメント
   * @param operations 適用する操作の配列
   * @returns 操作適用後の新しいドキュメント
   */
  apply(document: any, operations: JsonPatchOperation[]): any {
    return this.applyPatch(document, operations);
  }

  /**
   * JsonPatchServiceインターフェースのvalidateメソッド実装
   * @param document 対象のドキュメント
   * @param operations 検証する操作の配列
   * @returns 操作が有効な場合はtrue、無効な場合はfalse
   */
  validate(document: any, operations: JsonPatchOperation[]): boolean {
    const libOps = this.convertOperations(operations);
    const result = jsonpatch.validate(libOps, document);
    return result === undefined;
  }

  /**
   * JsonPatchServiceインターフェースのgeneratePatchメソッド実装
   * @param source 元のドキュメント
   * @param target 目標のドキュメント
   * @returns 元から目標に変換するために必要なパッチ操作の配列
   */
  generatePatch(source: any, target: any): JsonPatchOperation[] {
    return this.compareDocuments(source, target);
  }

  /**
   * ドキュメントにパッチ操作を適用する
   * @param document 対象のドキュメント
   * @param operations 適用する操作の配列
   * @returns 操作適用後の新しいドキュメント
   * @throws DomainError 操作適用中にエラーが発生した場合
   */
  applyPatch(document: any, operations: JsonPatchOperation[]): any {
    try {
      // 操作をライブラリ形式に変換
      const libOps = this.convertOperations(operations);

      // 操作を適用
      const result = jsonpatch.applyPatch(document, libOps, this.options);

      // fast-json-patchはデフォルトでdocumentを変更するが、
      // ここでは新しいオブジェクトを返す（不変性の確保）
      return result.newDocument;
    } catch (error) {
      // エラーをドメイン固有のエラーに変換して投げる
      // (handleLibraryErrorは必ずthrowするので戻ってこない)
      this.handleLibraryError(error);
    }
  }

  /**
   * パッチ操作の妥当性を検証し、エラー情報を含むレポートを返す
   * @param document 対象のドキュメント
   * @param operations 検証する操作の配列
   * @returns エラー情報の配列（問題がなければ空配列）
   */
  validateWithErrors(document: any, operations: JsonPatchOperation[]): any[] {
    const libOps = this.convertOperations(operations);
    const result = jsonpatch.validate(libOps, document);

    if (result === undefined) {
      return [];
    }

    return Array.isArray(result) ? result : [result];
  }

  /**
   * 2つのドキュメント間の差分をパッチ操作として取得する
   * @param document1 元のドキュメント
   * @param document2 目標のドキュメント
   * @returns 差分を表すJsonPatchOperation配列
   */
  compareDocuments(document1: any, document2: any): JsonPatchOperation[] {
    const diff = jsonpatch.compare(document1, document2);
    return diff.map(op => this.convertFromLibraryOperation(op));
  }

  /**
   * JsonPatchOperationをfast-json-patch形式に変換する
   * @param operation 変換するJsonPatchOperation
   * @returns fast-json-patch形式の操作オブジェクト
   */
  convertOperation(operation: JsonPatchOperation): any {
    return operation.toFastJsonPatchOperation();
  }

  /**
   * 複数のJsonPatchOperationをfast-json-patch形式に変換する
   * @param operations 変換するJsonPatchOperation配列
   * @returns fast-json-patch形式の操作オブジェクト配列
   */
  convertOperations(operations: JsonPatchOperation[]): any[] {
    return operations.map(op => this.convertOperation(op));
  }

  /**
   * fast-json-patch形式の操作からJsonPatchOperationを生成する
   * @param libOp fast-json-patch形式の操作
   * @returns 新しいJsonPatchOperationインスタンス
   */
  convertFromLibraryOperation(libOp: any): JsonPatchOperation {
    return JsonPatchOperation.create(
      libOp.op,
      libOp.path,
      libOp.value,
      libOp.from
    );
  }

  /**
   * ライブラリのエラーをドメイン固有のエラーに変換する
   * @param error 発生したエラー
   * @throws DomainError 変換されたドメインエラー
   */
  private handleLibraryError(error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // エラーメッセージに基づいて適切なエラータイプに変換
    if (message.includes('Path not found')) {
      throw new DomainError(
        DomainErrorCodes.PATH_NOT_FOUND,
        `Path not found: ${message}`
      );
    }

    if (message.includes('Test failed')) {
      throw new DomainError(
        DomainErrorCodes.TEST_FAILED,
        `Test failed: ${message}`
      );
    }

    // その他のエラー
    throw new DomainError(
      DomainErrorCodes.JSON_PATCH_FAILED,
      `JSON patch operation failed: ${message}`
    );
  }
}
