import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError';

/**
 * Value object representing a document tag
 */
export class Tag {
  private constructor(private readonly _value: string) {}

  /**
   * Factory method to create a new Tag
   * @param value Raw tag string
   * @returns Tag instance
   * @throws DomainError if tag is invalid
   */
  public static create(value: string): Tag {
    if (!value) {
      throw new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Tag cannot be empty');
    }

    // Tags should only contain lowercase letters, numbers, and hyphens
    const tagRegex = /^[a-z0-9-]+$/;
    if (!tagRegex.test(value)) {
      throw new DomainError(
        DomainErrorCodes.INVALID_TAG_FORMAT,
        'Tag must contain only lowercase letters, numbers, and hyphens'
      );
    }

    return new Tag(value);
  }

  /**
   * Get the raw tag value
   */
  public get value(): string {
    return this._value;
  }

  /**
   * Checks if two Tag instances are equal
   * @param other Another Tag instance
   * @returns boolean indicating equality
   */
  public equals(other: Tag): boolean {
    return this._value === other._value;
  }

  /**
   * Convert to string
   * @returns Raw tag value
   */
  public toString(): string {
    return this._value;
  }

  /**
   * Get tag with leading # character
   */
  public toHashtag(): string {
    return `#${this._value}`;
  }
}
