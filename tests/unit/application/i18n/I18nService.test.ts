import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { I18nService } from '../../../../src/application/i18n/I18nService.js';
import { II18nRepository } from '../../../../src/domain/i18n/II18nRepository.js';
import { Language, LanguageCode } from '../../../../src/domain/i18n/Language.js';
import { Translation } from '../../../../src/domain/i18n/Translation.js';

// Mock repository implementation
class MockI18nRepository implements II18nRepository {
  private translations: Translation[] = [];

  constructor() {
    // Initialize with some test translations
    this.addTranslation('en', 'greeting', 'Hello');
    this.addTranslation('ja', 'greeting', 'こんにちは');
    this.addTranslation('en', 'welcome', 'Welcome, {{name}}!');
    this.addTranslation('ja', 'welcome', 'ようこそ、{{name}}さん！');
    // Only add English for this key to test fallback
    this.addTranslation('en', 'english_only', 'English only text');
  }

  private addTranslation(languageCode: LanguageCode, key: string, text: string): void {
    const language = new Language(languageCode);
    this.translations.push(new Translation(language, key, text));
  }

  async getTranslation(key: string, language: Language): Promise<Translation | null> {
    const translation = this.translations.find(
      t => t.key === key && t.language.equals(language)
    );
    return translation || null;
  }

  async getTranslationsForKey(key: string): Promise<Translation[]> {
    return this.translations.filter(t => t.key === key);
  }

  async getTranslationsForLanguage(language: Language): Promise<Translation[]> {
    return this.translations.filter(t => t.language.equals(language));
  }

  async saveTranslation(translation: Translation): Promise<boolean> {
    // Remove existing translation with same key and language if exists
    this.translations = this.translations.filter(
      t => !(t.key === translation.key && t.language.equals(translation.language))
    );
    // Add the new translation
    this.translations.push(translation);
    return true;
  }

  async hasTranslation(key: string, language: Language): Promise<boolean> {
    return this.translations.some(
      t => t.key === key && t.language.equals(language)
    );
  }

  async getAllKeys(): Promise<string[]> {
    return [...new Set(this.translations.map(t => t.key))];
  }

  async getSupportedLanguages(): Promise<Language[]> {
    const languageCodes = [...new Set(this.translations.map(t => t.language.code))];
    return languageCodes.map(code => new Language(code));
  }
}

describe('I18nService', () => {
  let repository: II18nRepository;
  let service: I18nService;

  beforeEach(() => {
    repository = new MockI18nRepository();
    service = new I18nService(repository);
  });

  describe('getCurrentLanguage and setCurrentLanguage', () => {
    it('should return English as default language', () => {
      expect(service.getCurrentLanguage().code).toBe('en');
    });

    it('should allow changing the current language', () => {
      service.setCurrentLanguage('ja');
      expect(service.getCurrentLanguage().code).toBe('ja');
    });

    it('should throw error for unsupported language code', () => {
      expect(() => service.setCurrentLanguage('fr' as LanguageCode)).toThrow();
    });
  });

  describe('translate', () => {
    it('should return translation for current language', async () => {
      service.setCurrentLanguage('ja');
      const result = await service.translate('greeting');
      expect(result).toBe('こんにちは');
    });

    it('should return translation with replaced variables', async () => {
      service.setCurrentLanguage('en');
      const result = await service.translate('welcome', { name: 'John' });
      expect(result).toBe('Welcome, John!');
    });

    it('should fall back to English if translation not available in current language', async () => {
      service.setCurrentLanguage('ja');
      const result = await service.translate('english_only');
      expect(result).toBe('English only text');
    });

    it('should return the key prefixed with "?" if no translation found', async () => {
      const result = await service.translate('non_existent_key');
      expect(result).toBe('?non_existent_key');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported languages', async () => {
      const languages = await service.getSupportedLanguages();
      expect(languages.length).toBe(2);
      expect(languages.map(l => l.code).sort()).toEqual(['en', 'ja']);
    });
  });

  describe('hasTranslation', () => {
    it('should return true if translation exists for current language', async () => {
      service.setCurrentLanguage('ja');
      const result = await service.hasTranslation('greeting');
      expect(result).toBe(true);
    });

    it('should return false if translation does not exist for current language', async () => {
      service.setCurrentLanguage('ja');
      const result = await service.hasTranslation('english_only');
      expect(result).toBe(false);
    });
  });
});
