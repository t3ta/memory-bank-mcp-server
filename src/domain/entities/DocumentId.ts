import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError';

/**
 * Value object representing a document ID
 * Used to uniquely identify documents regardless of their path
 */
export class DocumentId {
  private constructor(private readonly _value: string) {}

  /**
   * Factory method to create a new DocumentId
   * @param value UUID string
   * @returns DocumentId instance
   * @throws DomainError if UUID is invalid
   */
  public static create(value: string): DocumentId {
    if (!value) {
      throw new DomainError(DomainErrorCodes.INVALID_DOCUMENT_ID, 'Document ID cannot be empty');
    }

    if (!uuidValidate(value)) {
      throw new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_ID,
        'Document ID must be a valid UUID'
      );
    }

    return new DocumentId(value);
  }

  /**
   * Generate a new DocumentId with a random UUID
   * @returns DocumentId instance
   */
  public static generate(): DocumentId {
    return new DocumentId(uuidv4());
  }

  /**
   * Get the raw UUID value
   */
  public get value(): string {
    return this._value;
  }

  /**
   * Checks if two DocumentId instances are equal
   * @param other Another DocumentId instance
   * @returns boolean indicating equality
   */
  public equals(other: DocumentId): boolean {
    return this._value === other._value;
  }

  /**
   * Convert to string
   * @returns Raw UUID value
   */
  public toString(): string {
    return this._value;
  }
}
