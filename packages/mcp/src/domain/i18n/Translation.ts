/**
 * Translation Domain Model
 *
 * Represents a localized text for a specific language with variable substitution capabilities.
 * Implements value object pattern - immutable and equality based on value.
 */
import { Language } from './Language.js';

/**
 * Translation key type - identifies a specific translatable string
 */
export type TranslationKey = string;

/**
 * Translation class represents a localized text in a specific language
 */
export class Translation {
  private readonly _language: Language;
  private readonly _key: TranslationKey;
  private readonly _text: string;

  /**
   * Constructor with validation
   *
   * @param language Language instance
   * @param key Translation key
   * @param text Translated text
   * @throws Error if key or text is empty
   */
  constructor(language: Language, key: TranslationKey, text: string) {
    if (!key || key.trim() === '') {
      throw new Error('Translation key cannot be empty');
    }

    if (!text || text.trim() === '') {
      throw new Error('Translation text cannot be empty');
    }

    this._language = language;
    this._key = key.trim();
    this._text = text;
  }

  /**
   * Gets the language
   */
  get language(): Language {
    return this._language;
  }

  /**
   * Gets the translation key
   */
  get key(): TranslationKey {
    return this._key;
  }

  /**
   * Gets the translated text
   */
  get text(): string {
    return this._text;
  }

  /**
   * Creates a Translation instance, validating inputs
   *
   * @param language Language instance
   * @param key Translation key
   * @param text Translated text
   * @returns Translation instance
   * @throws Error if key or text is empty
   */
  static create(language: Language, key: TranslationKey, text: string): Translation {
    return new Translation(language, key, text);
  }

  /**
   * Creates a new Translation with variables replaced in the text
   *
   * @param variables Object with variable names and their values
   * @returns New Translation instance with replaced variables
   */
  withReplacedVariables(variables: Record<string, string>): Translation {
    if (!variables || Object.keys(variables).length === 0) {
      return this;
    }

    // Create a copy with variables replaced
    let newText = this._text;
    Object.entries(variables).forEach(([name, value]) => {
      // Replace all occurrences of {{name}} with value
      const pattern = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
      newText = newText.replace(pattern, value);
    });

    // If no replacements were done, return this instance
    if (newText === this._text) {
      return this;
    }

    return new Translation(this._language, this._key, newText);
  }

  /**
   * Compare equality with another Translation object
   *
   * @param other Another Translation object to compare
   * @returns true if equal, false otherwise
   */
  equals(other: Translation): boolean {
    return (
      this._language.equals(other.language) &&
      this._key === other.key &&
      this._text === other.text
    );
  }
}
