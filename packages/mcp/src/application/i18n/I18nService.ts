/**
 * I18n Service
 *
 * Application service for handling internationalization and translations.
 * Manages current language context and provides translation functionality.
 */
import { Language, LanguageCode } from '../../domain/i18n/Language.js';
import { II18nRepository } from '../../domain/i18n/II18nRepository.js';
import { Translation } from '../../domain/i18n/Translation.js';
import { logger } from '../../shared/utils/logger.js';

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

  private translationCache: Map<string, Map<string, Translation>> = new Map();
  private isTranslationLoaded = false;

  /**
   * Load all translations into memory for faster access
   *
   * @returns Promise resolving when all translations are loaded
   */
  async loadAllTranslations(): Promise<void> {
    this.translationCache.clear();

    const languages = await this.repository.getSupportedLanguages();

    for (const language of languages) {
      const translations = await this.repository.getTranslationsForLanguage(language);

      if (!this.translationCache.has(language.code)) {
        this.translationCache.set(language.code, new Map());
      }

      const languageMap = this.translationCache.get(language.code);
      for (const translation of translations) {
        languageMap?.set(translation.key, translation);
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
    if (typeof secondParam === 'string') {
      const languageCode = secondParam;

      if (!this.isTranslationLoaded) {
        logger.warn('Translations not loaded. Call loadAllTranslations() first.', { component: 'I18nService' });
        return `?${key}`;
      }

      const languageMap = this.translationCache.get(languageCode);
      let translation = languageMap?.get(key);

      if (!translation && languageCode !== 'en') {
        const englishMap = this.translationCache.get('en');
        translation = englishMap?.get(key);
      }

      if (!translation) {
        return `?${key}`;
      }

      return translation.text;
    }
    else {
      const variables = secondParam as Record<string, string> | undefined;

      return (async () => {
        let translation = await this.repository.getTranslation(key, this.currentLanguage);

        if (!translation && this.currentLanguage.code !== 'en') {
          translation = await this.repository.getTranslation(key, Language.default());
        }

        if (!translation) {
          return `?${key}`;
        }

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
