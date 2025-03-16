/**
 * Internationalization Schema Definition
 * Defines the structure for translation files and related types.
 */

/**
 * Supported language codes
 */
export type Language = 'en' | 'ja' | 'zh';

/**
 * Translation key type
 */
export type TranslationKey = string;

/**
 * Translation dictionary type
 * Maps translation keys to translated text
 */
export type TranslationDictionary = Record<TranslationKey, string>;

/**
 * Translation file structure
 */
export interface TranslationFile {
  language: Language;
  translations: TranslationDictionary;
  metadata: {
    version: string;
    updatedAt: string; // ISO 8601 format
  };
}

/**
 * Validates a language code
 * 
 * @param lang Language code to validate
 * @returns True if supported language, false otherwise
 */
export function isValidLanguage(lang: string): lang is Language {
  return ['en', 'ja', 'zh'].includes(lang);
}

/**
 * Gets a safe language code, defaulting to English if not supported
 * 
 * @param lang Language code to validate
 * @returns Valid language code
 */
export function getSafeLanguage(lang: string): Language {
  return isValidLanguage(lang) ? lang : 'en';
}
