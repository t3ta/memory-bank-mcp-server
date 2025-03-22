/**
 * Unit tests for FileI18nRepository
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { vi } from 'jest';
import fs from 'fs/promises';
import path from 'path';
import { FileI18nRepository } from '../../../../src/infrastructure/i18n/FileI18nRepository.js';
import { Language } from '../../../../src/domain/i18n/Language.js';
import { Translation } from '../../../../src/domain/i18n/Translation.js';

// Mock fs module
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
  }
}));

describe('FileI18nRepository', () => {
  const testBasePath = '/test/i18n';
  let repository: FileI18nRepository;

  // Helper function to create test translation files
  const mockTranslationFile = (lang: string, translations: Record<string, string>) => {
    const content = JSON.stringify({
      language: lang,
      translations,
      lastModified: new Date().toISOString()
    });

    (fs.readFile as any).mockImplementationOnce(() => content);
  };

  beforeEach(() => {
    repository = new FileI18nRepository(testBasePath);
    
    // Reset mocks
    vi.resetAllMocks();
    
    // Default successful access
    (fs.access as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialize', () => {
    it('should create the translations directory if it does not exist', async () => {
      // Mock directory does not exist
      (fs.access as any).mockRejectedValueOnce(new Error('ENOENT'));
      
      await repository.initialize();
      
      expect(fs.mkdir).toHaveBeenCalledWith(testBasePath, { recursive: true });
    });

    it('should load all translations on initialization', async () => {
      // Mock directory exists
      (fs.readdir as any).mockResolvedValueOnce(['en.json', 'ja.json']);
      
      // Mock translation files
      mockTranslationFile('en', { greeting: 'Hello' });
      mockTranslationFile('ja', { greeting: 'こんにちは' });
      
      await repository.initialize();
      
      expect(fs.readdir).toHaveBeenCalledWith(testBasePath);
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTranslation', () => {
    it('should return a translation if it exists', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json']);
      mockTranslationFile('en', { greeting: 'Hello' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const translation = await repository.getTranslation('greeting', new Language('en'));
      
      expect(translation).not.toBeNull();
      expect(translation?.key).toBe('greeting');
      expect(translation?.text).toBe('Hello');
      expect(translation?.language.code).toBe('en');
    });

    it('should return null if translation does not exist', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json']);
      mockTranslationFile('en', { greeting: 'Hello' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const translation = await repository.getTranslation('nonexistent', new Language('en'));
      
      expect(translation).toBeNull();
    });
  });

  describe('getTranslationsForKey', () => {
    it('should return translations for a key in all languages', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json', 'ja.json']);
      mockTranslationFile('en', { greeting: 'Hello' });
      mockTranslationFile('ja', { greeting: 'こんにちは' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const translations = await repository.getTranslationsForKey('greeting');
      
      expect(translations.length).toBe(2);
      
      const enTranslation = translations.find(t => t.language.code === 'en');
      const jaTranslation = translations.find(t => t.language.code === 'ja');
      
      expect(enTranslation?.text).toBe('Hello');
      expect(jaTranslation?.text).toBe('こんにちは');
    });

    it('should return empty array if no translations exist for key', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json', 'ja.json']);
      mockTranslationFile('en', { greeting: 'Hello' });
      mockTranslationFile('ja', { greeting: 'こんにちは' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const translations = await repository.getTranslationsForKey('nonexistent');
      
      expect(translations.length).toBe(0);
    });
  });

  describe('getTranslationsForLanguage', () => {
    it('should return all translations for a language', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json']);
      mockTranslationFile('en', { 
        greeting: 'Hello', 
        farewell: 'Goodbye' 
      });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const translations = await repository.getTranslationsForLanguage(new Language('en'));
      
      expect(translations.length).toBe(2);
      
      const greeting = translations.find(t => t.key === 'greeting');
      const farewell = translations.find(t => t.key === 'farewell');
      
      expect(greeting?.text).toBe('Hello');
      expect(farewell?.text).toBe('Goodbye');
    });

    it('should return empty array if no translations exist for language', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json']);
      mockTranslationFile('en', { greeting: 'Hello' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const translations = await repository.getTranslationsForLanguage(new Language('ja'));
      
      expect(translations.length).toBe(0);
    });
  });

  describe('saveTranslation', () => {
    it('should save a new translation', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce([]);
      
      // Initialize
      await repository.initialize();
      
      // Test
      const translation = new Translation(new Language('en'), 'greeting', 'Hello');
      const success = await repository.saveTranslation(translation);
      
      expect(success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      
      // Extract the written content
      const [filepath, content] = (fs.writeFile as any).mock.calls[0];
      const parsedContent = JSON.parse(content);
      
      expect(filepath).toBe(path.join(testBasePath, 'en.json'));
      expect(parsedContent.language).toBe('en');
      expect(parsedContent.translations.greeting).toBe('Hello');
    });

    it('should update an existing translation', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json']);
      mockTranslationFile('en', { greeting: 'Hello' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const translation = new Translation(new Language('en'), 'greeting', 'Hi');
      const success = await repository.saveTranslation(translation);
      
      expect(success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      
      // Extract the written content
      const [filepath, content] = (fs.writeFile as any).mock.calls[0];
      const parsedContent = JSON.parse(content);
      
      expect(filepath).toBe(path.join(testBasePath, 'en.json'));
      expect(parsedContent.language).toBe('en');
      expect(parsedContent.translations.greeting).toBe('Hi');
    });
  });

  describe('hasTranslation', () => {
    it('should return true if translation exists', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json']);
      mockTranslationFile('en', { greeting: 'Hello' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const exists = await repository.hasTranslation('greeting', new Language('en'));
      
      expect(exists).toBe(true);
    });

    it('should return false if translation does not exist', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json']);
      mockTranslationFile('en', { greeting: 'Hello' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const exists = await repository.hasTranslation('nonexistent', new Language('en'));
      
      expect(exists).toBe(false);
    });
  });

  describe('getAllKeys', () => {
    it('should return all translation keys from all languages', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json', 'ja.json']);
      mockTranslationFile('en', { 
        greeting: 'Hello', 
        farewell: 'Goodbye' 
      });
      mockTranslationFile('ja', { 
        greeting: 'こんにちは',
        welcome: 'ようこそ' 
      });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const keys = await repository.getAllKeys();
      
      expect(keys.length).toBe(3);
      expect(keys).toContain('greeting');
      expect(keys).toContain('farewell');
      expect(keys).toContain('welcome');
    });

    it('should return empty array if no translations exist', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce([]);
      
      // Initialize
      await repository.initialize();
      
      // Test
      const keys = await repository.getAllKeys();
      
      expect(keys.length).toBe(0);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported languages', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['en.json', 'ja.json']);
      mockTranslationFile('en', { greeting: 'Hello' });
      mockTranslationFile('ja', { greeting: 'こんにちは' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const languages = await repository.getSupportedLanguages();
      
      expect(languages.length).toBe(2);
      expect(languages[0].code).toBe('en');
      expect(languages[1].code).toBe('ja');
    });

    it('should return empty array if no translations exist', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce([]);
      
      // Initialize
      await repository.initialize();
      
      // Test
      const languages = await repository.getSupportedLanguages();
      
      expect(languages.length).toBe(0);
    });
  });
});
