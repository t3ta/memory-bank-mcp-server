import { DocumentId } from './DocumentId.js';
import { DocumentPath } from './DocumentPath.js';
import { Tag } from './Tag.js';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';

// Import JSON schemas
import {
  SCHEMA_VERSION,
  BaseJsonDocumentV2Schema,
  BaseJsonDocumentV2,
  BranchContextJsonV2Schema,
  BranchContextJsonV2,
  ActiveContextJsonV2Schema,
  ActiveContextJsonV2,
  ProgressJsonV2Schema,
  ProgressJsonV2,
  SystemPatternsJsonV2Schema,
  SystemPatternsJsonV2,
  DocumentMetadataV2,
} from '../../schemas/v2/json-document.js';

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
    private readonly _lastModified: Date,
    private readonly _createdAt: Date,
    private readonly _version: number
  ) {}

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
    let validatedDocument: BaseJsonDocumentV2;

    try {
      switch (documentType) {
        case 'branch_context':
          validatedDocument = BranchContextJsonV2Schema.parse(jsonData);
          break;
        case 'active_context':
          validatedDocument = ActiveContextJsonV2Schema.parse(jsonData);
          break;
        case 'progress':
          validatedDocument = ProgressJsonV2Schema.parse(jsonData);
          break;
        case 'system_patterns':
          validatedDocument = SystemPatternsJsonV2Schema.parse(jsonData);
          break;
        default:
          validatedDocument = BaseJsonDocumentV2Schema.parse(jsonData);
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

    return new JsonDocument(
      id,
      path,
      metadata.title,
      documentType,
      tags,
      baseDocument.content,
      lastModified,
      createdAt,
      metadata.version
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
    lastModified = new Date(),
    createdAt = new Date(),
    version = 1,
  }: {
    id?: DocumentId;
    path: DocumentPath;
    title: string;
    documentType: DocumentType;
    tags?: Tag[];
    content: T;
    lastModified?: Date;
    createdAt?: Date;
    version?: number;
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
      new Date(lastModified),
      new Date(createdAt),
      version
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
   * Get the last modified date
   */
  public get lastModified(): Date {
    return new Date(this._lastModified);
  }

  /**
   * Get the creation date
   */
  public get createdAt(): Date {
    return new Date(this._createdAt);
  }

  /**
   * Get the document version
   */
  public get version(): number {
    return this._version;
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

    return new JsonDocument<T>(
      this._id,
      path,
      this._title,
      this._documentType,
      this._tags,
      this._content,
      new Date(), // Update lastModified
      this._createdAt,
      this._version + 1 // Increment version
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

    return new JsonDocument<T>(
      this._id,
      this._path,
      title,
      this._documentType,
      this._tags,
      this._content,
      new Date(), // Update lastModified
      this._createdAt,
      this._version + 1 // Increment version
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

    return new JsonDocument<U>(
      this._id,
      this._path,
      this._title,
      this._documentType,
      this._tags,
      content,
      new Date(), // Update lastModified
      this._createdAt,
      this._version + 1 // Increment version
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

    return new JsonDocument<T>(
      this._id,
      this._path,
      this._title,
      this._documentType,
      [...this._tags, tag],
      this._content,
      new Date(), // Update lastModified
      this._createdAt,
      this._version + 1 // Increment version
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

    return new JsonDocument<T>(
      this._id,
      this._path,
      this._title,
      this._documentType,
      this._tags.filter((t) => !t.equals(tag)),
      this._content,
      new Date(), // Update lastModified
      this._createdAt,
      this._version + 1 // Increment version
    );
  }

  /**
   * Create a new document with updated tags
   * @param tags New tags
   * @returns New JsonDocument instance
   */
  public updateTags(tags: Tag[]): JsonDocument<T> {
    return new JsonDocument<T>(
      this._id,
      this._path,
      this._title,
      this._documentType,
      [...tags], // Defensive copy
      this._content,
      new Date(), // Update lastModified
      this._createdAt,
      this._version + 1 // Increment version
    );
  }

  /**
   * Converts the document to a serializable object (BaseJsonDocumentV2)
   * @returns Document as a serializable object
   */
  public toObject(): BaseJsonDocumentV2 {
    return {
      schema: SCHEMA_VERSION,
      metadata: {
        id: this._id.value,
        title: this._title,
        documentType: this._documentType,
        path: this._path.value,
        tags: this._tags.map((tag) => tag.value),
        lastModified: this._lastModified,
        createdAt: this._createdAt,
        version: this._version,
      },
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
