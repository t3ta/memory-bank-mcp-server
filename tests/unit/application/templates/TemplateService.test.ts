import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { TemplateService } from '../../../../src/application/templates/TemplateService.js';
import { ITemplateRepository } from '../../../../src/domain/templates/ITemplateRepository.js';
import { Language } from '../../../../src/domain/i18n/Language.js';
import { Template } from '../../../../src/domain/templates/Template.js';
import { Section } from '../../../../src/domain/templates/Section.js';

// Mock repository implementation
class MockTemplateRepository implements ITemplateRepository {
  private templates: Map<string, Template> = new Map();

  constructor() {
    // Initialize with some test templates
    this.addTemplate('test-template', 'system', 
      { en: 'Test Template', ja: 'テストテンプレート' }, 
      [
        new Section('section1', { en: 'Section 1', ja: 'セクション1' }, { en: 'Content 1', ja: 'コンテンツ1' }),
        new Section('section2', { en: 'Section 2', ja: 'セクション2' }, { en: 'Content 2', ja: 'コンテンツ2' })
      ]
    );
  }

  private addTemplate(id: string, type: string, names: Record<string, string>, sections: Section[] = []): void {
    const template = new Template(id, type, names, sections);
    this.templates.set(id, template);
  }

  async getTemplate(id: string): Promise<Template | null> {
    return this.templates.get(id) || null;
  }

  async getTemplateAsMarkdown(
    id: string,
    language: Language,
    variables?: Record<string, string>
  ): Promise<string> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }
    
    let markdown = `# ${template.getName(language)}\n\n`;
    
    for (const section of template.sections) {
      const title = section.getTitle(language);
      const content = section.getContent(language);
      
      if (title) {
        markdown += `## ${title}\n\n`;
      }
      
      if (content) {
        markdown += `${content}\n\n`;
      }
    }
    
    // Replace variables if provided
    if (variables && Object.keys(variables).length > 0) {
      Object.entries(variables).forEach(([name, value]) => {
        const pattern = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
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

describe('TemplateService', () => {
  let repository: ITemplateRepository;
  let service: TemplateService;

  beforeEach(() => {
    repository = new MockTemplateRepository();
    service = new TemplateService(repository);
  });

  describe('getTemplate', () => {
    it('should return a template by id', async () => {
      const template = await service.getTemplate('test-template');
      expect(template).not.toBeNull();
      expect(template?.id).toBe('test-template');
      expect(template?.type).toBe('system');
    });

    it('should return null for non-existent template', async () => {
      const template = await service.getTemplate('non-existent');
      expect(template).toBeNull();
    });
  });

  describe('getTemplateAsMarkdown', () => {
    it('should return template as markdown for a specific language', async () => {
      const markdown = await service.getTemplateAsMarkdown('test-template', new Language('en'));
      expect(markdown).toContain('# Test Template');
      expect(markdown).toContain('## Section 1');
      expect(markdown).toContain('Content 1');
    });

    it('should replace variables in markdown', async () => {
      const templateWithVariables = new Template(
        'variable-template',
        'system',
        { en: 'Variable Template' },
        [new Section('section1', { en: 'Section' }, { en: 'Hello, {{name}}!' })]
      );
      
      // Add the template to the repository
      await repository.saveTemplate(templateWithVariables);
      
      const markdown = await service.getTemplateAsMarkdown(
        'variable-template', 
        new Language('en'),
        { name: 'World' }
      );
      
      expect(markdown).toContain('Hello, World!');
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        service.getTemplateAsMarkdown('non-existent', new Language('en'))
      ).rejects.toThrow('Template not found');
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const template = await service.createTemplate(
        'new-template',
        'custom',
        { en: 'New Template', ja: '新しいテンプレート' }
      );
      
      expect(template.id).toBe('new-template');
      expect(template.type).toBe('custom');
      expect(template.sections.length).toBe(0);
      
      // Verify it was saved to repository
      const savedTemplate = await repository.getTemplate('new-template');
      expect(savedTemplate).not.toBeNull();
    });

    it('should throw error if template id already exists', async () => {
      await expect(
        service.createTemplate(
          'test-template', // Already exists
          'custom',
          { en: 'Duplicate Template' }
        )
      ).rejects.toThrow('already exists');
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const updatedTemplate = await service.updateTemplate(
        'test-template',
        'updated-type',
        { en: 'Updated Template', ja: '更新されたテンプレート' }
      );
      
      expect(updatedTemplate.id).toBe('test-template');
      expect(updatedTemplate.type).toBe('updated-type');
      expect(updatedTemplate.getName(new Language('en'))).toBe('Updated Template');
      
      // Sections should be preserved
      expect(updatedTemplate.sections.length).toBe(2);
    });

    it('should throw error if template does not exist', async () => {
      await expect(
        service.updateTemplate(
          'non-existent',
          'type',
          { en: 'Non-existent Template' }
        )
      ).rejects.toThrow('not found');
    });
  });

  describe('addOrUpdateSection', () => {
    it('should add a new section to a template', async () => {
      const updatedTemplate = await service.addOrUpdateSection(
        'test-template',
        'section3',
        { en: 'Section 3', ja: 'セクション3' },
        { en: 'Content 3', ja: 'コンテンツ3' }
      );
      
      expect(updatedTemplate.sections.length).toBe(3);
      const section = updatedTemplate.getSection('section3');
      expect(section).not.toBeNull();
      expect(section?.getTitle(new Language('en'))).toBe('Section 3');
    });

    it('should update an existing section', async () => {
      const updatedTemplate = await service.addOrUpdateSection(
        'test-template',
        'section1', // Already exists
        { en: 'Updated Section', ja: '更新されたセクション' },
        { en: 'Updated Content', ja: '更新されたコンテンツ' }
      );
      
      expect(updatedTemplate.sections.length).toBe(2);
      const section = updatedTemplate.getSection('section1');
      expect(section?.getTitle(new Language('en'))).toBe('Updated Section');
      expect(section?.getContent(new Language('en'))).toBe('Updated Content');
    });

    it('should throw error if template does not exist', async () => {
      await expect(
        service.addOrUpdateSection(
          'non-existent',
          'section',
          { en: 'Section' }
        )
      ).rejects.toThrow('not found');
    });
  });

  describe('removeSection', () => {
    it('should remove a section from a template', async () => {
      const updatedTemplate = await service.removeSection(
        'test-template',
        'section1'
      );
      
      expect(updatedTemplate.sections.length).toBe(1);
      expect(updatedTemplate.getSection('section1')).toBeNull();
      expect(updatedTemplate.getSection('section2')).not.toBeNull();
    });

    it('should not modify template if section does not exist', async () => {
      const updatedTemplate = await service.removeSection(
        'test-template',
        'non-existent-section'
      );
      
      expect(updatedTemplate.sections.length).toBe(2);
    });

    it('should throw error if template does not exist', async () => {
      await expect(
        service.removeSection(
          'non-existent',
          'section'
        )
      ).rejects.toThrow('not found');
    });
  });

  describe('getTemplatesByType', () => {
    it('should return templates of specified type', async () => {
      // Add another template of the same type
      await repository.saveTemplate(
        new Template('another-system', 'system', { en: 'Another System Template' })
      );
      
      const templates = await service.getTemplatesByType('system');
      expect(templates.length).toBe(2);
      expect(templates[0].type).toBe('system');
      expect(templates[1].type).toBe('system');
    });

    it('should return empty array if no templates of specified type', async () => {
      const templates = await service.getTemplatesByType('non-existent-type');
      expect(templates.length).toBe(0);
    });
  });

  describe('getAllTemplateIds', () => {
    it('should return all template ids', async () => {
      const ids = await service.getAllTemplateIds();
      expect(ids).toContain('test-template');
    });
  });

  describe('getAllTemplateTypes', () => {
    it('should return all template types', async () => {
      const types = await service.getAllTemplateTypes();
      expect(types).toContain('system');
    });
  });
});
