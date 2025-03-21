/**
 * Tests for template-schema.ts
 */
import { createJsonTemplate, createJsonTemplateSection, jsonTemplateSchema, validateJsonTemplate } from '../../../src/schemas/v2/template-schema';

describe('JSON Template Schema', () => {
  describe('jsonTemplateSchema', () => {
    it('should validate a valid template', () => {
      const validTemplate = {
        schema: 'template_v1',
        metadata: {
          id: 'test-template',
          name: { en: 'Test Template', ja: 'テストテンプレート', zh: 'Test Template' },
          type: 'test',
          lastModified: new Date().toISOString(),
        },
        content: {
          sections: {
            testSection: {
              title: { en: 'Test Section', ja: 'テストセクション', zh: 'Test Section' },
              content: { en: 'Test content', ja: 'テストコンテンツ', zh: 'Test content' },
            },
          },
        },
      };

      const result = jsonTemplateSchema.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid schema version', () => {
      const invalidTemplate = {
        schema: 'template_v2', // Invalid schema version
        metadata: {
          id: 'test-template',
          name: { en: 'Test Template', ja: 'テストテンプレート' },
          type: 'test',
          lastModified: new Date().toISOString(),
        },
        content: {
          sections: {},
        },
      };

      const result = jsonTemplateSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });

    it('should reject if required fields are missing', () => {
      const missingFieldsTemplate = {
        schema: 'template_v1',
        metadata: {
          // Missing id
          name: { en: 'Test Template' },
          // Missing type
          lastModified: new Date().toISOString(),
        },
        content: {
          // Missing sections
        },
      };

      const result = jsonTemplateSchema.safeParse(missingFieldsTemplate);
      expect(result.success).toBe(false);
    });
  });

  describe('validateJsonTemplate', () => {
    it('should validate a valid template', () => {
      const validTemplate = {
        schema: 'template_v1',
        metadata: {
          id: 'test-template',
          name: { en: 'Test Template', ja: 'テストテンプレート' },
          type: 'test',
          lastModified: new Date().toISOString(),
        },
        content: {
          sections: {
            testSection: {
              title: { en: 'Test Section', ja: 'テストセクション' },
              content: { en: 'Test content', ja: 'テストコンテンツ' },
            },
          },
        },
      };

      expect(() => validateJsonTemplate(validTemplate)).not.toThrow();
    });

    it('should throw a formatted error for invalid templates', () => {
      const invalidTemplate = {
        schema: 'template_v2', // Invalid
        metadata: {
          id: 'test-template',
          name: { en: 'Test Template' },
          // Missing type
          lastModified: '2023-01-01',
        },
        content: {},
      };

      expect(() => validateJsonTemplate(invalidTemplate)).toThrow('Invalid JSON template format:');
    });
  });

  describe('createJsonTemplate', () => {
    it('should create a valid template with required fields', () => {
      const id = 'test-template';
      const type = 'test';
      const nameMap = { en: 'Test Template', ja: 'テストテンプレート', zh: 'Test Template' };
      const sections = {
        testSection: createJsonTemplateSection(
          { en: 'Test Section', ja: 'テストセクション', zh: 'Test Section' },
          { en: 'Test content', ja: 'テストコンテンツ', zh: 'Test content' }
        ),
      };

      const template = createJsonTemplate(id, type, nameMap, sections);

      expect(template.schema).toBe('template_v1');
      expect(template.metadata.id).toBe(id);
      expect(template.metadata.type).toBe(type);
      expect(template.metadata.name).toEqual(nameMap);
      expect(template.content.sections).toEqual(sections);
      expect(template.metadata.lastModified).toBeDefined();
    });

    it('should include optional fields when provided', () => {
      const id = 'test-template';
      const type = 'test';
      const nameMap = { en: 'Test Template', ja: 'テストテンプレート', zh: 'Test Template' };
      const descriptionMap = { en: 'Test Description', ja: 'テスト説明', zh: 'Test Description' };
      const placeholders = { TITLE: 'The title placeholder' };
      const sections = {
        testSection: createJsonTemplateSection(
          { en: 'Test Section', ja: 'テストセクション', zh: 'Test Section' },
          { en: 'Test content', ja: 'テストコンテンツ', zh: 'Test content' }
        ),
      };

      const template = createJsonTemplate(
        id,
        type,
        nameMap,
        sections,
        descriptionMap,
        placeholders
      );

      expect(template.metadata.description).toEqual(descriptionMap);
      expect(template.content.placeholders).toEqual(placeholders);
    });
  });

  describe('createJsonTemplateSection', () => {
    it('should create a non-optional section by default', () => {
      const titleMap = { en: 'Test Section', ja: 'テストセクション', zh: 'Test Section' };
      const contentMap = { en: 'Test content', ja: 'テストコンテンツ', zh: 'Test content' };

      const section = createJsonTemplateSection(titleMap, contentMap);

      expect(section.title).toEqual(titleMap);
      expect(section.content).toEqual(contentMap);
      expect(section.optional).toBe(false);
    });

    it('should create an optional section when specified', () => {
      const titleMap = { en: 'Test Section', ja: 'テストセクション', zh: 'Test Section' };
      const contentMap = { en: 'Test content', ja: 'テストコンテンツ', zh: 'Test content' };

      const section = createJsonTemplateSection(titleMap, contentMap, true);

      expect(section.optional).toBe(true);
    });
  });
});
