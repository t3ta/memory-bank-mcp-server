/**
 * Unit tests for Language domain model
 */
import { Language, LanguageCode } from '../../../../src/domain/i18n/Language.js';

describe('Language Domain Model', () => {
  describe('constructor', () => {
    it('should create a Language instance with valid code', () => {
      const language = new Language('en');
      expect(language.code).toBe('en');
    });

    it('should throw error for unsupported language code', () => {
      expect(() => new Language('xyz')).toThrow('Unsupported language code: xyz');
    });
  });

  describe('create', () => {
    it('should create a Language instance with valid code', () => {
      const language = Language.create('ja');
      expect(language.code).toBe('ja');
    });

    it('should throw error for unsupported language code', () => {
      expect(() => Language.create('xyz')).toThrow('Unsupported language code: xyz');
    });
  });

  describe('default', () => {
    it('should create a default Language instance (English)', () => {
      const language = Language.default();
      expect(language.code).toBe('en');
    });
  });

  describe('supportedLanguages', () => {
    it('should return array of supported language codes', () => {
      const supported = Language.supportedLanguages();
      expect(supported).toContain('en');
      expect(supported).toContain('ja');
      expect(supported).toContain('zh');
      expect(supported.length).toBe(3);
    });
  });

  describe('equals', () => {
    it('should return true for languages with same code', () => {
      const lang1 = new Language('en');
      const lang2 = new Language('en');
      expect(lang1.equals(lang2)).toBe(true);
    });

    it('should return false for languages with different codes', () => {
      const lang1 = new Language('en');
      const lang2 = new Language('ja');
      expect(lang1.equals(lang2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the language code as string', () => {
      const language = new Language('zh');
      expect(language.toString()).toBe('zh');
    });
  });
});
