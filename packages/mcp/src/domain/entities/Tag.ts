import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Value object representing a document tag
 */
export class Tag {
  private constructor(private readonly _value: string) { }

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
    // ★★★ 文字数制限チェックを追加 (例: 50文字) ★★★
    if (value.length > 50) {
      throw new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Tag cannot exceed 50 characters');
    }

    const tagRegex = /^[a-z0-9-]+$/;
    if (!tagRegex.test(value)) {
      throw new DomainError(
        DomainErrorCodes.INVALID_TAG_FORMAT,
        'Tag must contain only lowercase letters, numbers, and hyphens'
      );
    }
    // ★★★ ハイフンで始まる/終わるチェックを追加 ★★★
    if (value.startsWith('-') || value.endsWith('-')) {
      throw new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Tag cannot start or end with a hyphen');
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
  public equals(other: Tag | null | undefined): boolean { // other が null/undefined の可能性を考慮
    // ★★★ null/undefined チェックを追加 ★★★
    if (!other) {
      return false;
    }
    // logger.debug を安全な場所に移動
    logger.debug('Comparing tags:', {
      thisTag: this._value,
      otherTag: other._value, // null チェック後なので安全
      isEqual: this._value === other._value
    });
    return this._value === other._value; // 正しい return 文
  } // 正しい閉じ括弧

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
