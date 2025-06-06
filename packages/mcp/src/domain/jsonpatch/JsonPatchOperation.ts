// Import Operation type from rfc6902 for the adapter method
import { Operation as Rfc6902Operation } from 'rfc6902';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import { JsonPath } from './JsonPath.js';

// Definition of operation types
export type JsonPatchOperationType = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';

/**
 * Class encapsulating a JSON Patch operation
 * Implementation of JSON Patch operations compliant with RFC 6902
 */
export class JsonPatchOperation {
  private readonly _op: JsonPatchOperationType;
  private readonly _path: JsonPath;
  private readonly _value?: any;
  private readonly _from?: JsonPath;

  /**
   * Constructor - Do not use directly, use the static factory method instead
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
   * Create a patch operation object
   * @param op Operation type
   * @param path Target path
   * @param value Value to set (required for add/replace/test)
   * @param from Source path (required for move/copy)
   * @returns New JsonPatchOperation instance
   * @throws DomainError if operation type is invalid or required parameters are missing
   */
  static create(
    op: JsonPatchOperationType,
    path: string,
    value?: any,
    from?: string
  ): JsonPatchOperation {
    // Validate operation type
    const validOps: JsonPatchOperationType[] = ['add', 'remove', 'replace', 'move', 'copy', 'test'];
    if (!validOps.includes(op)) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        `Invalid operation type: '${op}'`
      );
    }

    // Validate and parse path
    if (path === undefined || path === null) { // path の存在チェックを追加
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        `Operation of type '${op}' requires 'path'`
      );
    }
    const jsonPath = JsonPath.parse(path);

    // Parse 'from' if specified
    const jsonFrom = from ? JsonPath.parse(from) : undefined;

    // Operation type specific validation
    // add, replace, test require value
    if (['add', 'replace', 'test'].includes(op) && value === undefined) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        `Operation of type '${op}' requires 'value'`
      );
    }

    // move, copy require from
    if (['move', 'copy'].includes(op) && !from) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        `Operation of type '${op}' requires 'from'`
      );
    }

    // 操作タイプに応じて不要な引数をクリア
    let finalValue = value;
    let finalFrom = jsonFrom;

    if (op === 'remove') {
      finalValue = undefined;
      finalFrom = undefined;
    } else if (['add', 'replace', 'test'].includes(op)) {
      finalFrom = undefined;
    } else if (['move', 'copy'].includes(op)) {
      finalValue = undefined;
    }

    // Create instance with potentially cleared arguments
    return new JsonPatchOperation(op, jsonPath, finalValue, finalFrom);
  }

  /**
   * Create a patch operation object from a JSON representation
   * @param json JSON string or already parsed object
   * @returns New JsonPatchOperation instance
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
   * Get the operation type
   */
  get op(): JsonPatchOperationType {
    return this._op;
  }

  /**
   * Get the target path
   */
  get path(): JsonPath {
    return this._path;
  }

  /**
   * Get the value
   */
  get value(): any {
    return this._value;
  }

  /**
   * Get the source path
   */
  get from(): JsonPath | undefined {
    return this._from;
  }

  /**
   * Validate the operation's validity
   * @throws DomainError if the operation is invalid
   */
  validate(): void {
    // For 'move', cannot move to a descendant of the source path
    if (this._op === 'move' && this._from && this._path.toString().startsWith(this._from.toString() + '/')) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        'Cannot move to a path that is a child of the source path'
      );
    }
  }

  /**
   * Convert to JSON representation
   * @returns JSON-serializable object
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
   * Convert to rfc6902 format operation object
   * @returns rfc6902 compatible object
   */
  toRfc6902Operation(): Rfc6902Operation {
    // toJSON() already returns an object that is compatible with rfc6902 Operation
    return this.toJSON() as Rfc6902Operation;
  }
  
  /**
   * @deprecated Use toRfc6902Operation instead
   * Legacy adapter method - kept for compatibility with existing code
   */
  toFastJsonPatchOperation(): any {
    // Just delegates to toJSON for backward compatibility
    return this.toJSON();
  }
}
