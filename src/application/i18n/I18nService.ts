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

  /**
   * Translates a key to the current language
   * 
   * @param key Translation key
   * @param variables Optional variables for replacement
   * @returns Promise resolving to translated text or key prefixed with "?" if not found
   */
  async translate(key: string, variables?: Record<string, string>): Promise<string> {
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
