import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { MarkdownMigrationService } from '../../../src/migration/MarkdownMigrationService.js';
import { ITemplateRepository } from '../../../src/domain/templates/ITemplateRepository.js';
import { Template } from '../../../src/domain/templates/Template.js';
import { Section } from '../../../src/domain/templates/Section.js';
import { Language } from '../../../src/domain/i18n/Language.js';

// Mock the fs/promises module
jest.mock('fs/promises');

// Create a mock implementation of ITemplateRepository
class MockTemplateRepository implements ITemplateRepository {
  private templates: Map<string, Template> = new Map();

  async getTemplate(id: string): Promise<Template | null> {
    return this.templates.get(id) || null;
  }

  async getTemplateAsMarkdown(
    id: string,
    language: Language,
    variables?: Record<string, string>
  ): Promise<string> {
    const template = await this.getTemplate(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    let markdown = `# ${template.getName(language)}\n\n`;
    
    for (const section of template.sections) {
      const title = section.getTitle(language);
      const content = section.getContent(language);
      
      markdown += `## ${title}\n\n${content}\n\n`;
    }
    
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        markdown = markdown.replace(pattern, value);
      });
    }
    
    return markdown;
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    const result: Template[] = [];
    for (const template of this.templates.values()) {
      if (template.type === type) {
        result.push(template);
      }
    }
    return result;
  }

  async saveTemplate(template: Template): Promise<boolean> {
    this.templates.set(template.id, template);
    return true;
  }

  async templateExists(id: string): Promise<boolean> {
    return this.templates.has(id);
  }

  async getAllTemplateIds(): Promise<string[]> {
    return Array.from(this.templates.keys());
  }

  async getAllTemplateTypes(): Promise<string[]> {
    const types = new Set<string>();
    for (const template of this.templates.values()) {
      types.add(template.type);
    }
    return Array.from(types);
  }
}

describe('MarkdownMigrationService', () => {
  let repository: ITemplateRepository;
  let service: MarkdownMigrationService;
  const mockMarkdownDir = '/mock/markdown';
  const mockBackupDir = '/mock/backup';

  // Sample markdown content
  const sampleMarkdown = `# Test Template

## First Section

This is the content of the first section.

## Second Section

This is the content of the second section.
It has multiple lines.

`;

  beforeEach(() => {
    repository = new MockTemplateRepository();
    service = new MarkdownMigrationService(repository, mockMarkdownDir, mockBackupDir);
    
    // Mock fs functions
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue(['test-template.md', 'another-template.md', 'not-markdown.txt']);
    (fs.readFile as jest.Mock).mockImplementation((filePath) => {
      if (filePath === path.join(mockMarkdownDir, 'test-template.md')) {
        return Promise.resolve(sampleMarkdown);
      }
      if (filePath === path.join(mockMarkdownDir, 'another-template.md')) {
        return Promise.resolve('# Another Template\n\n## Only Section\n\nContent here.');
      }
      return Promise.reject(new Error('File not found'));
    });
    (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('migrateTemplate', () => {
    it('should convert markdown to template and save it', async () => {
      const templateId = await service.migrateTemplate('test-template');
      
      // Verify template was saved
      expect(templateId).toBe('test-template');
      
      // Verify template content
      const template = await repository.getTemplate('test-template');
      expect(template).not.toBeNull();
      expect(template?.getName(new Language('en'))).toBe('Test Template');
      expect(template?.sections.length).toBe(2);
      
      // Verify the backup was created
      expect(fs.copyFile).toHaveBeenCalledWith(
        path.join(mockMarkdownDir, 'test-template.md'),
        path.join(mockBackupDir, 'test-template.md')
      );
    });

    it('should correctly parse section titles and content', async () => {
      await service.migrateTemplate('test-template');
      
      const template = await repository.getTemplate('test-template');
      
      // Check first section
      const firstSection = template?.getSection('first-section');
      expect(firstSection).not.toBeNull();
      expect(firstSection?.getTitle(new Language('en'))).toBe('First Section');
      expect(firstSection?.getContent(new Language('en'))).toBe('This is the content of the first section.');
      
      // Check second section
      const secondSection = template?.getSection('second-section');
      expect(secondSection).not.toBeNull();
      expect(secondSection?.getTitle(new Language('en'))).toBe('Second Section');
      expect(secondSection?.getContent(new Language('en'))).toContain('This is the content of the second section.');
      expect(secondSection?.getContent(new Language('en'))).toContain('It has multiple lines.');
    });
  });

  describe('migrateAllTemplates', () => {
    it('should migrate all markdown files in the directory', async () => {
      const migratedIds = await service.migrateAllTemplates();
      
      expect(migratedIds.length).toBe(2);
      expect(migratedIds).toContain('test-template');
      expect(migratedIds).toContain('another-template');
      
      // Verify both templates were saved
      const testTemplate = await repository.getTemplate('test-template');
      const anotherTemplate = await repository.getTemplate('another-template');
      
      expect(testTemplate).not.toBeNull();
      expect(anotherTemplate).not.toBeNull();
    });

    it('should skip templates that already exist', async () => {
      // Add a template that already exists
      const existingTemplate = new Template('test-template', 'existing', { en: 'Existing Template' });
      await repository.saveTemplate(existingTemplate);
      
      const migratedIds = await service.migrateAllTemplates();
      
      // Should only migrate the one that doesn't exist
      expect(migratedIds.length).toBe(1);
      expect(migratedIds).toContain('another-template');
      expect(migratedIds).not.toContain('test-template');
      
      // Original template should not be overwritten
      const template = await repository.getTemplate('test-template');
      expect(template?.getName(new Language('en'))).toBe('Existing Template');
    });
  });

  describe('getMarkdownTemplate', () => {
    it('should return markdown content if file exists', async () => {
      const content = await service.getMarkdownTemplate('test-template');
      
      expect(content).toBe(sampleMarkdown);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockMarkdownDir, 'test-template.md'),
        'utf-8'
      );
    });

    it('should return null if file does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
      
      const content = await service.getMarkdownTemplate('non-existent');
      
      expect(content).toBeNull();
    });
  });

  describe('convertTemplateToMarkdown', () => {
    it('should convert a template to markdown format', () => {
      const template = new Template(
        'test-template',
        'test',
        { en: 'Test Template' },
        [
          new Section('section1', { en: 'Section 1' }, { en: 'Content 1' }),
          new Section('section2', { en: 'Section 2' }, { en: 'Content 2' })
        ]
      );
      
      const markdown = service.convertTemplateToMarkdown(template, new Language('en'));
      
      expect(markdown).toContain('# Test Template');
      expect(markdown).toContain('## Section 1');
      expect(markdown).toContain('Content 1');
      expect(markdown).toContain('## Section 2');
      expect(markdown).toContain('Content 2');
    });
  });

  describe('createMarkdownFile', () => {
    it('should create a markdown file from a template', async () => {
      // Add a template to the repository
      const template = new Template(
        'test-template',
        'test',
        { en: 'Test Template' },
        [
          new Section('section1', { en: 'Section 1' }, { en: 'Content 1' }),
          new Section('section2', { en: 'Section 2' }, { en: 'Content 2' })
        ]
      );
      await repository.saveTemplate(template);
      
      const outputPath = '/mock/output';
      const filePath = await service.createMarkdownFile('test-template', new Language('en'), outputPath);
      
      expect(filePath).toBe(path.join(outputPath, 'test-template.md'));
      
      // Verify directory was created
      expect(fs.mkdir).toHaveBeenCalledWith(outputPath, { recursive: true });
      
      // Verify file was written
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputPath, 'test-template.md'),
        expect.stringContaining('# Test Template'),
        'utf-8'
      );
    });

    it('should throw error if template does not exist', async () => {
      await expect(
        service.createMarkdownFile('non-existent', new Language('en'), '/mock/output')
      ).rejects.toThrow('Template not found');
    });
  });
});
