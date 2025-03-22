/**
 * Unit tests for Markdown Migration Service
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { vi } from 'jest';
import fs from 'fs/promises';
import path from 'path';
import { MarkdownMigrationService } from '../../../src/migration/MarkdownMigrationService.js';
import { ITemplateRepository } from '../../../src/domain/templates/ITemplateRepository.js';
import { Template } from '../../../src/domain/templates/Template.js';
import { Language } from '../../../src/domain/i18n/Language.js';
import { Section } from '../../../src/domain/templates/Section.js';

// Mock fs.promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

describe('MarkdownMigrationService', () => {
  // Mock template repository
  const mockTemplateRepository: ITemplateRepository = {
    getTemplate: vi.fn(),
    getTemplateAsMarkdown: vi.fn(),
    getTemplatesByType: vi.fn(),
    saveTemplate: vi.fn(),
    templateExists: vi.fn(),
    getAllTemplateIds: vi.fn(),
    getAllTemplateTypes: vi.fn(),
  };

  // Test constants
  const markdownDir = '/test/markdown';
  const backupDir = '/test/backup';
  const templateId = 'test-template';
  const templatePath = path.join(markdownDir, `${templateId}.md`);
  const markdownContent = '# Test Template\n\n## Section 1\n\nContent 1\n\n## Section 2\n\nContent 2';

  // Service instance
  let service: MarkdownMigrationService;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create service
    service = new MarkdownMigrationService(mockTemplateRepository, markdownDir, backupDir);

    // Default mock implementations
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.readdir as any).mockResolvedValue([
      { isFile: () => true, name: `${templateId}.md` },
    ]);
    (fs.readFile as any).mockResolvedValue(markdownContent);
    (fs.writeFile as any).mockResolvedValue(undefined);

    (mockTemplateRepository.templateExists as any).mockResolvedValue(false);
    (mockTemplateRepository.saveTemplate as any).mockResolvedValue(true);
    (mockTemplateRepository.getTemplate as any).mockResolvedValue(
      new Template(templateId, 'document', { en: 'Test Template' }, [
        new Section('section1', { en: 'Section 1' }, { en: 'Content 1' }),
        new Section('section2', { en: 'Section 2' }, { en: 'Content 2' }),
      ])
    );
    (mockTemplateRepository.getTemplateAsMarkdown as any).mockResolvedValue(markdownContent);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('migrateAllTemplates', () => {
    it('should migrate all templates successfully', async () => {
      // Arrange
      (mockTemplateRepository.templateExists as any).mockResolvedValue(false);
      (mockTemplateRepository.saveTemplate as any).mockResolvedValue(true);

      // Act
      const result = await service.migrateAllTemplates();

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(backupDir, { recursive: true });
      expect(fs.readdir).toHaveBeenCalledWith(markdownDir, { withFileTypes: true });
      expect(fs.readFile).toHaveBeenCalledWith(templatePath, 'utf-8');
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(backupDir, `${templateId}.md`),
        markdownContent,
        'utf-8'
      );
      expect(mockTemplateRepository.saveTemplate).toHaveBeenCalled();
      expect(result).toEqual([templateId]);
    });

    it('should skip existing templates', async () => {
      // Arrange
      (mockTemplateRepository.templateExists as any).mockResolvedValue(true);

      // Act
      const result = await service.migrateAllTemplates();

      // Assert
      expect(mockTemplateRepository.saveTemplate).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle errors during migration', async () => {
      // Arrange
      (fs.readFile as any).mockRejectedValue(new Error('Read error'));

      // Act
      const result = await service.migrateAllTemplates();

      // Assert
      expect(mockTemplateRepository.saveTemplate).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('createMarkdownFile', () => {
    it('should create a Markdown file from a template', async () => {
      // Arrange
      const outputDir = '/test/output';
      const language = new Language('en');

      // Act
      const result = await service.createMarkdownFile(templateId, language, outputDir);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(outputDir, { recursive: true });
      expect(mockTemplateRepository.getTemplate).toHaveBeenCalledWith(templateId);
      expect(mockTemplateRepository.getTemplateAsMarkdown).toHaveBeenCalledWith(templateId, language);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, `${templateId}.md`),
        markdownContent,
        'utf-8'
      );
      expect(result).toEqual(path.join(outputDir, `${templateId}.md`));
    });

    it('should throw error if template not found', async () => {
      // Arrange
      const outputDir = '/test/output';
      const language = new Language('en');
      (mockTemplateRepository.getTemplate as any).mockResolvedValue(null);

      // Act & Assert
      await expect(service.createMarkdownFile(templateId, language, outputDir))
        .rejects.toThrow(`Failed to create Markdown file for template ${templateId}: Template not found: ${templateId}`);
    });
  });

  // You could add more tests for private methods by making them public in a test subclass
  // or by testing them indirectly through the public methods
});
