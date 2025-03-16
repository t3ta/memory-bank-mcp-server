import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';

/**
 * Value object representing a document path
 */
export class DocumentPath {
  private constructor(private readonly _value: string) {}

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

    // Normalize and validate path
    const normalizedPath = value.replace(/\\/g, '/');

    // Check for invalid path patterns
    if (normalizedPath.includes('..')) {
      throw new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Document path cannot contain ".."'
      );
    }

    // Check for absolute paths starting with / or drive letter
    if (normalizedPath.startsWith('/') || /^[a-zA-Z]:/.test(normalizedPath)) {
      throw new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Document path cannot be absolute'
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
   * Check if this document is a markdown file
   */
  public get isMarkdown(): boolean {
    return this.extension.toLowerCase() === 'md';
  }

  /**
   * Check if this document is a JSON file
   */
  public get isJSON(): boolean {
    return this.extension.toLowerCase() === 'json';
  }

  /**
   * Checks if two DocumentPath instances are equal
   * @param other Another DocumentPath instance
   * @returns boolean indicating equality
   */
  public equals(other: DocumentPath): boolean {
    return this._value === other._value;
  }

  /**
   * Convert to string
   * @returns Raw path value
   */
  public toString(): string {
    return this._value;
  }
}
