/*
 * Tests for JsonTemplateLoader.ts
 */
// @ts-nocheck
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { JsonTemplateLoader } from 'src/infrastructure/templates/JsonTemplateLoader';
import { JsonTemplate } from 'src/schemas/v2/template-schema';
import { Language } from 'src/schemas/v2/i18n-schema';
import path from 'path';

// サンプルテンプレート
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

describe('JsonTemplateLoader', () => {
  // モックオブジェクトの準備
  const mockFileSystemService = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    fileExists: jest.fn(),
    deleteFile: jest.fn(),
    createDirectory: jest.fn(),
    directoryExists: jest.fn(),
    listFiles: jest.fn(),
    getFileStats: jest.fn(),
  };

  const mockI18nProvider = {
    translate: jest.fn(),
    loadTranslations: jest.fn(),
    isLanguageSupported: jest.fn(),
    getSupportedLanguages: jest.fn(),
    getDefaultLanguage: jest.fn(),
  };

  // テスト対象のクラスインスタンス
  let templateLoader;

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // I18n関数のモック
    mockI18nProvider.translate.mockImplementation((key, language) => {
      if (language === 'ja') {
        return key + ' (日本語)';
      }
      return key + ' (English)';
    });

    mockI18nProvider.isLanguageSupported.mockImplementation((lang) => ['en', 'ja'].includes(lang));

    mockI18nProvider.getSupportedLanguages.mockImplementation(() => ['en', 'ja']);
    mockI18nProvider.getDefaultLanguage.mockImplementation(() => 'en');

    // ファイルシステムのモック設定
    mockFileSystemService.fileExists.mockImplementation((filePath) => {
      if (
        filePath.includes('test-template.json') ||
        filePath.includes('legacy-template.md') ||
        filePath.includes('legacy-template-en.md')
      ) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });

    mockFileSystemService.readFile.mockImplementation((filePath) => {
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

    // テストクラスのインスタンス化
    templateLoader = new JsonTemplateLoader(mockFileSystemService, mockI18nProvider);
  });

  describe('loadJsonTemplate', () => {
    it('should load and validate a JSON template', async () => {
      // 実行
      const result = await templateLoader.loadJsonTemplate('test-template');

      // 検証
      expect(mockFileSystemService.fileExists).toHaveBeenCalled();
      expect(mockFileSystemService.readFile).toHaveBeenCalled();
      expect(result).toEqual(sampleTemplate);
    });

    it('should throw error if template not found', async () => {
      // モックを上書き
      mockFileSystemService.fileExists.mockImplementation(() => Promise.resolve(false));

      // 実行と検証
      await expect(templateLoader.loadJsonTemplate('nonexistent-template')).rejects.toThrow(
        'Template not found'
      );
    });

    it('should throw error if JSON format is invalid', async () => {
      // モックを上書き
      mockFileSystemService.readFile.mockImplementation(() => Promise.resolve('{ invalid json }'));

      // 実行と検証
      await expect(templateLoader.loadJsonTemplate('invalid-template')).rejects.toThrow(
        'Failed to load JSON template'
      );
    });
  });

  describe('getMarkdownTemplate', () => {
    it('should convert JSON template to markdown', async () => {
      // 実行
      const result = await templateLoader.getMarkdownTemplate('test-template', 'en');

      // 検証
      expect(mockFileSystemService.fileExists).toHaveBeenCalled();
      expect(mockFileSystemService.readFile).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should throw error if language not supported', async () => {
      // モックを上書き
      mockI18nProvider.isLanguageSupported.mockImplementation(() => false);

      // 実行と検証
      await expect(templateLoader.getMarkdownTemplate('test-template', 'en')).rejects.toThrow(
        'Unsupported language'
      );
    });
  });

  describe('loadLegacyTemplate', () => {
    it('should load template from file path', async () => {
      // 実行
      const result = await templateLoader.loadLegacyTemplate('/path/to/legacy-template.md', 'en');

      // 検証
      expect(mockFileSystemService.fileExists).toHaveBeenCalled();
      expect(mockFileSystemService.readFile).toHaveBeenCalled();
      expect(result).toContain('Legacy content');
    });

    it('should throw error if file not found', async () => {
      // モックを上書き
      mockFileSystemService.fileExists.mockImplementation(() => Promise.resolve(false));

      // 実行と検証
      await expect(
        templateLoader.loadLegacyTemplate('/path/to/nonexistent-template.md', 'en')
      ).rejects.toThrow('Legacy template file not found');
    });
  });

  describe('templateExists', () => {
    it('should return true if template exists', async () => {
      // 実行
      const result = await templateLoader.templateExists('test-template');

      // 検証
      expect(result).toBe(true);
    });

    it('should return false if template does not exist', async () => {
      // モックを上書き
      mockFileSystemService.fileExists.mockImplementation(() => Promise.resolve(false));

      // 実行
      const result = await templateLoader.templateExists('nonexistent-template');

      // 検証
      expect(result).toBe(false);
    });
  });
});
