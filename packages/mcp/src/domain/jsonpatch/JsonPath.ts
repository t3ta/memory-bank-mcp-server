import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';

/**
 * JSON Patchで使用されるパス表現をカプセル化するクラス
 * RFC 6901に準拠したJSON Pointer実装
 */
export class JsonPath {
  private readonly _path: string;
  private readonly _segments: string[];

  /**
   * コンストラクタ - 直接使用せず、静的ファクトリメソッドを使用してください
   */
  private constructor(path: string, segments: string[]) {
    this._path = path;
    this._segments = segments;
  }

  /**
   * パス文字列からJsonPathオブジェクトを生成する
   * @param path JSON Pointerパス文字列（例: '/a/b/c'）
   * @returns 新しいJsonPathインスタンス
   * @throws DomainError パスが無効な場合
   */
  static parse(path: string): JsonPath {
    if (!path) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATH,
        'Invalid JSON path: path cannot be empty'
      );
    }

    if (!path.startsWith('/')) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATH,
        'Invalid JSON path: must start with \'/\''
      );
    }

    // 先頭のスラッシュを除去して分割
    const rawSegments = path === '/' ? [''] : path.substring(1).split('/');
    const segments: string[] = [];

    // 各セグメントのエスケープシーケンスを処理
    for (const segment of rawSegments) {
      let i = 0;
      let result = '';

      while (i < segment.length) {
        if (segment[i] === '~') {
          if (i + 1 >= segment.length) {
            throw new DomainError(
              DomainErrorCodes.INVALID_JSON_PATH,
              'Invalid JSON path: incomplete escape sequence'
            );
          }

          if (segment[i + 1] === '0') {
            result += '~';
          } else if (segment[i + 1] === '1') {
            result += '/';
          } else {
            throw new DomainError(
              DomainErrorCodes.INVALID_JSON_PATH,
              'Invalid JSON path: invalid escape sequence'
            );
          }
          i += 2;
        } else {
          result += segment[i];
          i += 1;
        }
      }

      segments.push(result);
    }

    return new JsonPath(path, segments);
  }

  /**
   * ルートパスを生成する
   * @returns ルートパスを表すJsonPathインスタンス
   */
  static root(): JsonPath {
    return new JsonPath('/', ['']);
  }

  /**
   * セグメント配列からJsonPathオブジェクトを生成する
   * @param segments パスセグメントの配列
   * @returns 新しいJsonPathインスタンス
   */
  static fromSegments(segments: string[]): JsonPath {
    const escapedSegments = segments.map(segment => JsonPath.escapeSegment(segment));
    const path = '/' + escapedSegments.join('/');
    return new JsonPath(path, [...segments]);
  }

  /**
   * パスセグメントをエスケープする
   * @param segment エスケープするセグメント
   * @returns エスケープされたセグメント
   */
  static escapeSegment(segment: string): string {
    return segment.replace(/~/g, '~0').replace(/\//g, '~1');
  }

  /**
   * エスケープされたパスセグメントを元に戻す
   * @param segment エスケープされたセグメント
   * @returns 元のセグメント
   */
  static unescapeSegment(segment: string): string {
    return segment.replace(/~1/g, '/').replace(/~0/g, '~');
  }

  /**
   * パス文字列を取得
   */
  get path(): string {
    return this._path;
  }

  /**
   * パスセグメントの配列を取得
   */
  get segments(): readonly string[] {
    return this._segments;
  }

  /**
   * パスがルートかどうかを判定
   * @returns ルートパスの場合はtrue
   */
  isRoot(): boolean {
    return this._path === '/';
  }

  /**
   * 親パスを取得
   * @returns 親パスを表すJsonPathインスタンス
   * @throws DomainError ルートパスに対して呼び出された場合
   */
  parent(): JsonPath {
    if (this.isRoot()) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATH,
        'Root path has no parent'
      );
    }

    const parentSegments = this._segments.slice(0, -1);
    return JsonPath.fromSegments(parentSegments);
  }

  /**
   * パスの最後のセグメントを取得
   * @returns 最後のセグメント
   */
  lastSegment(): string {
    return this._segments[this._segments.length - 1];
  }

  /**
   * 子パスを生成
   * @param childSegment 子セグメント
   * @returns 新しいJsonPathインスタンス
   */
  child(childSegment: string): JsonPath {
    const newSegments = [...this._segments, childSegment];
    return JsonPath.fromSegments(newSegments);
  }

  /**
   * 配列要素のパスかどうかを判定
   * @returns 配列要素を指すパスの場合はtrue
   */
  isArrayElement(): boolean {
    const lastSegment = this.lastSegment();
    return lastSegment === '-' || /^\d+$/.test(lastSegment);
  }

  /**
   * 配列末尾追加のパスかどうかを判定
   * @returns 配列末尾追加を指すパスの場合はtrue
   */
  isArrayAppend(): boolean {
    return this.lastSegment() === '-';
  }

  /**
   * パスの等価性を判断
   * @param other 比較対象のJsonPath
   * @returns 等価の場合はtrue
   */
  equals(other: JsonPath): boolean {
    return this._path === other._path;
  }

  /**
   * 文字列表現を取得
   * @returns パス文字列
   */
  toString(): string {
    return this._path;
  }
}
