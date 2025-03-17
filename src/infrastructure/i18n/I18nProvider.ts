/**
 * I18n Provider Implementation
 * Provides internationalization services for the application
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { IFileSystemService } from '../storage/interfaces/IFileSystemService.js';
import {
  Language,
  TranslationKey,
  isValidLanguage,
  TranslationFile,
} from '../../schemas/v2/i18n-schema.js';
import { II18nProvider } from './interfaces/II18nProvider.js';

/**
 * Implementation of II18nProvider
 */
export class I18nProvider implements II18nProvider {
  private translations: Map<Language, Record<TranslationKey, string>> = new Map();
  private readonly defaultLanguage: Language = 'en';
  private readonly supportedLanguages: Language[] = ['en', 'ja', 'zh'];
  private readonly translationsPath: string;

  /**
   * Constructor
   *
   * @param fileSystemService Service for file system operations
   */
  constructor(private readonly fileSystemService: IFileSystemService) {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    this.translationsPath = path.join(dirname, 'translations');
  }

  /**
   * Implements II18nProvider.translate
   */
  translate(key: TranslationKey, language: Language, params?: Record<string, string>): string {
    // Ensure translations are loaded
    if (!this.translations.has(language)) {
      console.warn(
        `Translations not loaded for language ${language}, falling back to ${this.defaultLanguage}`
      );

      // If default language translations are not loaded either, return the key
      if (!this.translations.has(this.defaultLanguage)) {
        return this.processPlaceholders(key, params);
      }

      // Fall back to default language
      language = this.defaultLanguage;
    }

    const translationMap = this.translations.get(language)!;
    const translation = translationMap[key];

    // If translation not found, fall back to default language
    if (
      !translation &&
      language !== this.defaultLanguage &&
      this.translations.has(this.defaultLanguage)
    ) {
      const defaultTranslationMap = this.translations.get(this.defaultLanguage)!;
      const defaultTranslation = defaultTranslationMap[key];

      if (defaultTranslation) {
        return this.processPlaceholders(defaultTranslation, params);
      }
    }

    // If no translation found, return the key itself
    return this.processPlaceholders(translation || key, params);
  }

  /**
   * Implements II18nProvider.loadTranslations
   */
  async loadTranslations(language: Language): Promise<boolean> {
    try {
      const filePath = path.join(this.translationsPath, `${language}.json`);

      // Check if file exists
      const exists = await this.fileSystemService.fileExists(filePath);
      if (!exists) {
        console.warn(`Translation file not found: ${filePath}`);
        return false;
      }

      // Read and parse the translation file
      const content = await this.fileSystemService.readFile(filePath);
      const translationFile = JSON.parse(content) as TranslationFile;

      // Validate language matches
      if (translationFile.language !== language) {
        console.warn(
          `Language mismatch in translation file: expected ${language}, got ${translationFile.language}`
        );
        return false;
      }

      // Store translations
      this.translations.set(language, translationFile.translations);
      return true;
    } catch (error) {
      console.error(`Failed to load translations for ${language}:`, error);
      return false;
    }
  }

  /**
   * Implements II18nProvider.isLanguageSupported
   */
  isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.includes(language as Language);
  }

  /**
   * Implements II18nProvider.getSupportedLanguages
   */
  getSupportedLanguages(): Language[] {
    return [...this.supportedLanguages];
  }

  /**
   * Implements II18nProvider.getDefaultLanguage
   */
  getDefaultLanguage(): Language {
    return this.defaultLanguage;
  }

  /**
   * Process placeholders in the text
   * Replaces {{PLACEHOLDER}} with corresponding value from params
   *
   * @param text Text containing placeholders
   * @param params Parameters to substitute
   * @returns Text with placeholders replaced
   */
  private processPlaceholders(text: string, params?: Record<string, string>): string {
    if (!params) {
      return text;
    }

    return text.replace(/\{\{([A-Z_]+)\}\}/g, (match, placeholder) => {
      return params[placeholder] || match;
    });
  }

  /**
   * Loads all supported languages
   *
   * @returns Promise resolving when all languages are loaded
   */
  async loadAllTranslations(): Promise<void> {
    for (const language of this.supportedLanguages) {
      await this.loadTranslations(language);
    }
  }
}
