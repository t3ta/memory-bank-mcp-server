import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import { JsonPath } from './JsonPath.js';

// 操作タイプの定義
export type JsonPatchOperationType = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';

/**
 * JSON Patch操作をカプセル化するクラス
 * RFC 6902に準拠したJSON Patch操作の実装
 */
export class JsonPatchOperation {
  private readonly _op: JsonPatchOperationType;
  private readonly _path: JsonPath;
  private readonly _value?: any;
  private readonly _from?: JsonPath;

  /**
   * コンストラクタ - 直接使用せず、静的ファクトリメソッドを使用してください
   */
  private constructor(
    op: JsonPatchOperationType,
    path: JsonPath,
    value?: any,
    from?: JsonPath
  ) {
    this._op = op;
    this._path = path;
    this._value = value;
    this._from = from;
  }

  /**
   * パッチ操作オブジェクトを生成する
   * @param op 操作タイプ
   * @param path 対象パス
   * @param value 設定する値（add/replace/testで必須）
   * @param from 移動元パス（move/copyで必須）
   * @returns 新しいJsonPatchOperationインスタンス
   * @throws DomainError 操作タイプが無効または必須パラメータが欠けている場合
   */
  static create(
    op: JsonPatchOperationType,
    path: string,
    value?: any,
    from?: string
  ): JsonPatchOperation {
    // 操作タイプの検証
    const validOps: JsonPatchOperationType[] = ['add', 'remove', 'replace', 'move', 'copy', 'test'];
    if (!validOps.includes(op)) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        `Invalid operation type: '${op}'`
      );
    }

    // パスの解析
    const jsonPath = JsonPath.parse(path);
    
    // fromの解析（指定されている場合）
    const jsonFrom = from ? JsonPath.parse(from) : undefined;

    // 操作タイプ固有のバリデーション
    // add, replace, testはvalueが必須
    if (['add', 'replace', 'test'].includes(op) && value === undefined) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        `Operation of type '${op}' requires 'value'`
      );
    }

    // move, copyはfromが必須
    if (['move', 'copy'].includes(op) && !from) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        `Operation of type '${op}' requires 'from'`
      );
    }

    // インスタンス生成
    return new JsonPatchOperation(op, jsonPath, value, jsonFrom);
  }

  /**
   * JSON表現からパッチ操作オブジェクトを生成する
   * @param json JSON文字列または既にパースされたオブジェクト
   * @returns 新しいJsonPatchOperationインスタンス
   */
  static fromJSON(json: string | any): JsonPatchOperation {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    return JsonPatchOperation.create(
      obj.op as JsonPatchOperationType,
      obj.path,
      obj.value,
      obj.from
    );
  }

  /**
   * 操作タイプを取得
   */
  get op(): JsonPatchOperationType {
    return this._op;
  }

  /**
   * 対象パスを取得
   */
  get path(): JsonPath {
    return this._path;
  }

  /**
   * 設定値を取得
   */
  get value(): any {
    return this._value;
  }

  /**
   * 移動元パスを取得
   */
  get from(): JsonPath | undefined {
    return this._from;
  }

  /**
   * 操作の妥当性を検証する
   * @throws DomainError 操作が無効な場合
   */
  validate(): void {
    // moveの場合、自身の子孫への移動は不可
    if (this._op === 'move' && this._from && this._path.toString().startsWith(this._from.toString() + '/')) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        'Cannot move to a path that is a child of the source path'
      );
    }
  }

  /**
   * JSON表現に変換する
   * @returns JSON変換可能なオブジェクト
   */
  toJSON(): any {
    const result: any = {
      op: this._op,
      path: this._path.toString(),
    };

    if (this._value !== undefined) {
      result.value = this._value;
    }

    if (this._from) {
      result.from = this._from.toString();
    }

    return result;
  }

  /**
   * fast-json-patch形式の操作オブジェクトに変換する
   * @returns fast-json-patch互換のオブジェクト
   */
  toFastJsonPatchOperation(): any {
    return this.toJSON();
  }
}