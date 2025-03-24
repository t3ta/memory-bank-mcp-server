/**
 * Unit tests for Template domain model
 */
import { Template } from '../../../../src/domain/templates/Template.js';
import { Section } from '../../../../src/domain/templates/Section.js';
import { Language } from '../../../../src/domain/i18n/Language.js';

describe('Template Domain Model', () => {
  // Helper to create a test section
  const createTestSection = (id: string, titleEn: string, contentEn?: string) => {
    const titleMap = { en: titleEn };
    const contentMap = contentEn ? { en: contentEn } : {};
    return new Section(id, titleMap, contentMap);
  };
  
  describe('constructor', () => {
    it('should create a Template instance with valid parameters', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template', ja: 'テストテンプレート' };
      const sections = [
        createTestSection('section-1', 'First Section', 'First section content'),
        createTestSection('section-2', 'Second Section', 'Second section content')
      ];
      
      const template = new Template(id, type, nameMap, sections);
      
      expect(template.id).toBe('template-1');
      expect(template.type).toBe('test-template');
      expect(template.nameMap).toEqual(nameMap);
      expect(template.sections.length).toBe(2);
      expect(template.sections[0].id).toBe('section-1');
      expect(template.sections[1].id).toBe('section-2');
    });

    it('should throw error for empty id', () => {
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      const sections = [createTestSection('section-1', 'Section')];
      
      expect(() => new Template('', type, nameMap, sections)).toThrow('Template ID cannot be empty');
    });

    it('should throw error for empty type', () => {
      const id = 'template-1';
      const nameMap = { en: 'Test Template' };
      const sections = [createTestSection('section-1', 'Section')];
      
      expect(() => new Template(id, '', nameMap, sections)).toThrow('Template type cannot be empty');
    });

    it('should throw error for empty name map', () => {
      const id = 'template-1';
      const type = 'test-template';
      const sections = [createTestSection('section-1', 'Section')];
      
      expect(() => new Template(id, type, {}, sections)).toThrow('Template must have at least one name translation');
    });

    it('should create template with empty sections array', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      
      const template = new Template(id, type, nameMap);
      
      expect(template.sections).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a Template instance with valid parameters', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template', ja: 'テストテンプレート' };
      const sections = [
        createTestSection('section-1', 'First Section'),
        createTestSection('section-2', 'Second Section')
      ];
      
      const template = Template.create(id, type, nameMap, sections);
      
      expect(template.id).toBe('template-1');
      expect(template.type).toBe('test-template');
      expect(template.nameMap).toEqual(nameMap);
      expect(template.sections.length).toBe(2);
    });
  });

  describe('getName', () => {
    it('should return name for specified language', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template', ja: 'テストテンプレート' };
      const template = new Template(id, type, nameMap);
      const language = new Language('ja');
      
      expect(template.getName(language)).toBe('テストテンプレート');
    });

    it('should fall back to English if requested language not available', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template', ja: 'テストテンプレート' };
      const template = new Template(id, type, nameMap);
      const language = new Language('zh');
      
      expect(template.getName(language)).toBe('Test Template');
    });

    it('should fall back to first available language if English not available', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { ja: 'テストテンプレート', zh: '测试模板' };
      const template = new Template(id, type, nameMap);
      const language = new Language('en');
      
      // Should return first available (Japanese in this case)
      expect(template.getName(language)).toBe('テストテンプレート');
    });
  });

  describe('getSection', () => {
    it('should return section by id if it exists', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      const sections = [
        createTestSection('section-1', 'First Section'),
        createTestSection('section-2', 'Second Section')
      ];
      
      const template = new Template(id, type, nameMap, sections);
      
      const section = template.getSection('section-1');
      expect(section).toBeDefined();
      expect(section?.id).toBe('section-1');
    });

    it('should return null if section does not exist', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      const sections = [createTestSection('section-1', 'First Section')];
      
      const template = new Template(id, type, nameMap, sections);
      
      const section = template.getSection('non-existent');
      expect(section).toBeNull();
    });
  });

  describe('withSection', () => {
    it('should add a new section if it does not exist', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      const sections = [createTestSection('section-1', 'First Section')];
      
      const template = new Template(id, type, nameMap, sections);
      const newSection = createTestSection('section-2', 'Second Section');
      
      const updatedTemplate = template.withSection(newSection);
      
      expect(updatedTemplate.sections.length).toBe(2);
      expect(updatedTemplate.sections[1].id).toBe('section-2');
    });

    it('should replace an existing section with the same id', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      const sections = [
        createTestSection('section-1', 'First Section', 'Original content')
      ];
      
      const template = new Template(id, type, nameMap, sections);
      const updatedSection = createTestSection('section-1', 'Updated Section', 'Updated content');
      
      const updatedTemplate = template.withSection(updatedSection);
      
      expect(updatedTemplate.sections.length).toBe(1);
      expect(updatedTemplate.sections[0].id).toBe('section-1');
      expect(updatedTemplate.sections[0].getTitle(new Language('en'))).toBe('Updated Section');
      expect(updatedTemplate.sections[0].getContent(new Language('en'))).toBe('Updated content');
    });
  });

  describe('withoutSection', () => {
    it('should remove a section by id if it exists', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      const sections = [
        createTestSection('section-1', 'First Section'),
        createTestSection('section-2', 'Second Section')
      ];
      
      const template = new Template(id, type, nameMap, sections);
      
      const updatedTemplate = template.withoutSection('section-1');
      
      expect(updatedTemplate.sections.length).toBe(1);
      expect(updatedTemplate.sections[0].id).toBe('section-2');
    });

    it('should return the same template if section does not exist', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      const sections = [createTestSection('section-1', 'First Section')];
      
      const template = new Template(id, type, nameMap, sections);
      
      const updatedTemplate = template.withoutSection('non-existent');
      
      expect(updatedTemplate.sections.length).toBe(1);
      expect(updatedTemplate).toBe(template); // Same instance if no changes
    });
  });

  describe('equals', () => {
    it('should return true for templates with same properties', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      const sections = [createTestSection('section-1', 'First Section')];
      
      const template1 = new Template(id, type, nameMap, sections);
      const template2 = new Template(id, type, nameMap, sections);
      
      expect(template1.equals(template2)).toBe(true);
    });

    it('should return false for templates with different IDs', () => {
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      const sections = [createTestSection('section-1', 'First Section')];
      
      const template1 = new Template('template-1', type, nameMap, sections);
      const template2 = new Template('template-2', type, nameMap, sections);
      
      expect(template1.equals(template2)).toBe(false);
    });

    it('should return false for templates with different types', () => {
      const id = 'template-1';
      const nameMap = { en: 'Test Template' };
      const sections = [createTestSection('section-1', 'First Section')];
      
      const template1 = new Template(id, 'type-1', nameMap, sections);
      const template2 = new Template(id, 'type-2', nameMap, sections);
      
      expect(template1.equals(template2)).toBe(false);
    });

    it('should return false for templates with different name maps', () => {
      const id = 'template-1';
      const type = 'test-template';
      const sections = [createTestSection('section-1', 'First Section')];
      
      const template1 = new Template(id, type, { en: 'Template 1' }, sections);
      const template2 = new Template(id, type, { en: 'Template 2' }, sections);
      
      expect(template1.equals(template2)).toBe(false);
    });

    it('should return false for templates with different sections', () => {
      const id = 'template-1';
      const type = 'test-template';
      const nameMap = { en: 'Test Template' };
      
      const template1 = new Template(id, type, nameMap, [
        createTestSection('section-1', 'First Section')
      ]);
      const template2 = new Template(id, type, nameMap, [
        createTestSection('section-2', 'Second Section')
      ]);
      
      expect(template1.equals(template2)).toBe(false);
    });
  });
});
