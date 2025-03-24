/**
 * Unit tests for FileI18nRepository
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { FileI18nRepository } from '../../../../src/infrastructure/i18n/FileI18nRepository.js';
import { Language } from '../../../../src/domain/i18n/Language.js';
import { Translation } from '../../../../src/domain/i18n/Translation.js';

// Mock fs module
jest.mock('fs/promises');

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

    jest.spyOn(fs, 'readFile').mockResolvedValueOnce(content);
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up mock implementations
    jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(fs, 'access').mockResolvedValue(undefined);
    jest.spyOn(fs, 'readdir').mockResolvedValue([]);
    jest.spyOn(fs, 'readFile').mockResolvedValue('');
    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    
    repository = new FileI18nRepository(testBasePath);
  });

  describe('basic functionality', () => {
    it('should initialize properly', async () => {
      // Directory exists (no mkdir needed)
      await repository.initialize();
      // Check if init was called
      expect(fs.readdir).toHaveBeenCalledWith(testBasePath);
    });
    
    it('should create directory if not exists', async () => {
      jest.spyOn(fs, 'access').mockRejectedValueOnce(new Error('ENOENT'));
      await repository.initialize();
      expect(fs.mkdir).toHaveBeenCalledWith(testBasePath, { recursive: true });
    });
  });
  
  describe('getTranslation', () => {
    it('should return a translation if it exists', async () => {
      // Mock file system with TypeScript escape hatch
      (jest.spyOn(fs, 'readdir') as any).mockResolvedValueOnce(['en.json']);
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
      // Mock file system with TypeScript escape hatch
      (jest.spyOn(fs, 'readdir') as any).mockResolvedValueOnce(['en.json']);
      mockTranslationFile('en', { greeting: 'Hello' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const translation = await repository.getTranslation('nonexistent', new Language('en'));
      
      expect(translation).toBeNull();
    });
  });
});
