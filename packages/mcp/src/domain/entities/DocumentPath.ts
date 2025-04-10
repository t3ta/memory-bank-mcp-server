import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';

// Define DocumentType locally to avoid circular dependency with JsonDocument
type DocumentType =
  | 'branch_context'
  | 'active_context'
  | 'progress'
  | 'system_patterns'
  | 'generic';

/**
 * Value object representing a document path
 */
export class DocumentPath {
  private constructor(private readonly _value: string) { }

  /**
   * Factory method to create a new DocumentPath
   * @param value Raw path string
   * @returns DocumentPath instance
   * @throws DomainError if path is invalid
   */
  public static create(value: string): DocumentPath {
    if (!value) {
      throw new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Document path cannot be empty'
      );
    }

    // ★★★ 不正なパス区切り文字チェックを追加 ★★★
    if (value.includes('\\')) {
      throw new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Document path cannot contain backslashes (\\). Use forward slashes (/) instead.'
      );
    }
    const normalizedPath = value; // replace は不要になる

    if (normalizedPath.includes('..')) {
      throw new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Document path cannot contain ".."'
      );
    }
    // ★★★ 無効な文字チェックを追加 ★★★
    const invalidChars = /[<>:"|?*]/; // : はWindowsドライブレターと区別が必要だが、絶対パスは既に弾いている
    if (invalidChars.test(normalizedPath)) {
      throw new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Document path contains invalid characters (<, >, :, ", |, ?, *)'
      );
    }

    if (normalizedPath.startsWith('/') || /^[a-zA-Z]:/.test(normalizedPath)) {
      throw new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Document path cannot be absolute'
      );
    }
    // ★★★ 末尾スラッシュのチェックを追加 ★★★
    if (normalizedPath.endsWith('/')) {
      throw new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Document path cannot end with a slash'
      );
    }

    return new DocumentPath(normalizedPath);
  }

  /**
   * Get the raw path value
   */
  public get value(): string {
    return this._value;
  }

  /**
   * Get the directory part of the path
   */
  public get directory(): string {
    const lastSlashIndex = this._value.lastIndexOf('/');
    return lastSlashIndex === -1 ? '' : this._value.substring(0, lastSlashIndex);
  }

  /**
   * Get the filename part of the path
   */
  public get filename(): string {
    const lastSlashIndex = this._value.lastIndexOf('/');
    return lastSlashIndex === -1 ? this._value : this._value.substring(lastSlashIndex + 1);
  }

  /**
   * Get the extension part of the path
   */
  public get extension(): string {
    const filename = this.filename;
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : filename.substring(lastDotIndex + 1);
  }

  /**
   * Check if this document is a JSON file
   */
  public get isJSON(): boolean {
    return this.extension.toLowerCase() === 'json';
  }


  /**
   * Checks if two DocumentPath instances are equal
   * @param other Other DocumentPath instance to compare with
   * @returns true if both paths have the same value
   */
  public equals(other: DocumentPath | null | undefined): boolean { // Allow null/undefined check
    if (!other) { // Check if other is null or undefined
        return false;
    }
    return this._value === other._value;
  }

  /**
   * Convert to string
   * @returns Raw path value
   */
  public toString(): string {
    return this._value;
  }

  /**
   * Get the basename (filename without extension)
   */
  public get basename(): string {
    const filename = this.filename;
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? filename : filename.substring(0, lastDotIndex);
  }

  public inferDocumentType(): DocumentType {
    const lcBasename = this.basename.toLowerCase();

    if (lcBasename.includes('branchcontext') || lcBasename.includes('branch-context')) {
      return 'branch_context';
    } else if (lcBasename.includes('activecontext') || lcBasename.includes('active-context')) {
      return 'active_context';
    } else if (lcBasename.includes('progress')) {
      return 'progress';
    } else if (lcBasename.includes('systempatterns') || lcBasename.includes('system-patterns')) {
      return 'system_patterns';
    } else {
      return 'generic';
    }
  }

  /**
   * Create a new path with different extension
   * @param newExtension New extension (without dot)
   * @returns New DocumentPath instance
   */
  public withExtension(newExtension: string): DocumentPath {
    if (!newExtension) {
      throw new DomainError(DomainErrorCodes.INVALID_DOCUMENT_PATH, 'Extension cannot be empty');
    }

    const directory = this.directory;
    const basename = this.basename;
    const newPath = directory
      ? `${directory}/${basename}.${newExtension}`
      : `${basename}.${newExtension}`;

    return DocumentPath.create(newPath);
  }

  /**
   * Get the path in the alternate format (.md <-> .json conversion)
   * @returns DocumentPath in the alternate format
   */
  public toAlternateFormat(): DocumentPath {
    if (this.extension.toLowerCase() === 'md') {
      return this.withExtension('json');
    } else if (this.extension.toLowerCase() === 'json') {
      return this.withExtension('md');
    }

    // If not a convertible format, clone the original path
    return DocumentPath.create(this._value);
  }

  /**
   * Create a clone of the current DocumentPath
   * @returns A new DocumentPath with the same path value
   */
  public clone(): DocumentPath {
    return DocumentPath.create(this._value);
  }
}
