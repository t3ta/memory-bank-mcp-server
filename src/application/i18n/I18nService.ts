/**
 * I18n Service
 *
 * Application service for handling internationalization and translations.
 * Manages current language context and provides translation functionality.
 */
import { Language, LanguageCode } from '../../domain/i18n/Language.js';
import { II18nRepository } from '../../domain/i18n/II18nRepository.js';
import { Translation } from '../../domain/i18n/Translation.js';

/**
 * Service for handling internationalization and translations
 */
export class I18nService {
  private repository: II18nRepository;
  private currentLanguage: Language;

  /**
   * Constructor
   *
   * @param repository Repository for accessing translations
   */
  constructor(repository: II18nRepository) {
    this.repository = repository;
    this.currentLanguage = Language.default();
  }

  /**
   * Gets the current language
   *
   * @returns Current language
   */
  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Sets the current language
   *
   * @param languageCode Language code to set as current
   * @throws Error if language code is not supported
   */
  setCurrentLanguage(languageCode: LanguageCode): void {
    this.currentLanguage = new Language(languageCode);
  }

  // Cache for translations to avoid repeated repository calls
  private translationCache: Map<string, Map<string, Translation>> = new Map();
  private isTranslationLoaded = false;

  /**
   * Load all translations into memory for faster access
   *
   * @returns Promise resolving when all translations are loaded
   */
  async loadAllTranslations(): Promise<void> {
    // Clear the cache
    this.translationCache.clear();

    // Get all supported languages
    const languages = await this.repository.getSupportedLanguages();

    // Load translations for each language
    for (const language of languages) {
      const translations = await this.repository.getTranslationsForLanguage(language);

      // Create language map if it doesn't exist
      if (!this.translationCache.has(language.code)) {
        this.translationCache.set(language.code, new Map());
      }

      // Add translations to cache
      const languageMap = this.translationCache.get(language.code);
      for (const translation of translations) {
        languageMap.set(translation.key, translation);
      }
    }

    this.isTranslationLoaded = true;
  }

  /**
   * Translates a key to the specified language or current language
   * Method overloads for both synchronous and asynchronous usage
   */

  /**
   * Synchronous version that uses the cache and specified language code
   * Must call loadAllTranslations() first to populate the cache
   *
   * @param key Translation key
   * @param languageCode Language code to translate to
   */
  translate(key: string, languageCode: string): string;

  /**
   * Asynchronous version that translates to the current language
   *
   * @param key Translation key
   * @param variables Optional variables for replacement
   */
  translate(key: string, variables?: Record<string, string>): Promise<string>;

  /**
   * Implementation of the translate method
   */
  translate(key: string, secondParam?: string | Record<string, string>): string | Promise<string> {
    // Synchronous version with language code
    if (typeof secondParam === 'string') {
      const languageCode = secondParam;

      if (!this.isTranslationLoaded) {
        console.warn('Translations not loaded. Call loadAllTranslations() first.');
        return `?${key}`;
      }

      // Try to get translation for specified language
      const languageMap = this.translationCache.get(languageCode);
      let translation = languageMap?.get(key);

      // Fall back to English if not found and language isn't English
      if (!translation && languageCode !== 'en') {
        const englishMap = this.translationCache.get('en');
        translation = englishMap?.get(key);
      }

      // If still not found, return the key prefixed with "?"
      if (!translation) {
        return `?${key}`;
      }

      return translation.text;
    }
    // Asynchronous version with optional variables
    else {
      const variables = secondParam as Record<string, string> | undefined;

      // Return a Promise for the async version
      return (async () => {
        // Try to get translation for current language
        let translation = await this.repository.getTranslation(key, this.currentLanguage);

        // Fall back to English if not found and current language isn't English
        if (!translation && this.currentLanguage.code !== 'en') {
          translation = await this.repository.getTranslation(key, Language.default());
        }

        // If still not found, return the key prefixed with "?"
        if (!translation) {
          return `?${key}`;
        }

        // Replace variables if provided
        if (variables) {
          return translation.withReplacedVariables(variables).text;
        }

        return translation.text;
      })();
    }
  }

  /**
   * Gets all supported languages
   *
   * @returns Promise resolving to array of supported languages
   */
  async getSupportedLanguages(): Promise<Language[]> {
    return this.repository.getSupportedLanguages();
  }

  /**
   * Checks if a translation exists for current language
   *
   * @param key Translation key
   * @returns Promise resolving to boolean indicating if translation exists
   */
  async hasTranslation(key: string): Promise<boolean> {
    return this.repository.hasTranslation(key, this.currentLanguage);
  }

  /**
   * Gets all available translation keys
   *
   * @returns Promise resolving to array of translation keys
   */
  async getAllKeys(): Promise<string[]> {
    return this.repository.getAllKeys();
  }

  /**
   * Gets all translations for the current language
   *
   * @returns Promise resolving to array of translations
   */
  async getAllTranslationsForCurrentLanguage(): Promise<Translation[]> {
    return this.repository.getTranslationsForLanguage(this.currentLanguage);
  }

  /**
   * Saves a translation
   *
   * @param key Translation key
   * @param text Translated text
   * @param languageCode Optional language code (defaults to current language)
   * @returns Promise resolving to boolean indicating success
   */
  async saveTranslation(
    key: string,
    text: string,
    languageCode?: LanguageCode
  ): Promise<boolean> {
    const language = languageCode
      ? new Language(languageCode)
      : this.currentLanguage;

    const translation = new Translation(language, key, text);
    return this.repository.saveTranslation(translation);
  }
}
