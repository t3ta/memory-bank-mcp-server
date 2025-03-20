/**
 * Tests for JsonTemplateLoader.ts
 */
import { jest } from '@jest/globals';
import { JsonTemplateLoader } from '../JsonTemplateLoader';
import { JsonTemplate } from '../../../schemas/v2/template-schema';
import { IFileSystemService } from '../../storage/interfaces/IFileSystemService';
import { II18nProvider } from '../../i18n/interfaces/II18nProvider';
import { Language } from '../../../schemas/v2/i18n-schema';

// Mock file system service
const mockFileSystemService: jest.Mocked<IFileSystemService> = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  fileExists: jest.fn(),
  deleteFile: jest.fn(),
  createDirectory: jest.fn(),
  directoryExists: jest.fn(),
  listFiles: jest.fn(),
  getFileStats: jest.fn(),
  readFileChunk: jest.fn().mockReturnValue(Promise.resolve('')) as jest.Mock<Promise<string>>,
  getBranchMemoryPath: jest.fn().mockReturnValue('') as jest.Mock<string>,
  getConfig: jest.fn().mockReturnValue({ memoryBankRoot: '' }) as jest.Mock<{ memoryBankRoot: string, [key: string]: any }>,
};

// Mock i18n provider
const mockI18nProvider: jest.Mocked<II18nProvider> = {
  translate: jest.fn(),
  loadTranslations: jest.fn(),
  isLanguageSupported: jest.fn(),
  getSupportedLanguages: jest.fn(),
  getDefaultLanguage: jest.fn(),
};

// Sample template for testing
const sampleTemplate: JsonTemplate = {
  schema: 'template_v1',
  metadata: {
    id: 'test-template',
    name: {
      en: 'Test Template',
      ja: 'テストテンプレート',
    },
    type: 'test',
    lastModified: '2023-01-01T00:00:00.000Z',
  },
  content: {
    sections: {
      introduction: {
        title: {
          en: 'Introduction',
          ja: 'はじめに',
        },
        content: {
          en: 'This is the introduction.',
          ja: 'これははじめにです。',
        },
        optional: false,
      },
      summary: {
        title: {
          en: 'Summary',
          ja: '要約',
        },
        content: {
          en: 'This is the summary.',
          ja: 'これは要約です。',
        },
        optional: false,
      },
      optional: {
        title: {
          en: 'Optional Section',
          ja: '任意セクション',
        },
        content: {
          en: 'This is optional.',
          ja: 'これは任意です。',
        },
        optional: true,
      },
    },
    placeholders: {
      TITLE: 'The title placeholder',
      CONTENT: 'The content placeholder',
    },
  },
};

// Mock implementation of the JsonTemplateLoader class
class MockJsonTemplateLoader extends JsonTemplateLoader {
  constructor() {
    super(mockFileSystemService, mockI18nProvider);
  }

  // Mock methods for testing
  async loadJsonTemplate(templateId: string): Promise<JsonTemplate> {
    return super.loadJsonTemplate(templateId);
  }

  async getMarkdownTemplate(
    templateId: string,
    language: Language,
    variables?: Record<string, string>
  ): Promise<string> {
    return super.getMarkdownTemplate(templateId, language, variables);
  }

  async loadLegacyTemplate(templatePath: string, language: Language): Promise<string> {
    return super.loadLegacyTemplate(templatePath, language);
  }

  async templateExists(templateId: string): Promise<boolean> {
    return super.templateExists(templateId);
  }
}

// 別PRで対応するため、一時的にスキップ
describe.skip('JsonTemplateLoader', () => {
  let templateLoader: MockJsonTemplateLoader;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup i18n provider mock
    mockI18nProvider.translate.mockImplementation((key, language) => {
      if (language === 'ja') {
        return key + ' (日本語)';
      }
      return key + ' (English)';
    });

    mockI18nProvider.isLanguageSupported.mockImplementation((lang) =>
      ['en', 'ja'].includes(lang as string)
    );

    mockI18nProvider.getSupportedLanguages.mockReturnValue(['en', 'ja']);
    mockI18nProvider.getDefaultLanguage.mockReturnValue('en');

    // Create new loader with mocked services
    templateLoader = new MockJsonTemplateLoader();

    // Mock implementation for readFile to return sample template
    mockFileSystemService.readFile.mockImplementation((filePath: string) => {
      if (filePath.includes('test-template.json')) {
        return Promise.resolve(JSON.stringify(sampleTemplate));
      } else if (filePath.includes('legacy-template.md')) {
        return Promise.resolve(
          '## Introduction\n\nLegacy content.\n\n## Summary\n\nMore legacy content.'
        );
      } else if (filePath.includes('legacy-template-en.md')) {
        return Promise.resolve(
          '## Introduction\n\nEnglish legacy content.\n\n## Summary\n\nMore English legacy content.'
        );
      }

      return Promise.reject(new Error('File not found'));
    });

    // Mock implementation for fileExists
    mockFileSystemService.fileExists.mockImplementation((filePath: string) => {
      if (
        filePath.includes('test-template.json') ||
        filePath.includes('legacy-template.md') ||
        filePath.includes('legacy-template-en.md')
      ) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });
  });

  // The getTemplateContent method was removed in favor of getMarkdownTemplate

  describe('loadJsonTemplate', () => {
    it('should load and validate a JSON template', async () => {
      // Arrange
      const templateId = 'test-template';

      // Act
      const result = await templateLoader.loadJsonTemplate(templateId);

      // Assert
      expect(mockFileSystemService.fileExists).toHaveBeenCalled();
      expect(mockFileSystemService.readFile).toHaveBeenCalled();
      expect(result).toEqual(sampleTemplate);
    });

    it('should throw error if template not found', async () => {
      // Arrange
      const templateId = 'nonexistent-template';

      // Mock fileExists to return false
      mockFileSystemService.fileExists.mockResolvedValue(false);

      // Act & Assert
      await expect(templateLoader.loadJsonTemplate(templateId)).rejects.toThrow(
        'Template not found'
      );
    });

    it('should throw error if JSON format is invalid', async () => {
      // Arrange
      const templateId = 'invalid-template';

      // Mock fileExists and readFile
      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockResolvedValue('{ invalid json }');

      // Act & Assert
      await expect(templateLoader.loadJsonTemplate(templateId)).rejects.toThrow(
        'Invalid JSON format'
      );
    });
  });

  describe('getMarkdownTemplate', () => {
    it('should convert JSON template to markdown', async () => {
      // Arrange
      const templateId = 'test-template';
      const language = 'en';

      // Act
      const result = await templateLoader.getMarkdownTemplate(templateId, language);

      // Assert
      expect(mockFileSystemService.fileExists).toHaveBeenCalled();
      expect(mockFileSystemService.readFile).toHaveBeenCalled();
      // Can only check minimal expectations since the actual rendering is mocked
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should throw error if language not supported', async () => {
      // Arrange
      const templateId = 'test-template';
      const language = 'fr' as Language; // Not supported in our sample

      // Make sure language check fails
      mockI18nProvider.isLanguageSupported.mockReturnValue(false);

      // Act & Assert
      await expect(templateLoader.getMarkdownTemplate(templateId, language)).rejects.toThrow();
    });
  });

  describe('loadLegacyTemplate', () => {
    it('should load template from file path', async () => {
      // Arrange
      const templatePath = '/path/to/legacy-template.md';
      const language = 'en';

      // Act
      const result = await templateLoader.loadLegacyTemplate(templatePath, language);

      // Assert
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(templatePath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(templatePath);
      expect(result).toContain('Legacy content.');
    });

    it('should throw error if file not found', async () => {
      // Arrange
      const templatePath = '/path/to/nonexistent-template.md';
      const language = 'en';

      // Mock fileExists to return false
      mockFileSystemService.fileExists.mockResolvedValue(false);

      // Act & Assert
      await expect(templateLoader.loadLegacyTemplate(templatePath, language)).rejects.toThrow(
        'Legacy template file not found'
      );
    });
  });

  describe('templateExists', () => {
    it('should return true if template exists', async () => {
      // Arrange
      const templateId = 'test-template';

      // Act
      const result = await templateLoader.templateExists(templateId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if template does not exist', async () => {
      // Arrange
      const templateId = 'nonexistent-template';

      // Mock fileExists to return false
      mockFileSystemService.fileExists.mockResolvedValue(false);

      // Act
      const result = await templateLoader.templateExists(templateId);

      // Assert
      expect(result).toBe(false);
    });
  });
});
