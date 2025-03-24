/**
 * Unit tests for Markdown Migration Service
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import { MarkdownMigrationService } from '../../../src/migration/MarkdownMigrationService.js';
import { ITemplateRepository } from '../../../src/domain/templates/ITemplateRepository.js';
import { Template } from '../../../src/domain/templates/Template.js';
import { Language } from '../../../src/domain/i18n/Language.js';
import { Section } from '../../../src/domain/templates/Section.js';

// Mock fs/promises module
const mockFs = {
  mkdir: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn()
};

// @ts-ignore
jest.mock('fs/promises', () => mockFs);

describe('MarkdownMigrationService', () => {
  // Mock template repository - using basic functions, no explicit types
  const mockTemplateRepository = {
    getTemplate: jest.fn(),
    getTemplateAsMarkdown: jest.fn(),
    getTemplatesByType: jest.fn(),
    saveTemplate: jest.fn(),
    templateExists: jest.fn(),
    getAllTemplateIds: jest.fn(),
    getAllTemplateTypes: jest.fn(),
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
    jest.resetAllMocks();

    // Create service
    // @ts-ignore - suppress type checking
    service = new MarkdownMigrationService(mockTemplateRepository, markdownDir, backupDir);

    // Default mock implementations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([
      { isFile: () => true, name: `${templateId}.md` },
    ]);
    mockFs.readFile.mockResolvedValue(markdownContent);
    mockFs.writeFile.mockResolvedValue(undefined);

    // @ts-ignore - suppress type checking
    mockTemplateRepository.templateExists.mockResolvedValue(false);
    // @ts-ignore - suppress type checking
    mockTemplateRepository.saveTemplate.mockResolvedValue(true);
    // @ts-ignore - suppress type checking
    mockTemplateRepository.getTemplate.mockResolvedValue(
      new Template(templateId, 'document', { en: 'Test Template' }, [
        new Section('section1', { en: 'Section 1' }, { en: 'Content 1' }),
        new Section('section2', { en: 'Section 2' }, { en: 'Content 2' }),
      ])
    );
    // @ts-ignore - suppress type checking
    mockTemplateRepository.getTemplateAsMarkdown.mockResolvedValue(markdownContent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('migrateAllTemplates', () => {
    it('should migrate all templates successfully', async () => {
      // Arrange
      // @ts-ignore - suppress type checking
      mockTemplateRepository.templateExists.mockResolvedValue(false);
      // @ts-ignore - suppress type checking
      mockTemplateRepository.saveTemplate.mockResolvedValue(true);

      // Act
      const result = await service.migrateAllTemplates();

      // Assert
      expect(mockFs.mkdir).toHaveBeenCalledWith(backupDir, { recursive: true });
      expect(mockFs.readdir).toHaveBeenCalledWith(markdownDir, { withFileTypes: true });
      expect(mockFs.readFile).toHaveBeenCalledWith(templatePath, 'utf-8');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(backupDir, `${templateId}.md`),
        markdownContent,
        'utf-8'
      );
      expect(mockTemplateRepository.saveTemplate).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should skip existing templates', async () => {
      // Arrange
      // @ts-ignore - suppress type checking
      mockTemplateRepository.templateExists.mockResolvedValue(true);

      // Act
      const result = await service.migrateAllTemplates();

      // Assert
      expect(mockTemplateRepository.saveTemplate).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('should handle errors during migration', async () => {
      // Arrange
      // @ts-ignore - suppress type checking
      mockFs.readFile.mockRejectedValueOnce(new Error('Read error'));

      // Act
      const result = await service.migrateAllTemplates();

      // Assert
      expect(mockTemplateRepository.saveTemplate).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
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
      expect(mockFs.mkdir).toHaveBeenCalledWith(outputDir, { recursive: true });
      expect(mockTemplateRepository.getTemplate).toHaveBeenCalledWith(templateId);
      expect(mockTemplateRepository.getTemplateAsMarkdown).toHaveBeenCalledWith(templateId, language);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, `${templateId}.md`),
        markdownContent,
        'utf-8'
      );
      expect(result).toBe(path.join(outputDir, `${templateId}.md`));
    });

    it('should throw error if template not found', async () => {
      // Arrange
      const outputDir = '/test/output';
      const language = new Language('en');
      // @ts-ignore - suppress type checking
      mockTemplateRepository.getTemplate.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createMarkdownFile(templateId, language, outputDir))
        .rejects.toThrow(`Failed to create Markdown file for template ${templateId}: Template not found: ${templateId}`);
    });
  });
});
