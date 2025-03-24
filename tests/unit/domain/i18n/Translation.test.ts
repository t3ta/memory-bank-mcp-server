/**
 * Unit tests for Translation domain model
 */
import { Translation } from '../../../../src/domain/i18n/Translation.js';
import { Language } from '../../../../src/domain/i18n/Language.js';

describe('Translation Domain Model', () => {
  describe('constructor', () => {
    it('should create a Translation instance with valid parameters', () => {
      const language = new Language('en');
      const key = 'greeting';
      const text = 'Hello, world!';
      
      const translation = new Translation(language, key, text);
      
      expect(translation.language.code).toBe('en');
      expect(translation.key).toBe('greeting');
      expect(translation.text).toBe('Hello, world!');
    });

    it('should throw error for empty key', () => {
      const language = new Language('en');
      expect(() => new Translation(language, '', 'text')).toThrow('Translation key cannot be empty');
    });

    it('should throw error for empty text', () => {
      const language = new Language('en');
      expect(() => new Translation(language, 'key', '')).toThrow('Translation text cannot be empty');
    });
  });

  describe('create', () => {
    it('should create a Translation instance with valid parameters', () => {
      const language = new Language('ja');
      const key = 'greeting';
      const text = 'こんにちは、世界！';
      
      const translation = Translation.create(language, key, text);
      
      expect(translation.language.code).toBe('ja');
      expect(translation.key).toBe('greeting');
      expect(translation.text).toBe('こんにちは、世界！');
    });
  });

  describe('withReplacedVariables', () => {
    it('should replace variables in the translation text', () => {
      const language = new Language('en');
      const key = 'welcome';
      const text = 'Welcome, {{name}}! Your account was created on {{date}}.';
      
      const translation = new Translation(language, key, text);
      const variables = {
        name: 'Alice',
        date: '2025-03-22'
      };
      
      const replaced = translation.withReplacedVariables(variables);
      
      expect(replaced.text).toBe('Welcome, Alice! Your account was created on 2025-03-22.');
      expect(replaced.key).toBe(key);
      expect(replaced.language).toBe(language);
    });

    it('should keep text unchanged when no variables present', () => {
      const language = new Language('en');
      const key = 'greeting';
      const text = 'Hello, world!';
      
      const translation = new Translation(language, key, text);
      const variables = {
        name: 'Alice'
      };
      
      const replaced = translation.withReplacedVariables(variables);
      
      expect(replaced.text).toBe('Hello, world!');
    });

    it('should keep variables unchanged when no matching variables provided', () => {
      const language = new Language('en');
      const key = 'welcome';
      const text = 'Welcome, {{name}}!';
      
      const translation = new Translation(language, key, text);
      const variables = {
        date: '2025-03-22'
      };
      
      const replaced = translation.withReplacedVariables(variables);
      
      expect(replaced.text).toBe('Welcome, {{name}}!');
    });
  });

  describe('equals', () => {
    it('should return true for translations with same properties', () => {
      const lang = new Language('en');
      const trans1 = new Translation(lang, 'key', 'text');
      const trans2 = new Translation(lang, 'key', 'text');
      
      expect(trans1.equals(trans2)).toBe(true);
    });

    it('should return false for translations with different language', () => {
      const lang1 = new Language('en');
      const lang2 = new Language('ja');
      const trans1 = new Translation(lang1, 'key', 'text');
      const trans2 = new Translation(lang2, 'key', 'text');
      
      expect(trans1.equals(trans2)).toBe(false);
    });

    it('should return false for translations with different key', () => {
      const lang = new Language('en');
      const trans1 = new Translation(lang, 'key1', 'text');
      const trans2 = new Translation(lang, 'key2', 'text');
      
      expect(trans1.equals(trans2)).toBe(false);
    });

    it('should return false for translations with different text', () => {
      const lang = new Language('en');
      const trans1 = new Translation(lang, 'key', 'text1');
      const trans2 = new Translation(lang, 'key', 'text2');
      
      expect(trans1.equals(trans2)).toBe(false);
    });
  });
});
