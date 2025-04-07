/**
 * File-based implementation of the I18n Repository
 *
 * Stores and retrieves translations from JSON files.
 * Each language has its own JSON file with all translations for that language.
 */
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../shared/utils/logger.js'; // Import logger
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
  private readonly componentLogger = logger.withContext({ component: 'FileI18nRepository' }); // Add logger instance
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
      // this.componentLogger.debug(`Initializing with basePath: ${this.basePath}`); // Removed debug log
      // Directory creation is handled externally or assumed to exist.
      // await fs.mkdir(this.basePath, { recursive: true }); // Removed directory creation
      await this.loadAllTranslations();
      // this.componentLogger.debug('Initialization complete.'); // Removed debug log
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

      let langCache = this.translationCache.get(langCode);
      if (!langCache) {
        langCache = new Map<TranslationKey, string>();
        this.translationCache.set(langCode, langCache);
      }

      langCache.set(translation.key, translation.text);

      await this.saveTranslationsForLanguage(translation.language);

      return true;
    } catch (error) {
      this.componentLogger.error(`Failed to save translation: ${translation.key}`, { error }); // Use componentLogger
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
  } // End of getSupportedLanguages

  // Private methods should be part of the class definition
  /**
   * Loads all translations into cache
   *
   * @private
   */
   private async loadAllTranslations(): Promise<void> {
     try {
       // this.componentLogger.debug('Loading all translations...'); // Removed debug log
       this.translationCache.clear();

       try {
         await fs.access(this.basePath);
       } catch (error) {
         // If directory doesn't exist, log and return (don't create it here)
         this.componentLogger.warn(`Translation directory not found: ${this.basePath}. No translations loaded.`);
         // await fs.mkdir(this.basePath, { recursive: true }); // Removed directory creation
         this.cacheDirty = false;
         return;
       }

       const files = await fs.readdir(this.basePath);
       const translationFiles = files.filter(file =>
         file.endsWith('.json') &&
         Language.supportedLanguages().some(lang => file === `${lang}.json`)
       );
       // this.componentLogger.debug(`Found ${translationFiles.length} translation files.`); // Removed debug log

       for (const file of translationFiles) {
         const langCode = path.basename(file, '.json') as LanguageCode;
         await this.loadTranslationsForLanguage(langCode);
       }

       this.cacheDirty = false;
       // this.componentLogger.debug('Finished loading all translations.'); // Removed debug log
     } catch (error) {
       this.componentLogger.error('Failed to load translations', { error }); // Use componentLogger
       throw new Error(`Failed to load translations: ${(error as Error).message}`);
     }
   } // End of loadAllTranslations

  /**
   * Loads translations for a specific language
   *
   * @param langCode Language code
   * @private
   */
   private async loadTranslationsForLanguage(langCode: LanguageCode): Promise<void> {
     const filePath = path.join(this.basePath, `${langCode}.json`);
     // this.componentLogger.debug(`Loading translations for ${langCode} from ${filePath}`); // Removed debug log
     try {
       try {
         await fs.access(filePath);
       } catch (error) {
         // this.componentLogger.warn(`Translation file not found for ${langCode}: ${filePath}`); // Removed debug log
         return; // ファイルが存在しない場合は何もしない
       }

       const content = await fs.readFile(filePath, 'utf-8');
       const data = JSON.parse(content) as TranslationFile;

       if (data.language !== langCode) {
         throw new Error(`Language mismatch in file ${filePath}: expected ${langCode}, got ${data.language}`);
       }

       const langCache = new Map<TranslationKey, string>();

       for (const [key, text] of Object.entries(data.translations)) {
         langCache.set(key, text);
       }

       this.translationCache.set(langCode, langCache);
       // this.componentLogger.debug(`Loaded ${langCache.size} translations for ${langCode}`); // Removed debug log
     } catch (error) {
       this.componentLogger.error(`Failed to load translations for ${langCode}`, { error }); // Use componentLogger
       // エラーが発生しても処理を続行させるため、ここでは throw しない（キャッシュが空になるだけ）
       // throw new Error(`Failed to load translations for ${langCode}: ${(error as Error).message}`);
     }
   } // End of loadTranslationsForLanguage

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

      const translations: Record<TranslationKey, string> = {};
      for (const [key, text] of langCache.entries()) {
        translations[key] = text;
      }

      const data: TranslationFile = {
        language: langCode,
        translations,
        lastModified: new Date().toISOString()
      };

      const filePath = path.join(this.basePath, `${langCode}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      this.componentLogger.error(`Failed to save translations for ${language.code}`, { error }); // Use componentLogger
      throw new Error(`Failed to save translations for ${language.code}: ${(error as Error).message}`);
    } // saveTranslationsForLanguage の閉じ括弧
  }
}
