import { JsonPatchOperation } from './JsonPatchOperation.js';

/**
 * JSON Patch操作を適用するためのサービスインターフェース
 */
export interface JsonPatchService {
  /**
   * ドキュメントにパッチ操作を適用する
   * @param document 対象のドキュメント
   * @param operations 適用する操作の配列
   * @returns 操作適用後の新しいドキュメント
   */
  apply(document: any, operations: JsonPatchOperation[]): any;

  /**
   * パッチ操作の妥当性を検証する
   * @param document 対象のドキュメント
   * @param operations 検証する操作の配列
   * @returns 操作が有効な場合はtrue、無効な場合はfalse
   */
  validate(document: any, operations: JsonPatchOperation[]): boolean;

  /**
   * 2つのドキュメント間のパッチ操作を生成する
   * @param source 元のドキュメント
   * @param target 目標のドキュメント
   * @returns 元から目標に変換するために必要なパッチ操作の配列
   */
  generatePatch(source: any, target: any): JsonPatchOperation[];
}
