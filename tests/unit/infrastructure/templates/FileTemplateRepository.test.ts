/**
 * Unit tests for FileTemplateRepository
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { vi } from 'jest';
import fs from 'fs/promises';
import path from 'path';
import { FileTemplateRepository } from '../../../../src/infrastructure/templates/FileTemplateRepository.js';
import { Template } from '../../../../src/domain/templates/Template.js';
import { Section } from '../../../../src/domain/templates/Section.js';
import { Language } from '../../../../src/domain/i18n/Language.js';

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

describe('FileTemplateRepository', () => {
  const testBasePath = '/test/templates';
  let repository: FileTemplateRepository;

  // Helper function to create a test template file
  const mockTemplateFile = (id: string, type: string, names: Record<string, string>, sections: any[] = []) => {
    const content = JSON.stringify({
      id,
      type,
      names,
      sections,
      lastModified: new Date().toISOString()
    });

    (fs.readFile as any).mockImplementationOnce(() => content);
  };

  // Helper function to create test templates
  const createTestTemplate = (id: string, type: string, names: Record<string, string>, sections: Section[] = []) => {
    return new Template(id, type, names, sections);
  };

  // Helper function to create test sections
  const createTestSection = (id: string, titles: Record<string, string>, contents: Record<string, string> = {}, isOptional: boolean = false) => {
    return new Section(id, titles, contents, isOptional);
  };

  beforeEach(() => {
    repository = new FileTemplateRepository(testBasePath);
    
    // Reset mocks
    vi.resetAllMocks();
    
    // Default successful access
    (fs.access as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialize', () => {
    it('should create the templates directory if it does not exist', async () => {
      // Mock directory does not exist
      (fs.access as any).mockRejectedValueOnce(new Error('ENOENT'));
      
      await repository.initialize();
      
      expect(fs.mkdir).toHaveBeenCalledWith(testBasePath, { recursive: true });
    });

    it('should load all templates on initialization', async () => {
      // Mock directory exists
      (fs.readdir as any).mockResolvedValueOnce(['template1.json', 'template2.json']);
      
      // Mock template files
      mockTemplateFile('template1', 'type1', { en: 'Template 1' });
      mockTemplateFile('template2', 'type2', { en: 'Template 2' });
      
      await repository.initialize();
      
      expect(fs.readdir).toHaveBeenCalledWith(testBasePath);
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTemplate', () => {
    it('should return a template if it exists', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json']);
      mockTemplateFile('template1', 'type1', { en: 'Template 1' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const template = await repository.getTemplate('template1');
      
      expect(template).not.toBeNull();
      expect(template?.id).toBe('template1');
      expect(template?.type).toBe('type1');
      expect(template?.nameMap.en).toBe('Template 1');
    });

    it('should return null if template does not exist', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json']);
      mockTemplateFile('template1', 'type1', { en: 'Template 1' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const template = await repository.getTemplate('nonexistent');
      
      expect(template).toBeNull();
    });
  });

  describe('getTemplateAsMarkdown', () => {
    it('should convert template to Markdown format', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json']);
      
      // Create a template with sections
      const sections = [
        {
          id: 'section1',
          titles: { en: 'Section 1' },
          contents: { en: 'Section 1 content' },
          isOptional: false
        },
        {
          id: 'section2',
          titles: { en: 'Section 2' },
          contents: { en: 'Section 2 content' },
          isOptional: false
        }
      ];
      
      mockTemplateFile('template1', 'type1', { en: 'Template 1' }, sections);
      
      // Initialize
      await repository.initialize();
      
      // Test
      const markdown = await repository.getTemplateAsMarkdown('template1', new Language('en'));
      
      expect(markdown).toContain('# Template 1');
      expect(markdown).toContain('## Section 1');
      expect(markdown).toContain('Section 1 content');
      expect(markdown).toContain('## Section 2');
      expect(markdown).toContain('Section 2 content');
    });

    it('should replace variables in Markdown content', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json']);
      
      // Create a template with sections
      const sections = [
        {
          id: 'section1',
          titles: { en: 'Hello {{name}}' },
          contents: { en: 'Welcome, {{name}}! Today is {{date}}.' },
          isOptional: false
        }
      ];
      
      mockTemplateFile('template1', 'type1', { en: 'Template 1' }, sections);
      
      // Initialize
      await repository.initialize();
      
      // Test
      const variables = {
        name: 'Alice',
        date: '2025-03-22'
      };
      
      const markdown = await repository.getTemplateAsMarkdown('template1', new Language('en'), variables);
      
      expect(markdown).toContain('# Template 1');
      expect(markdown).toContain('## Hello Alice');
      expect(markdown).toContain('Welcome, Alice! Today is 2025-03-22.');
    });

    it('should throw error if template not found', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce([]);
      
      // Initialize
      await repository.initialize();
      
      // Test
      await expect(repository.getTemplateAsMarkdown('nonexistent', new Language('en')))
        .rejects.toThrow('Template not found: nonexistent');
    });
  });

  describe('getTemplatesByType', () => {
    it('should return templates of specified type', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json', 'template2.json', 'template3.json']);
      
      mockTemplateFile('template1', 'type1', { en: 'Template 1' });
      mockTemplateFile('template2', 'type1', { en: 'Template 2' });
      mockTemplateFile('template3', 'type2', { en: 'Template 3' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const templates = await repository.getTemplatesByType('type1');
      
      expect(templates.length).toBe(2);
      expect(templates[0].id).toBe('template1');
      expect(templates[1].id).toBe('template2');
    });

    it('should return empty array if no templates of specified type', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json', 'template2.json']);
      
      mockTemplateFile('template1', 'type1', { en: 'Template 1' });
      mockTemplateFile('template2', 'type1', { en: 'Template 2' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const templates = await repository.getTemplatesByType('nonexistent');
      
      expect(templates.length).toBe(0);
    });
  });

  describe('saveTemplate', () => {
    it('should save a new template', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce([]);
      
      // Initialize
      await repository.initialize();
      
      // Test
      const template = createTestTemplate('template1', 'type1', { en: 'Template 1' });
      const success = await repository.saveTemplate(template);
      
      expect(success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      
      // Extract the written content
      const [filepath, content] = (fs.writeFile as any).mock.calls[0];
      const parsedContent = JSON.parse(content);
      
      expect(filepath).toBe(path.join(testBasePath, 'template1.json'));
      expect(parsedContent.id).toBe('template1');
      expect(parsedContent.type).toBe('type1');
      expect(parsedContent.names.en).toBe('Template 1');
    });

    it('should update an existing template', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json']);
      mockTemplateFile('template1', 'type1', { en: 'Template 1' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const template = createTestTemplate('template1', 'type1', { 
        en: 'Updated Template 1',
        ja: 'テンプレート 1' 
      });
      
      const success = await repository.saveTemplate(template);
      
      expect(success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      
      // Extract the written content
      const [filepath, content] = (fs.writeFile as any).mock.calls[0];
      const parsedContent = JSON.parse(content);
      
      expect(filepath).toBe(path.join(testBasePath, 'template1.json'));
      expect(parsedContent.id).toBe('template1');
      expect(parsedContent.names.en).toBe('Updated Template 1');
      expect(parsedContent.names.ja).toBe('テンプレート 1');
    });

    it('should save template with sections', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce([]);
      
      // Initialize
      await repository.initialize();
      
      // Test
      const sections = [
        createTestSection('section1', { en: 'Section 1' }, { en: 'Content 1' }),
        createTestSection('section2', { en: 'Section 2' }, { en: 'Content 2' }, true)
      ];
      
      const template = createTestTemplate('template1', 'type1', { en: 'Template 1' }, sections);
      const success = await repository.saveTemplate(template);
      
      expect(success).toBe(true);
      
      // Extract the written content
      const [filepath, content] = (fs.writeFile as any).mock.calls[0];
      const parsedContent = JSON.parse(content);
      
      expect(parsedContent.sections.length).toBe(2);
      expect(parsedContent.sections[0].id).toBe('section1');
      expect(parsedContent.sections[0].titles.en).toBe('Section 1');
      expect(parsedContent.sections[0].contents.en).toBe('Content 1');
      expect(parsedContent.sections[0].isOptional).toBe(false);
      
      expect(parsedContent.sections[1].id).toBe('section2');
      expect(parsedContent.sections[1].isOptional).toBe(true);
    });
  });

  describe('templateExists', () => {
    it('should return true if template exists', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json']);
      mockTemplateFile('template1', 'type1', { en: 'Template 1' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const exists = await repository.templateExists('template1');
      
      expect(exists).toBe(true);
    });

    it('should return false if template does not exist', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json']);
      mockTemplateFile('template1', 'type1', { en: 'Template 1' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const exists = await repository.templateExists('nonexistent');
      
      expect(exists).toBe(false);
    });
  });

  describe('getAllTemplateIds', () => {
    it('should return all template IDs', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json', 'template2.json']);
      mockTemplateFile('template1', 'type1', { en: 'Template 1' });
      mockTemplateFile('template2', 'type2', { en: 'Template 2' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const ids = await repository.getAllTemplateIds();
      
      expect(ids.length).toBe(2);
      expect(ids).toContain('template1');
      expect(ids).toContain('template2');
    });

    it('should return empty array if no templates exist', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce([]);
      
      // Initialize
      await repository.initialize();
      
      // Test
      const ids = await repository.getAllTemplateIds();
      
      expect(ids.length).toBe(0);
    });
  });

  describe('getAllTemplateTypes', () => {
    it('should return all template types', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce(['template1.json', 'template2.json', 'template3.json']);
      mockTemplateFile('template1', 'type1', { en: 'Template 1' });
      mockTemplateFile('template2', 'type2', { en: 'Template 2' });
      mockTemplateFile('template3', 'type1', { en: 'Template 3' });
      
      // Initialize
      await repository.initialize();
      
      // Test
      const types = await repository.getAllTemplateTypes();
      
      expect(types.length).toBe(2);
      expect(types).toContain('type1');
      expect(types).toContain('type2');
    });

    it('should return empty array if no templates exist', async () => {
      // Mock directory and file access
      (fs.readdir as any).mockResolvedValueOnce([]);
      
      // Initialize
      await repository.initialize();
      
      // Test
      const types = await repository.getAllTemplateTypes();
      
      expect(types.length).toBe(0);
    });
  });
});
