/**
 * Unit tests for TemplateService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateService } from '../../../../src/application/templates/TemplateService.js';
import { ITemplateRepository } from '../../../../src/domain/templates/ITemplateRepository.js';
import { II18nRepository } from '../../../../src/domain/i18n/II18nRepository.js';
import { Template } from '../../../../src/domain/templates/Template.js';
import { Section } from '../../../../src/domain/templates/Section.js';
import { Language } from '../../../../src/domain/i18n/Language.js';
import { Translation } from '../../../../src/domain/i18n/Translation.js';

describe('TemplateService', () => {
  // Mock repositories
  let templateRepository: ITemplateRepository;
  let i18nRepository: II18nRepository;
  let service: TemplateService;

  // Helper function to create test templates
  const createTestTemplate = (id: string, type: string, names: Record<string, string>, sections: Section[] = []) => {
    return new Template(id, type, names, sections);
  };

  // Helper function to create test sections
  const createTestSection = (id: string, titles: Record<string, string>, contents: Record<string, string> = {}, isOptional: boolean = false) => {
    return new Section(id, titles, contents, isOptional);
  };

  beforeEach(() => {
    // Create mocks for repositories
    templateRepository = {
      getTemplate: vi.fn(),
      getTemplateAsMarkdown: vi.fn(),
      getTemplatesByType: vi.fn(),
      saveTemplate: vi.fn(),
      templateExists: vi.fn(),
      getAllTemplateIds: vi.fn(),
      getAllTemplateTypes: vi.fn()
    };

    i18nRepository = {
      getTranslation: vi.fn(),
      getTranslationsForKey: vi.fn(),
      getTranslationsForLanguage: vi.fn(),
      saveTranslation: vi.fn(),
      hasTranslation: vi.fn(),
      getAllKeys: vi.fn(),
      getSupportedLanguages: vi.fn()
    };

    // Create service with mocked repositories
    service = new TemplateService(templateRepository, i18nRepository);
  });

  describe('getTemplate', () => {
    it('should get template by ID', async () => {
      // Arrange
      const template = createTestTemplate('template1', 'type1', { en: 'Template 1' });
      (templateRepository.getTemplate as any).mockResolvedValue(template);

      // Act
      const result = await service.getTemplate('template1');

      // Assert
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('template1');
      expect(result).toBe(template);
    });

    it('should return null if template not found', async () => {
      // Arrange
      (templateRepository.getTemplate as any).mockResolvedValue(null);

      // Act
      const result = await service.getTemplate('nonexistent');

      // Assert
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getTemplatesByType', () => {
    it('should get templates by type', async () => {
      // Arrange
      const templates = [
        createTestTemplate('template1', 'type1', { en: 'Template 1' }),
        createTestTemplate('template2', 'type1', { en: 'Template 2' })
      ];
      (templateRepository.getTemplatesByType as any).mockResolvedValue(templates);

      // Act
      const result = await service.getTemplatesByType('type1');

      // Assert
      expect(templateRepository.getTemplatesByType).toHaveBeenCalledWith('type1');
      expect(result).toBe(templates);
      expect(result.length).toBe(2);
    });
  });

  describe('renderTemplateAsMarkdown', () => {
    it('should render template as markdown', async () => {
      // Arrange
      const markdown = '# Template 1\n\n## Section 1\n\nContent';
      const language = new Language('en');
      (templateRepository.getTemplateAsMarkdown as any).mockResolvedValue(markdown);

      // Act
      const result = await service.renderTemplateAsMarkdown('template1', language);

      // Assert
      expect(templateRepository.getTemplateAsMarkdown).toHaveBeenCalledWith('template1', language, undefined);
      expect(result).toBe(markdown);
    });

    it('should render template with variables', async () => {
      // Arrange
      const markdown = '# Hello Alice\n\nWelcome!';
      const language = new Language('en');
      const variables = { name: 'Alice' };
      (templateRepository.getTemplateAsMarkdown as any).mockResolvedValue(markdown);

      // Act
      const result = await service.renderTemplateAsMarkdown('template1', language, variables);

      // Assert
      expect(templateRepository.getTemplateAsMarkdown).toHaveBeenCalledWith('template1', language, variables);
      expect(result).toBe(markdown);
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      // Arrange
      (templateRepository.templateExists as any).mockResolvedValue(false);
      (templateRepository.saveTemplate as any).mockResolvedValue(true);

      // Act
      const result = await service.createTemplate('template1', 'type1', { en: 'Template 1' });

      // Assert
      expect(templateRepository.templateExists).toHaveBeenCalledWith('template1');
      expect(templateRepository.saveTemplate).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Template);
      expect(result.id).toBe('template1');
      expect(result.type).toBe('type1');
      expect(result.nameMap.en).toBe('Template 1');
    });

    it('should throw error if template already exists', async () => {
      // Arrange
      (templateRepository.templateExists as any).mockResolvedValue(true);

      // Act & Assert
      await expect(service.createTemplate('template1', 'type1', { en: 'Template 1' }))
        .rejects.toThrow("Template with ID 'template1' already exists");
      
      expect(templateRepository.templateExists).toHaveBeenCalledWith('template1');
      expect(templateRepository.saveTemplate).not.toHaveBeenCalled();
    });

    it('should throw error if save fails', async () => {
      // Arrange
      (templateRepository.templateExists as any).mockResolvedValue(false);
      (templateRepository.saveTemplate as any).mockResolvedValue(false);

      // Act & Assert
      await expect(service.createTemplate('template1', 'type1', { en: 'Template 1' }))
        .rejects.toThrow("Failed to save template 'template1'");
      
      expect(templateRepository.templateExists).toHaveBeenCalledWith('template1');
      expect(templateRepository.saveTemplate).toHaveBeenCalled();
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      // Arrange
      const template = createTestTemplate('template1', 'type1', { en: 'Updated Template' });
      (templateRepository.templateExists as any).mockResolvedValue(true);
      (templateRepository.saveTemplate as any).mockResolvedValue(true);

      // Act
      const result = await service.updateTemplate(template);

      // Assert
      expect(templateRepository.templateExists).toHaveBeenCalledWith('template1');
      expect(templateRepository.saveTemplate).toHaveBeenCalledWith(template);
      expect(result).toBe(true);
    });

    it('should throw error if template does not exist', async () => {
      // Arrange
      const template = createTestTemplate('template1', 'type1', { en: 'Template 1' });
      (templateRepository.templateExists as any).mockResolvedValue(false);

      // Act & Assert
      await expect(service.updateTemplate(template))
        .rejects.toThrow("Template with ID 'template1' does not exist");
      
      expect(templateRepository.templateExists).toHaveBeenCalledWith('template1');
      expect(templateRepository.saveTemplate).not.toHaveBeenCalled();
    });
  });

  describe('addSection', () => {
    it('should add a section to a template', async () => {
      // Arrange
      const template = createTestTemplate('template1', 'type1', { en: 'Template 1' });
      const updatedTemplate = createTestTemplate(
        'template1',
        'type1',
        { en: 'Template 1' },
        [createTestSection('section1', { en: 'Section 1' }, { en: 'Content' })]
      );
      
      (templateRepository.getTemplate as any).mockResolvedValue(template);
      (templateRepository.saveTemplate as any).mockResolvedValue(true);
      
      // Mock the template methods (since we can't spy on them directly)
      const withSectionSpy = vi.spyOn(template, 'withSection').mockReturnValue(updatedTemplate);

      // Act
      const result = await service.addSection(
        'template1',
        'section1',
        { en: 'Section 1' },
        { en: 'Content' }
      );

      // Assert
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('template1');
      expect(withSectionSpy).toHaveBeenCalled();
      expect(templateRepository.saveTemplate).toHaveBeenCalledWith(updatedTemplate);
      expect(result).toBe(updatedTemplate);
    });

    it('should throw error if template not found', async () => {
      // Arrange
      (templateRepository.getTemplate as any).mockResolvedValue(null);

      // Act & Assert
      await expect(service.addSection('template1', 'section1', { en: 'Section 1' }))
        .rejects.toThrow("Template with ID 'template1' not found");
      
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('template1');
      expect(templateRepository.saveTemplate).not.toHaveBeenCalled();
    });

    it('should throw error if save fails', async () => {
      // Arrange
      const template = createTestTemplate('template1', 'type1', { en: 'Template 1' });
      const updatedTemplate = createTestTemplate(
        'template1',
        'type1',
        { en: 'Template 1' },
        [createTestSection('section1', { en: 'Section 1' })]
      );
      
      (templateRepository.getTemplate as any).mockResolvedValue(template);
      (templateRepository.saveTemplate as any).mockResolvedValue(false);
      
      // Mock the template methods
      vi.spyOn(template, 'withSection').mockReturnValue(updatedTemplate);

      // Act & Assert
      await expect(service.addSection('template1', 'section1', { en: 'Section 1' }))
        .rejects.toThrow("Failed to add section to template 'template1'");
      
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('template1');
      expect(templateRepository.saveTemplate).toHaveBeenCalledWith(updatedTemplate);
    });
  });

  describe('removeSection', () => {
    it('should remove a section from a template', async () => {
      // Arrange
      const section = createTestSection('section1', { en: 'Section 1' });
      const template = createTestTemplate(
        'template1',
        'type1',
        { en: 'Template 1' },
        [section]
      );
      
      const updatedTemplate = createTestTemplate('template1', 'type1', { en: 'Template 1' });
      
      (templateRepository.getTemplate as any).mockResolvedValue(template);
      (templateRepository.saveTemplate as any).mockResolvedValue(true);
      
      // Mock the template methods
      vi.spyOn(template, 'getSection').mockReturnValue(section);
      vi.spyOn(template, 'withoutSection').mockReturnValue(updatedTemplate);

      // Act
      const result = await service.removeSection('template1', 'section1');

      // Assert
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('template1');
      expect(template.getSection).toHaveBeenCalledWith('section1');
      expect(template.withoutSection).toHaveBeenCalledWith('section1');
      expect(templateRepository.saveTemplate).toHaveBeenCalledWith(updatedTemplate);
      expect(result).toBe(updatedTemplate);
    });

    it('should throw error if template not found', async () => {
      // Arrange
      (templateRepository.getTemplate as any).mockResolvedValue(null);

      // Act & Assert
      await expect(service.removeSection('template1', 'section1'))
        .rejects.toThrow("Template with ID 'template1' not found");
      
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('template1');
      expect(templateRepository.saveTemplate).not.toHaveBeenCalled();
    });

    it('should throw error if section not found', async () => {
      // Arrange
      const template = createTestTemplate('template1', 'type1', { en: 'Template 1' });
      
      (templateRepository.getTemplate as any).mockResolvedValue(template);
      
      // Mock the template methods
      vi.spyOn(template, 'getSection').mockReturnValue(null);

      // Act & Assert
      await expect(service.removeSection('template1', 'section1'))
        .rejects.toThrow("Section with ID 'section1' not found in template 'template1'");
      
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('template1');
      expect(template.getSection).toHaveBeenCalledWith('section1');
      expect(templateRepository.saveTemplate).not.toHaveBeenCalled();
    });
  });

  describe('updateSection', () => {
    it('should update a section in a template', async () => {
      // Arrange
      const existingSection = createTestSection('section1', { en: 'Old Title' });
      const updatedSection = createTestSection('section1', { en: 'New Title' });
      
      const template = createTestTemplate(
        'template1',
        'type1',
        { en: 'Template 1' },
        [existingSection]
      );
      
      const updatedTemplate = createTestTemplate(
        'template1',
        'type1',
        { en: 'Template 1' },
        [updatedSection]
      );
      
      (templateRepository.getTemplate as any).mockResolvedValue(template);
      (templateRepository.saveTemplate as any).mockResolvedValue(true);
      
      // Mock the template methods
      vi.spyOn(template, 'getSection').mockReturnValue(existingSection);
      vi.spyOn(template, 'withSection').mockReturnValue(updatedTemplate);

      // Act
      const result = await service.updateSection('template1', updatedSection);

      // Assert
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('template1');
      expect(template.getSection).toHaveBeenCalledWith('section1');
      expect(template.withSection).toHaveBeenCalledWith(updatedSection);
      expect(templateRepository.saveTemplate).toHaveBeenCalledWith(updatedTemplate);
      expect(result).toBe(updatedTemplate);
    });

    it('should throw error if template not found', async () => {
      // Arrange
      const section = createTestSection('section1', { en: 'Section 1' });
      (templateRepository.getTemplate as any).mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateSection('template1', section))
        .rejects.toThrow("Template with ID 'template1' not found");
      
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('template1');
      expect(templateRepository.saveTemplate).not.toHaveBeenCalled();
    });

    it('should throw error if section not found', async () => {
      // Arrange
      const section = createTestSection('section1', { en: 'Section 1' });
      const template = createTestTemplate('template1', 'type1', { en: 'Template 1' });
      
      (templateRepository.getTemplate as any).mockResolvedValue(template);
      
      // Mock the template methods
      vi.spyOn(template, 'getSection').mockReturnValue(null);

      // Act & Assert
      await expect(service.updateSection('template1', section))
        .rejects.toThrow("Section with ID 'section1' not found in template 'template1'");
      
      expect(templateRepository.getTemplate).toHaveBeenCalledWith('template1');
      expect(template.getSection).toHaveBeenCalledWith('section1');
      expect(templateRepository.saveTemplate).not.toHaveBeenCalled();
    });
  });

  describe('getAllTemplateIds', () => {
    it('should get all template IDs', async () => {
      // Arrange
      const ids = ['template1', 'template2', 'template3'];
      (templateRepository.getAllTemplateIds as any).mockResolvedValue(ids);

      // Act
      const result = await service.getAllTemplateIds();

      // Assert
      expect(templateRepository.getAllTemplateIds).toHaveBeenCalled();
      expect(result).toBe(ids);
      expect(result.length).toBe(3);
    });
  });

  describe('getAllTemplateTypes', () => {
    it('should get all template types', async () => {
      // Arrange
      const types = ['type1', 'type2'];
      (templateRepository.getAllTemplateTypes as any).mockResolvedValue(types);

      // Act
      const result = await service.getAllTemplateTypes();

      // Assert
      expect(templateRepository.getAllTemplateTypes).toHaveBeenCalled();
      expect(result).toBe(types);
      expect(result.length).toBe(2);
    });
  });
});
