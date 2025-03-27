import { DocumentId } from './DocumentId.js';
import { DocumentPath } from './DocumentPath.js';
import { Tag } from './Tag.js';
import { DocumentVersionInfo } from './DocumentVersionInfo.js';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';

// Schema imports - these define validation and structure
import {
  SCHEMA_VERSION,
  BaseJsonDocumentV2Schema,
  BaseJsonDocumentV2,
  BranchContextJsonV2Schema,
  ActiveContextJsonV2Schema,
  ProgressJsonV2Schema,
  SystemPatternsJsonV2Schema,
} from '@memory-bank/schemas';

/**
 * Type discriminator for document types
 */
export type DocumentType =
  | 'branch_context'
  | 'active_context'
  | 'progress'
  | 'system_patterns'
  | 'generic';

/**
 * JsonDocument entity represents a structured document stored in JSON format
 * It uses the v2 schema with typed content based on document type
 */
export class JsonDocument<T extends Record<string, unknown> = Record<string, unknown>> {
  private constructor(
    private readonly _id: DocumentId,
    private readonly _path: DocumentPath,
    private readonly _title: string,
    private readonly _documentType: DocumentType,
    private readonly _tags: Tag[],
    private readonly _content: T,
    private readonly _branch?: string,
    private readonly _versionInfo: DocumentVersionInfo = new DocumentVersionInfo({ version: 1 })
  ) { }

  /**
   * Parse a JSON string into a JsonDocument
   * @param jsonString Raw JSON string
   * @param path Document path
   * @returns JsonDocument instance
   * @throws DomainError if parsing fails or validation fails
   */
  public static fromString(jsonString: string, path: DocumentPath): JsonDocument {
    try {
      const jsonData = JSON.parse(jsonString);
      return JsonDocument.fromObject(jsonData, path);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Failed to parse JSON document: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create a JsonDocument from a parsed JSON object
   * @param jsonData Parsed JSON object
   * @param path Document path
   * @returns JsonDocument instance
   * @throws DomainError if validation fails
   */
  public static fromObject(jsonData: unknown, path: DocumentPath): JsonDocument {
    // First validate against base schema
    try {
      BaseJsonDocumentV2Schema.parse(jsonData);
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid JSON document structure: ${(error as Error).message}`
      );
    }

    const baseDocument = jsonData as BaseJsonDocumentV2;
    const metadata = baseDocument.metadata;
    const documentType = metadata.documentType as DocumentType;

    // Then validate against specific document type schema
    try {
      switch (documentType) {
        case 'branch_context':
          BranchContextJsonV2Schema.parse(jsonData);
          break;
        case 'active_context':
          ActiveContextJsonV2Schema.parse(jsonData);
          break;
        case 'progress':
          ProgressJsonV2Schema.parse(jsonData);
          break;
        case 'system_patterns':
          SystemPatternsJsonV2Schema.parse(jsonData);
          break;
        default:
          BaseJsonDocumentV2Schema.parse(jsonData);
          break;
      }
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid ${documentType} document: ${(error as Error).message}`
      );
    }

    // Create domain objects
    const id = DocumentId.create(metadata.id);
    const tags = metadata.tags.map((tag) => Tag.create(tag));
    const lastModified = new Date(metadata.lastModified);
    const createdAt = new Date(metadata.createdAt);

    // Create version info
    const versionInfo = new DocumentVersionInfo({
      version: metadata.version || 1,
      lastModified: lastModified,
      modifiedBy: 'system',
    });

    // Check for branch field in metadata
    const branch = (metadata as any).branch;

    return new JsonDocument(
      id,
      path,
      metadata.title,
      documentType,
      tags,
      baseDocument.content,
      branch,
      versionInfo
    );
  }

  /**
   * Create a new JsonDocument with given values
   * @param params Document creation parameters
   * @returns JsonDocument instance
   */
  public static create<T extends Record<string, unknown> = Record<string, unknown>>({
    id = DocumentId.generate(),
    path,
    title,
    documentType,
    tags = [],
    content,
    branch,
    versionInfo,
  }: {
    id?: DocumentId;
    path: DocumentPath;
    title: string;
    documentType: DocumentType;
    tags?: Tag[];
    content: T;
    branch?: string;
    versionInfo?: DocumentVersionInfo;
  }): JsonDocument<T> {
    // Validate content based on document type
    try {
      switch (documentType) {
        case 'branch_context':
          BranchContextJsonV2Schema.shape.content.parse(content);
          break;
        case 'active_context':
          ActiveContextJsonV2Schema.shape.content.parse(content);
          break;
        case 'progress':
          ProgressJsonV2Schema.shape.content.parse(content);
          break;
        case 'system_patterns':
          SystemPatternsJsonV2Schema.shape.content.parse(content);
          break;
        default:
          // For generic types, ensure content is not empty
          if (Object.keys(content).length === 0) {
            throw new Error('Content cannot be empty');
          }
          break;
      }
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid content for ${documentType} document: ${(error as Error).message}`
      );
    }

    return new JsonDocument<T>(
      id,
      path,
      title,
      documentType,
      [...tags], // Defensive copy
      content,
      branch,
      versionInfo
    );
  }

  /**
   * Get the document ID
   */
  public get id(): DocumentId {
    return this._id;
  }

  /**
   * Get the document path
   */
  public get path(): DocumentPath {
    return this._path;
  }

  /**
   * Get the document title
   */
  public get title(): string {
    return this._title;
  }

  /**
   * Get the document type
   */
  public get documentType(): DocumentType {
    return this._documentType;
  }
  
  /**
   * Set the document type (internal use only for testing)
   */
  public set documentType(type: DocumentType) {
    (this as any)._documentType = type;
  }

  /**
   * Get the document tags
   */
  public get tags(): Tag[] {
    return [...this._tags]; // Return defensive copy
  }

  /**
   * Get the document content
   */
  public get content(): T {
    return this._content;
  }

  /**
   * Get the branch name
   */
  public get branch(): string | undefined {
    return this._branch;
  }

  /**
   * Get the version info
   */
  public get versionInfo(): DocumentVersionInfo {
    return this._versionInfo;
  }

  /**
   * Get the last modified date
   */
  public get lastModified(): Date {
    return this._versionInfo.lastModified;
  }

  /**
   * Get the document version
   */
  public get version(): number {
    return this._versionInfo.version;
  }

  /**
   * Check if document has a specific tag
   * @param tag Tag to check
   * @returns boolean indicating if document has tag
   */
  public hasTag(tag: Tag): boolean {
    return this._tags.some((t) => t.equals(tag));
  }

  /**
   * Create a new document with updated path
   * @param path New path
   * @returns New JsonDocument instance
   */
  public updatePath(path: DocumentPath): JsonDocument<T> {
    if (path.equals(this._path)) {
      return this;
    }

    const updatedVersionInfo = this._versionInfo.nextVersion();

    return new JsonDocument<T>(
      this._id,
      path,
      this._title,
      this._documentType,
      this._tags,
      this._content,
      this._branch,
      updatedVersionInfo
    );
  }

  /**
   * Create a new document with updated title
   * @param title New title
   * @returns New JsonDocument instance
   */
  public updateTitle(title: string): JsonDocument<T> {
    if (title === this._title) {
      return this;
    }

    const updatedVersionInfo = this._versionInfo.nextVersion();

    return new JsonDocument<T>(
      this._id,
      this._path,
      title,
      this._documentType,
      this._tags,
      this._content,
      this._branch,
      updatedVersionInfo
    );
  }

  /**
   * Create a new document with updated content
   * @param content New content
   * @returns New JsonDocument instance
   */
  public updateContent<U extends Record<string, unknown>>(content: U): JsonDocument<U> {
    // Validate content based on document type
    try {
      switch (this._documentType) {
        case 'branch_context':
          BranchContextJsonV2Schema.shape.content.parse(content);
          break;
        case 'active_context':
          ActiveContextJsonV2Schema.shape.content.parse(content);
          break;
        case 'progress':
          ProgressJsonV2Schema.shape.content.parse(content);
          break;
        case 'system_patterns':
          SystemPatternsJsonV2Schema.shape.content.parse(content);
          break;
        default:
          // For generic types, ensure content is not empty
          if (Object.keys(content).length === 0) {
            throw new Error('Content cannot be empty');
          }
          break;
      }
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid content for ${this._documentType} document: ${(error as Error).message}`
      );
    }

    const updatedVersionInfo = this._versionInfo.nextVersion();

    return new JsonDocument<U>(
      this._id,
      this._path,
      this._title,
      this._documentType,
      this._tags,
      content,
      this._branch,
      updatedVersionInfo
    );
  }

  /**
   * Create a new document with added tag
   * @param tag Tag to add
   * @returns New JsonDocument instance
   */
  public addTag(tag: Tag): JsonDocument<T> {
    if (this.hasTag(tag)) {
      return this;
    }

    const updatedVersionInfo = this._versionInfo.nextVersion();

    return new JsonDocument<T>(
      this._id,
      this._path,
      this._title,
      this._documentType,
      [...this._tags, tag],
      this._content,
      this._branch,
      updatedVersionInfo
    );
  }

  /**
   * Create a new document with removed tag
   * @param tag Tag to remove
   * @returns New JsonDocument instance
   */
  public removeTag(tag: Tag): JsonDocument<T> {
    if (!this.hasTag(tag)) {
      return this;
    }

    const updatedVersionInfo = this._versionInfo.nextVersion();

    return new JsonDocument<T>(
      this._id,
      this._path,
      this._title,
      this._documentType,
      this._tags.filter((t) => !t.equals(tag)),
      this._content,
      this._branch,
      updatedVersionInfo
    );
  }

  /**
   * Create a new document with updated tags
   * @param tags New tags
   * @returns New JsonDocument instance
   */
  public updateTags(tags: Tag[]): JsonDocument<T> {
    const updatedVersionInfo = this._versionInfo.nextVersion();

    return new JsonDocument<T>(
      this._id,
      this._path,
      this._title,
      this._documentType,
      [...tags], // Defensive copy
      this._content,
      this._branch,
      updatedVersionInfo
    );
  }

  /**
   * Converts the document to a serializable object (BaseJsonDocumentV2)
   * @returns Document as a serializable object
   */
  public toObject(): BaseJsonDocumentV2 {
    const metadata: Record<string, any> = {
      id: this._id.value,
      title: this._title,
      documentType: this._documentType,
      path: this._path.value,
      tags: this._tags.map((tag) => tag.value),
      lastModified: this._versionInfo.lastModified,
      version: this._versionInfo.version,
    };

    // Add createdAt (if we have one available)
    if ('createdAt' in this) {
      metadata.createdAt = (this as any)._createdAt || new Date();
    } else {
      metadata.createdAt = new Date();
    }

    // Add branch if it exists
    if (this._branch) {
      metadata.branch = this._branch;
    }

    return {
      schema: SCHEMA_VERSION,
      metadata,
      content: this._content,
    };
  }

  /**
   * Converts the document to a JSON string
   * @param pretty Whether to pretty-print the JSON (default: false)
   * @returns JSON string representation
   */
  public toString(pretty = false): string {
    return JSON.stringify(this.toObject(), null, pretty ? 2 : undefined);
  }

  /**
   * Checks if two JsonDocument instances are equal (have the same ID)
   * @param other Another JsonDocument instance
   * @returns boolean indicating equality
   */
  public equals(other: JsonDocument): boolean {
    return this._id.equals(other._id);
  }
}
