/**
 * File-based implementation of the I18n Repository
 *
 * Stores and retrieves translations from JSON files.
 * Each language has its own JSON file with all translations for that language.
 */
import path from 'path';
import fs from 'fs/promises';
import { II18nRepository } from '../../domain/i18n/II18nRepository.js';
import { Language, LanguageCode } from '../../domain/i18n/Language.js';
import { Translation, TranslationKey } from '../../domain/i18n/Translation.js';

/**
 * Type representing the structure of a translation file
 */
interface TranslationFile {
  language: LanguageCode;
  translations: Record<TranslationKey, string>;
  lastModified: string;
}

/**
 * File-based implementation of I18n Repository
 */
export class FileI18nRepository implements II18nRepository {
  private readonly basePath: string;
  private translationCache: Map<LanguageCode, Map<TranslationKey, string>>;
  private cacheDirty: boolean;

  /**
   * Constructor
   *
   * @param basePath Base path for storing translation files
   */
  constructor(basePath: string) {
    this.basePath = basePath;
    this.translationCache = new Map();
    this.cacheDirty = true;
  }

  /**
   * Initialize the repository
   *
   * @returns Promise resolving when initialization is complete
   */
  async initialize(): Promise<void> {
    try {
      // Ensure translations directory exists
      await fs.mkdir(this.basePath, { recursive: true });

      // Load all translations into cache
      await this.loadAllTranslations();
    } catch (error) {
      throw new Error(`Failed to initialize I18n repository: ${(error as Error).message}`);
    }
  }

  /**
   * Gets a translation for a specific key and language
   *
   * @param key Translation key
   * @param language Language to get translation for
   * @returns Promise resolving to Translation or null if not found
   */
  async getTranslation(key: TranslationKey, language: Language): Promise<Translation | null> {
    if (this.cacheDirty) {
      await this.loadAllTranslations();
    }

    const langCache = this.translationCache.get(language.code);
    if (!langCache || !langCache.has(key)) {
      return null;
    }

    const translationText = langCache.get(key);
    if (!translationText) {
      return null;
    }

    return new Translation(language, key, translationText);
  }

  /**
   * Gets translations for a key in all supported languages
   *
   * @param key Translation key
   * @returns Promise resolving to array of Translation objects
   */
  async getTranslationsForKey(key: TranslationKey): Promise<Translation[]> {
    if (this.cacheDirty) {
      await this.loadAllTranslations();
    }

    const translations: Translation[] = [];

    // Check each language for the key
    for (const [langCode, langCache] of this.translationCache.entries()) {
      if (langCache.has(key)) {
        const translationText = langCache.get(key);
        if (translationText) {
          const language = new Language(langCode);
          translations.push(new Translation(language, key, translationText));
        }
      }
    }

    return translations;
  }

  /**
   * Gets all translations for a specific language
   *
   * @param language Language to get translations for
   * @returns Promise resolving to array of Translation objects
   */
  async getTranslationsForLanguage(language: Language): Promise<Translation[]> {
    if (this.cacheDirty) {
      await this.loadAllTranslations();
    }

    const translations: Translation[] = [];
    const langCache = this.translationCache.get(language.code);

    if (langCache) {
      for (const [key, text] of langCache.entries()) {
        translations.push(new Translation(language, key, text));
      }
    }

    return translations;
  }

  /**
   * Saves a translation (creates or updates)
   *
   * @param translation Translation to save
   * @returns Promise resolving to boolean indicating success
   */
  async saveTranslation(translation: Translation): Promise<boolean> {
    try {
      if (this.cacheDirty) {
        await this.loadAllTranslations();
      }

      const langCode = translation.language.code;

      // Get or create cache for this language
      let langCache = this.translationCache.get(langCode);
      if (!langCache) {
        langCache = new Map<TranslationKey, string>();
        this.translationCache.set(langCode, langCache);
      }

      // Update cache
      langCache.set(translation.key, translation.text);

      // Write to file
      await this.saveTranslationsForLanguage(translation.language);

      return true;
    } catch (error) {
      console.error(`Failed to save translation: ${translation.key}`, error);
      return false;
    }
  }

  /**
   * Checks if a translation exists for a specific key and language
   *
   * @param key Translation key
   * @param language Language to check
   * @returns Promise resolving to boolean indicating if translation exists
   */
  async hasTranslation(key: TranslationKey, language: Language): Promise<boolean> {
    if (this.cacheDirty) {
      await this.loadAllTranslations();
    }

    const langCache = this.translationCache.get(language.code);
    return !!langCache && langCache.has(key);
  }

  /**
   * Gets a list of all translation keys
   *
   * @returns Promise resolving to array of translation keys
   */
  async getAllKeys(): Promise<TranslationKey[]> {
    if (this.cacheDirty) {
      await this.loadAllTranslations();
    }

    const allKeys = new Set<TranslationKey>();

    // Collect all keys from all languages
    for (const langCache of this.translationCache.values()) {
      for (const key of langCache.keys()) {
        allKeys.add(key);
      }
    }

    return Array.from(allKeys);
  }

  /**
   * Gets a list of all supported languages
   *
   * @returns Promise resolving to array of Language objects
   */
  async getSupportedLanguages(): Promise<Language[]> {
    if (this.cacheDirty) {
      await this.loadAllTranslations();
    }

    return Array.from(this.translationCache.keys())
      .map(code => new Language(code));
  }

  /**
   * Loads all translations into cache
   *
   * @private
   */
  private async loadAllTranslations(): Promise<void> {
    try {
      // Clear the cache
      this.translationCache.clear();

      // Check if directory exists
      try {
        await fs.access(this.basePath);
      } catch (error) {
        // Directory doesn't exist, create it
        await fs.mkdir(this.basePath, { recursive: true });
        // No files to load
        this.cacheDirty = false;
        return;
      }

      // Get all translation files
      const files = await fs.readdir(this.basePath);
      const translationFiles = files.filter(file =>
        file.endsWith('.json') &&
        Language.supportedLanguages().some(lang => file === `${lang}.json`)
      );

      // Load each file
      for (const file of translationFiles) {
        const langCode = path.basename(file, '.json') as LanguageCode;
        await this.loadTranslationsForLanguage(langCode);
      }

      // Cache is now clean
      this.cacheDirty = false;
    } catch (error) {
      console.error('Failed to load translations', error);
      throw new Error(`Failed to load translations: ${(error as Error).message}`);
    }
  }

  /**
   * Loads translations for a specific language
   *
   * @param langCode Language code
   * @private
   */
  private async loadTranslationsForLanguage(langCode: LanguageCode): Promise<void> {
    try {
      const filePath = path.join(this.basePath, `${langCode}.json`);

      try {
        // Check if file exists
        await fs.access(filePath);
      } catch (error) {
        // File doesn't exist, nothing to load
        return;
      }

      // Read and parse the file
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as TranslationFile;

      // Validate data
      if (data.language !== langCode) {
        throw new Error(`Language mismatch in file ${filePath}: expected ${langCode}, got ${data.language}`);
      }

      // Create cache for this language
      const langCache = new Map<TranslationKey, string>();

      // Fill the cache
      for (const [key, text] of Object.entries(data.translations)) {
        langCache.set(key, text);
      }

      // Update main cache
      this.translationCache.set(langCode, langCache);
    } catch (error) {
      console.error(`Failed to load translations for ${langCode}`, error);
      throw new Error(`Failed to load translations for ${langCode}: ${(error as Error).message}`);
    }
  }

  /**
   * Saves translations for a specific language
   *
   * @param language Language
   * @private
   */
  private async saveTranslationsForLanguage(language: Language): Promise<void> {
    try {
      const langCode = language.code;
      const langCache = this.translationCache.get(langCode);

      if (!langCache) {
        throw new Error(`No translations found for language ${langCode}`);
      }

      // Create translation file data
      const translations: Record<TranslationKey, string> = {};
      for (const [key, text] of langCache.entries()) {
        translations[key] = text;
      }

      const data: TranslationFile = {
        language: langCode,
        translations,
        lastModified: new Date().toISOString()
      };

      // Write to file
      const filePath = path.join(this.basePath, `${langCode}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save translations for ${language.code}`, error);
      throw new Error(`Failed to save translations for ${language.code}: ${(error as Error).message}`);
    }
  }
}
