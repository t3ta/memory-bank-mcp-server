/**
 * Language Domain Model
 *
 * Represents the concept of a language in the system with validation rules.
 * Implements value object pattern - immutable and equality based on value.
 */

/**
 * Supported language codes - can be extended as needed
 */
export type LanguageCode = 'en' | 'ja' | 'zh';

/**
 * Language class represents a valid language in the system
 */
export class Language {
  private readonly _code: LanguageCode;

  /**
   * Constructor with validation
   *
   * @param code Language code to validate and create Language object
   * @throws Error if language code is not supported
   */
  constructor(code: string) {
    if (!this.isValidLanguageCode(code)) {
      throw new Error(`Unsupported language code: ${code}`);
    }
    this._code = code as LanguageCode;
  }

  /**
   * Gets the language code
   */
  get code(): LanguageCode {
    return this._code;
  }

  /**
   * Creates a Language instance, validating the code
   *
   * @param code Language code to validate
   * @returns Language instance
   * @throws Error if language code is not supported
   */
  static create(code: string): Language {
    return new Language(code);
  }

  /**
   * Creates a default Language instance (English)
   *
   * @returns Language instance for English
   */
  static default(): Language {
    return new Language('en');
  }

  /**
   * Gets list of all supported language codes
   *
   * @returns Array of supported language codes
   */
  static supportedLanguages(): LanguageCode[] {
    return ['en', 'ja', 'zh'];
  }

  /**
   * Validates if a language code is supported
   *
   * @param code Language code to validate
   * @returns true if supported, false otherwise
   */
  private isValidLanguageCode(code: string): code is LanguageCode {
    return Language.supportedLanguages().includes(code as LanguageCode);
  }

  /**
   * Compare equality with another Language object
   *
   * @param other Another Language object to compare
   * @returns true if equal, false otherwise
   */
  equals(other: Language): boolean {
    return this._code === other.code;
  }

  /**
   * Returns string representation
   *
   * @returns Language code as string
   */
  toString(): string {
    return this._code;
  }
}
