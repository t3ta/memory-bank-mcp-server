import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FileTemplateRepository } from '../../../../src/infrastructure/templates/FileTemplateRepository.js';
import type { IFileSystem } from '../../../../src/domain/interfaces/IFileSystem.js';
import { Template } from '../../../../src/domain/templates/Template.js';
import { Lang } from '../../../../src/domain/entities/Language.js';
import { Section } from '../../../../src/domain/templates/Section.js';

describe('FileTemplateRepository', () => {
  let fileSystem: jest.Mocked<IFileSystem>;
  let repository: FileTemplateRepository;
  const testBasePath = '/test/templates';

  beforeEach(() => {
    fileSystem = {
      fileExists: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      directoryExists: jest.fn(),
      listFiles: jest.fn(),
      deleteFile: jest.fn(),
      getFileStats: jest.fn(),
      readDirectory: jest.fn()
    };

    repository = new FileTemplateRepository(fileSystem);
  });

  describe('initialize', () => {
    it('should create the templates directory if it does not exist', async () => {
      fileSystem.directoryExists.mockResolvedValue(false);
      fileSystem.createDirectory.mockResolvedValue();
      fileSystem.listFiles.mockResolvedValue([]);

      await repository.initialize();

      expect(fileSystem.createDirectory).toHaveBeenCalledWith(expect.any(String));
    });

    it('should load all templates on initialization', async () => {
      const testTemplate = new Template('test1', 'document', { en: 'Test Template' }, []);
      fileSystem.directoryExists.mockResolvedValue(true);
      fileSystem.listFiles.mockResolvedValue([{ name: 'test1.json', isFile: () => true }]);
      fileSystem.readFile.mockResolvedValue(JSON.stringify(testTemplate));

      await repository.initialize();

      expect(fileSystem.readFile).toHaveBeenCalled();
    });
  });

  describe('getTemplate', () => {
    it('should return a template if it exists', async () => {
      await repository.initialize();
      const testTemplate = new Template('test1', 'document', { en: 'Test Template' }, []);
      fileSystem.readFile.mockResolvedValue(JSON.stringify(testTemplate));

      const result = await repository.getTemplate('test1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test1');
    });

    it('should return null if template does not exist', async () => {
      await repository.initialize();
      fileSystem.readFile.mockRejectedValue(new Error('File not found'));

      const result = await repository.getTemplate('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTemplateAsMarkdown', () => {
    it('should convert template to Markdown format', async () => {
      await repository.initialize();
      const testTemplate = new Template('test1', 'document', { en: 'Test Template' }, [
        new Section('section1', { en: 'Section 1' }, { en: 'Content 1' })
      ]);
      fileSystem.readFile.mockResolvedValue(JSON.stringify(testTemplate));

      const result = await repository.getTemplateAsMarkdown('test1', Lang.English);

      expect(result).toContain('# Test Template');
      expect(result).toContain('## Section 1');
      expect(result).toContain('Content 1');
    });

    it('should replace variables in Markdown content', async () => {
      await repository.initialize();
      const variables = { value1: 'replaced value' };
      const testTemplate = new Template('test1', 'document', { en: 'Test Template' }, [
        new Section('section1', { en: 'Section 1' }, { en: 'Content with ${value1}' })
      ]);
      fileSystem.readFile.mockResolvedValue(JSON.stringify(testTemplate));

      const result = await repository.getTemplateAsMarkdown('test1', Lang.English, variables);

      expect(result).toContain('Content with replaced value');
    });

    it('should throw error if template not found', async () => {
      await repository.initialize();
      fileSystem.readFile.mockRejectedValue(new Error('File not found'));

      await expect(
        repository.getTemplateAsMarkdown('nonexistent', Lang.English)
      ).rejects.toThrow();
    });
  });

  describe('saveTemplate', () => {
    it('should save a new template', async () => {
      await repository.initialize();
      const template = new Template('test1', 'document', { en: 'Test Template' }, []);

      await repository.saveTemplate(template);

      expect(fileSystem.writeFile).toHaveBeenCalledWith(
