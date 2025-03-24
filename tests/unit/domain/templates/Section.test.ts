/**
 * Unit tests for Section domain model
 */
import { Section } from '../../../../src/domain/templates/Section.js';
import { Language } from '../../../../src/domain/i18n/Language.js';

describe('Section Domain Model', () => {
  describe('constructor', () => {
    it('should create a Section instance with valid parameters', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title', ja: 'セクションタイトル' };
      const contentMap = { en: 'Section content', ja: 'セクション内容' };
      const isOptional = false;
      
      const section = new Section(id, titleMap, contentMap, isOptional);
      
      expect(section.id).toBe('section-1');
      expect(section.titleMap).toEqual(titleMap);
      expect(section.contentMap).toEqual(contentMap);
      expect(section.isOptional).toBe(false);
    });

    it('should throw error for empty id', () => {
      const titleMap = { en: 'Section Title' };
      const contentMap = { en: 'Section content' };
      
      expect(() => new Section('', titleMap, contentMap)).toThrow('Section ID cannot be empty');
    });

    it('should throw error for empty title map', () => {
      const id = 'section-1';
      const contentMap = { en: 'Section content' };
      
      expect(() => new Section(id, {}, contentMap)).toThrow('Section must have at least one title translation');
    });

    it('should create section with empty content map', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      
      const section = new Section(id, titleMap);
      
      expect(section.contentMap).toEqual({});
    });

    it('should default isOptional to false', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      
      const section = new Section(id, titleMap);
      
      expect(section.isOptional).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a Section instance with valid parameters', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title', ja: 'セクションタイトル' };
      const contentMap = { en: 'Section content', ja: 'セクション内容' };
      const isOptional = true;
      
      const section = Section.create(id, titleMap, contentMap, isOptional);
      
      expect(section.id).toBe('section-1');
      expect(section.titleMap).toEqual(titleMap);
      expect(section.contentMap).toEqual(contentMap);
      expect(section.isOptional).toBe(true);
    });
  });

  describe('getTitle', () => {
    it('should return title for specified language', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title', ja: 'セクションタイトル' };
      const section = new Section(id, titleMap);
      const language = new Language('ja');
      
      expect(section.getTitle(language)).toBe('セクションタイトル');
    });

    it('should fall back to English if requested language not available', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title', ja: 'セクションタイトル' };
      const section = new Section(id, titleMap);
      const language = new Language('zh');
      
      expect(section.getTitle(language)).toBe('Section Title');
    });

    it('should fall back to first available language if English not available', () => {
      const id = 'section-1';
      const titleMap = { ja: 'セクションタイトル', zh: '节标题' };
      const section = new Section(id, titleMap);
      const language = new Language('en');
      
      // Should return first available (Japanese in this case)
      expect(section.getTitle(language)).toBe('セクションタイトル');
    });
  });

  describe('getContent', () => {
    it('should return content for specified language', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      const contentMap = { en: 'Section content', ja: 'セクション内容' };
      const section = new Section(id, titleMap, contentMap);
      const language = new Language('ja');
      
      expect(section.getContent(language)).toBe('セクション内容');
    });

    it('should fall back to English if requested language not available', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      const contentMap = { en: 'Section content', ja: 'セクション内容' };
      const section = new Section(id, titleMap, contentMap);
      const language = new Language('zh');
      
      expect(section.getContent(language)).toBe('Section content');
    });

    it('should fall back to first available language if English not available', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      const contentMap = { ja: 'セクション内容', zh: '节内容' };
      const section = new Section(id, titleMap, contentMap);
      const language = new Language('en');
      
      // Should return first available (Japanese in this case)
      expect(section.getContent(language)).toBe('セクション内容');
    });

    it('should return empty string if no content available', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      const section = new Section(id, titleMap);
      const language = new Language('en');
      
      expect(section.getContent(language)).toBe('');
    });
  });

  describe('withContent', () => {
    it('should add content for a language', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      const section = new Section(id, titleMap);
      
      const newSection = section.withContent('ja', 'セクション内容');
      
      expect(newSection.contentMap.ja).toBe('セクション内容');
      expect(newSection.id).toBe(section.id);
      expect(newSection.titleMap).toEqual(section.titleMap);
    });

    it('should update existing content for a language', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      const contentMap = { en: 'Original content', ja: 'オリジナル内容' };
      const section = new Section(id, titleMap, contentMap);
      
      const newSection = section.withContent('ja', '新しい内容');
      
      expect(newSection.contentMap.ja).toBe('新しい内容');
      expect(newSection.contentMap.en).toBe('Original content');
    });
  });

  describe('withTitle', () => {
    it('should add title for a language', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      const section = new Section(id, titleMap);
      
      const newSection = section.withTitle('ja', 'セクションタイトル');
      
      expect(newSection.titleMap.ja).toBe('セクションタイトル');
      expect(newSection.titleMap.en).toBe('Section Title');
    });

    it('should update existing title for a language', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title', ja: 'オリジナルタイトル' };
      const section = new Section(id, titleMap);
      
      const newSection = section.withTitle('ja', '新しいタイトル');
      
      expect(newSection.titleMap.ja).toBe('新しいタイトル');
      expect(newSection.titleMap.en).toBe('Section Title');
    });
  });

  describe('equals', () => {
    it('should return true for sections with same properties', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      const contentMap = { en: 'Content' };
      
      const section1 = new Section(id, titleMap, contentMap, false);
      const section2 = new Section(id, titleMap, contentMap, false);
      
      expect(section1.equals(section2)).toBe(true);
    });

    it('should return false for sections with different IDs', () => {
      const titleMap = { en: 'Section Title' };
      const contentMap = { en: 'Content' };
      
      const section1 = new Section('section-1', titleMap, contentMap);
      const section2 = new Section('section-2', titleMap, contentMap);
      
      expect(section1.equals(section2)).toBe(false);
    });

    it('should return false for sections with different title maps', () => {
      const id = 'section-1';
      const titleMap1 = { en: 'Section Title 1' };
      const titleMap2 = { en: 'Section Title 2' };
      const contentMap = { en: 'Content' };
      
      const section1 = new Section(id, titleMap1, contentMap);
      const section2 = new Section(id, titleMap2, contentMap);
      
      expect(section1.equals(section2)).toBe(false);
    });

    it('should return false for sections with different content maps', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      const contentMap1 = { en: 'Content 1' };
      const contentMap2 = { en: 'Content 2' };
      
      const section1 = new Section(id, titleMap, contentMap1);
      const section2 = new Section(id, titleMap, contentMap2);
      
      expect(section1.equals(section2)).toBe(false);
    });

    it('should return false for sections with different isOptional values', () => {
      const id = 'section-1';
      const titleMap = { en: 'Section Title' };
      const contentMap = { en: 'Content' };
      
      const section1 = new Section(id, titleMap, contentMap, false);
      const section2 = new Section(id, titleMap, contentMap, true);
      
      expect(section1.equals(section2)).toBe(false);
    });
  });
});
