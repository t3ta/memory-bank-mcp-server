import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';

// DocumentType without importing JsonDocument to avoid circular dependency
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

  /**
   * Get the basename (filename without extension)
   */
  public get basename(): string {
    const filename = this.filename;
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? filename : filename.substring(0, lastDotIndex);
  }

  /**
   * Infer document type from filename
   * @returns Inferred document type or 'generic' if cannot determine
   */
  public inferDocumentType(): DocumentType {
    const lcFilename = this.filename.toLowerCase();
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
   * Create a corresponding JSON path for a markdown path and vice versa
   * @returns New DocumentPath with converted extension
   */
  public toAlternateFormat(): DocumentPath {
    if (this.isMarkdown) {
      return this.withExtension('json');
    } else if (this.isJSON) {
      return this.withExtension('md');
    } else {
      // No conversion for other file types
      return this;
    }
  }
}
