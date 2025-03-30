/**
 * Interface for internationalization provider
 * Defines the contract for translation and localization services
 */

import type { Language, TranslationKey } from '@memory-bank/schemas';

/**
 * I18n Provider Interface
 */
export interface II18nProvider {
  /**
   * Translates a key to the specified language with optional parameter substitution
   *
   * @param params Parameters for translation
   * @param params.key Translation key
   * @param params.language Target language
   * @param params.params Optional parameters for substitution
   * @returns Translated text
   */
  translate(params: {
    key: TranslationKey;
    language: Language;
    params?: Record<string, string>;
  }): string;

  /**
   * Loads translations for the specified language
   *
   * @param language Language to load
   * @returns Promise resolving to true if successful, false otherwise
   */
  loadTranslations(language: Language): Promise<boolean>;

  /**
   * Checks if a language is supported
   *
   * @param language Language code to check
   * @returns True if language is supported, false otherwise
   */
  isLanguageSupported(language: string): boolean;

  /**
   * Gets all supported languages
   *
   * @returns Array of supported language codes
   */
  getSupportedLanguages(): Language[];

  /**
   * Gets the default language
   *
   * @returns Default language code
   */
  getDefaultLanguage(): Language;
}
