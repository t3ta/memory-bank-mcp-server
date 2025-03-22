/**
 * I18n Repository Interface
 * 
 * Defines the contract for accessing and managing translations.
 * Part of the domain layer, with implementations in the infrastructure layer.
 */
import { Language, LanguageCode } from './Language.js';
import { Translation, TranslationKey } from './Translation.js';

/**
 * Interface for accessing and managing translations
 */
export interface II18nRepository {
  /**
   * Gets a translation for a specific key and language
   * 
   * @param key Translation key
   * @param language Language to get translation for
   * @returns Promise resolving to Translation or null if not found
   */
  getTranslation(key: TranslationKey, language: Language): Promise<Translation | null>;
  
  /**
   * Gets translations for a key in all supported languages
   * 
   * @param key Translation key
   * @returns Promise resolving to array of Translation objects
   */
  getTranslationsForKey(key: TranslationKey): Promise<Translation[]>;
  
  /**
   * Gets all translations for a specific language
   * 
   * @param language Language to get translations for
   * @returns Promise resolving to array of Translation objects
   */
  getTranslationsForLanguage(language: Language): Promise<Translation[]>;
  
  /**
   * Saves a translation (creates or updates)
   * 
   * @param translation Translation to save
   * @returns Promise resolving to boolean indicating success
   */
  saveTranslation(translation: Translation): Promise<boolean>;
  
  /**
   * Checks if a translation exists for a specific key and language
   * 
   * @param key Translation key
   * @param language Language to check
   * @returns Promise resolving to boolean indicating if translation exists
   */
  hasTranslation(key: TranslationKey, language: Language): Promise<boolean>;
  
  /**
   * Gets a list of all translation keys
   * 
   * @returns Promise resolving to array of translation keys
   */
  getAllKeys(): Promise<TranslationKey[]>;
  
  /**
   * Gets a list of all supported languages
   * 
   * @returns Promise resolving to array of Language objects
   */
  getSupportedLanguages(): Promise<Language[]>;
}
