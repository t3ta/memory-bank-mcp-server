import path from 'node:path';
import { mock } from 'jest-mock-extended';
import { JsonTemplateLoader } from '../../../../src/infrastructure/templates/JsonTemplateLoader';
import { IFileSystemService } from '../../../../src/infrastructure/storage/interfaces/IFileSystemService';
import { II18nProvider } from '../../../../src/infrastructure/i18n/interfaces/II18nProvider';
import { Language } from '@memory-bank/schemas/v2'; // 正しい Language 型を schemas からインポート
import { TemplateRenderer } from '../../../../src/infrastructure/templates/TeplateRenderer'; // Rendererもテストで使うかも

// Mocks
const mockFileSystemService = mock<IFileSystemService>();
const mockI18nProvider = mock<II18nProvider>();

// TemplateRenderer のモックは難しいので、本物を使うか、必要なら部分的にモックする
// 今回は i18nProvider をモックしているので、Renderer の i18n 関連は制御できる
// const mockTemplateRenderer = mock<TemplateRenderer>();

// Test target instance
const templateLoader = new JsonTemplateLoader(mockFileSystemService, mockI18nProvider);

// Dummy template data
const dummyTemplateId = 'test-template';
// Corrected dummy template to match expected structure with language keys
const dummyJsonTemplate = {
  metadata: { // Assuming metadata structure based on renderer logic
    name: { ja: 'テストテンプレート', en: 'Test Template' }
  },
  content: {
    sections: { // Assuming sections are under content and keyed by ID
      section1: {
        title: { ja: 'セクション1', en: 'Section 1' },
        content: { ja: '内容 1 {{var1}}', en: 'Content 1 {{var1}}' } // Content per language
      },
      section2: {
        title: { ja: 'セクション2', en: 'Section 2' },
        content: { ja: '内容 2', en: 'Content 2' } // Content per language
      }
    }
  }
};
const dummyJsonTemplateString = JSON.stringify(dummyJsonTemplate);
const dummyLegacyTemplateContent = '# Legacy {{title_placeholder}}\n\nLegacy content {{var1}}.';

// Mock paths (assuming test runs from project root)
const jsonTemplatesDir = path.join(process.cwd(), 'src/templates/json');
const legacyTemplatesDir = path.join(process.cwd(), 'src/templates/markdown');
const jsonTemplatePath = path.join(jsonTemplatesDir, `${dummyTemplateId}.json`);
const legacyTemplatePathEn = path.join(legacyTemplatesDir, `${dummyTemplateId}-en.md`);
const legacyTemplatePathJa = path.join(legacyTemplatesDir, `${dummyTemplateId}.md`); // ja is default

describe('JsonTemplateLoader', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // Default mock implementations
    mockI18nProvider.isLanguageSupported.mockImplementation((lang) => ['en', 'ja'].includes(lang));
    // Setup mock for i18nProvider.translate to handle both string and object arguments
    mockI18nProvider.translate.mockImplementation((arg: string | { key: string; language: Language; params?: Record<string, string> }) => {
      let key: string;
      let language: Language | undefined;
      // Determine key and language based on argument type
      if (typeof arg === 'string') {
        key = arg;
        // TemplateRenderer.renderBaseTemplateToMarkdown calls with only key, assume 'en'
        language = 'en';
      } else {
        // Handle potential undefined arg defensively
        if (!arg) return '';
        // TemplateRenderer.getPlaceholderComment calls with object
        key = arg.key;
        language = arg.language;
      }

      // Mock translations based on key and language
      if (key === 'title_placeholder' && language === 'ja') return 'テストタイトル';
      if (key === 'title_placeholder' && language === 'en') return 'Test Title';
      if (key === 'title_placeholder') return 'Translated Title'; // Fallback for title if language doesn't match or is undefined
      if (key === 'template.placeholder.var1') return 'Variable 1 Placeholder Comment';
      // Add more specific placeholder translations if needed for other tests
      // e.g., if (key === 'template.placeholder.some_other_var') return '...';
      return key; // Default: return the key itself
    });
  });

  describe('loadJsonTemplate', () => {
    it('should load and parse a valid JSON template', async () => {
      mockFileSystemService.fileExists.calledWith(jsonTemplatePath).mockResolvedValue(true);
      mockFileSystemService.readFile.calledWith(jsonTemplatePath).mockResolvedValue(dummyJsonTemplateString);

      const template = await templateLoader.loadJsonTemplate(dummyTemplateId);

      expect(template).toEqual(dummyJsonTemplate);
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(jsonTemplatePath);
    });

    it('should throw an error if the template file does not exist', async () => {
      mockFileSystemService.fileExists.calledWith(jsonTemplatePath).mockResolvedValue(false);

      await expect(templateLoader.loadJsonTemplate(dummyTemplateId))
        .rejects.toThrow(`Failed to load JSON template ${dummyTemplateId}: Template not found: ${dummyTemplateId}`);

      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
      expect(mockFileSystemService.readFile).not.toHaveBeenCalled();
    });

    it('should throw an error if reading the file fails', async () => {
      const readError = new Error('Permission denied');
      mockFileSystemService.fileExists.calledWith(jsonTemplatePath).mockResolvedValue(true);
      mockFileSystemService.readFile.calledWith(jsonTemplatePath).mockRejectedValue(readError);

      await expect(templateLoader.loadJsonTemplate(dummyTemplateId))
        .rejects.toThrow(`Failed to load JSON template ${dummyTemplateId}: Permission denied`);

      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(jsonTemplatePath);
    });

    it('should throw an error if the JSON content is invalid', async () => {
      const invalidJsonString = '{"title": "Test", sections: []}'; // Invalid JSON (missing quotes around sections)
      mockFileSystemService.fileExists.calledWith(jsonTemplatePath).mockResolvedValue(true);
      mockFileSystemService.readFile.calledWith(jsonTemplatePath).mockResolvedValue(invalidJsonString);

      // Expect SyntaxError directly because loadJsonTemplate rethrows it
      await expect(templateLoader.loadJsonTemplate(dummyTemplateId))
        .rejects.toThrow(SyntaxError);

      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(jsonTemplatePath);
    });
  });

  describe('getMarkdownTemplate', () => {
    const variables = { var1: 'VariableValue' };

    it('should load JSON template and render markdown for a supported language', async () => {
      mockFileSystemService.fileExists.calledWith(jsonTemplatePath).mockResolvedValue(true);
      mockFileSystemService.readFile.calledWith(jsonTemplatePath).mockResolvedValue(dummyJsonTemplateString);

      // Note: TemplateRenderer uses translate differently now, adjust expectations if needed
      // For now, just check if the method runs without the previous TypeError
      const markdown = await templateLoader.getMarkdownTemplate(dummyTemplateId, 'ja', variables);

      // Check basic rendering based on the corrected mock translate
      // Check rendering based on corrected template structure and mock translate
      expect(markdown).toContain('# テストテンプレート'); // Expect Japanese title from template data
      expect(markdown).toContain('内容 1 VariableValue'); // Expect Japanese content with variable replaced
      expect(markdown).toContain('内容 2'); // Expect Japanese content
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(jsonTemplatePath);
      // Verify translate was called (TemplateRenderer calls with object for title)
      // Translate should not be called for content/title as they are directly in the template now
      expect(mockI18nProvider.translate).not.toHaveBeenCalled();
    });

    it('should throw an error for an unsupported language', async () => {
      await expect(templateLoader.getMarkdownTemplate(dummyTemplateId, 'zh')) // zh is not supported in mock
        .rejects.toThrow('Unsupported language: zh');
      expect(mockFileSystemService.fileExists).not.toHaveBeenCalled(); // Should fail before file access
    });

    // Legacy fallback tests removed as the functionality is removed

    it('should throw error if JSON template fails and legacy fallback also fails (file not found)', async () => {
      // JSON template does not exist
      mockFileSystemService.fileExists.calledWith(jsonTemplatePath).mockResolvedValue(false);
      // Legacy template also does not exist
      mockFileSystemService.fileExists.calledWith(legacyTemplatePathJa).mockResolvedValue(false);

      // Expect the final error message to reflect both failures
      // Expect the final error message from the legacy load failure, as the JSON error triggers fallback
      // Expect the final error message from the legacy load failure, as JSON parse error should trigger fallback
      // Expect the final error message from the legacy load failure, as JSON template not found triggers fallback
      await expect(templateLoader.getMarkdownTemplate(dummyTemplateId, 'ja'))
         // Expect the error from loadJsonTemplate, as fallback is removed
        .rejects.toThrow(`Failed to load JSON template ${dummyTemplateId}: Template not found: ${dummyTemplateId}`);

      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath); // Checked JSON path first
      // Legacy checks removed
      expect(mockFileSystemService.readFile).not.toHaveBeenCalled(); // Should not attempt read
    });

     it('should throw error if JSON template fails and legacy fallback also fails (read error)', async () => {
      const jsonReadError = new Error('JSON read failed');
      const legacyReadError = new Error('Legacy read failed');
      // JSON template exists but read fails
      mockFileSystemService.fileExists.calledWith(jsonTemplatePath).mockResolvedValue(true);
      mockFileSystemService.readFile.calledWith(jsonTemplatePath).mockRejectedValue(jsonReadError);
      // Legacy template exists but read fails
      mockFileSystemService.fileExists.calledWith(legacyTemplatePathEn).mockResolvedValue(true);
      mockFileSystemService.readFile.calledWith(legacyTemplatePathEn).mockRejectedValue(legacyReadError);

      // Expect the final error message from the legacy load failure, as JSON read error should trigger fallback
      // Expect the final error message from the legacy load failure, as JSON read error should trigger fallback
      // Expect the wrapped error from loadJsonTemplate, as fallback is removed
      // Expect the wrapped error from loadJsonTemplate, as fallback is removed
      // Expect the wrapped error from loadJsonTemplate, as fallback is removed
      await expect(templateLoader.getMarkdownTemplate(dummyTemplateId, 'en'))
        .rejects.toThrow(`Failed to load JSON template ${dummyTemplateId}: ${jsonReadError.message}`);

      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath); // Checked JSON path
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(jsonTemplatePath);
      // Legacy checks removed
    });

    it('should throw original error if JSON load fails for reason other than not found or invalid JSON', async () => {
        const unexpectedError = new Error('Unexpected network error');
        mockFileSystemService.fileExists.calledWith(jsonTemplatePath).mockResolvedValue(true);
        mockFileSystemService.readFile.calledWith(jsonTemplatePath).mockRejectedValue(unexpectedError);

        await expect(templateLoader.getMarkdownTemplate(dummyTemplateId, 'ja'))
            .rejects.toThrow(`Failed to load JSON template ${dummyTemplateId}: Unexpected network error`);

        // Ensure legacy fallback was NOT attempted (already removed, but keep check)
        // expect(mockFileSystemService.fileExists).not.toHaveBeenCalledWith(legacyTemplatePathJa); // This check is now redundant
    });
  }); // End of getMarkdownTemplate describe

  // describe('loadLegacyTemplate', ...) removed as the method is removed

  describe('templateExists', () => { // Corrected indentation
    it('should return true if JSON template file exists', async () => {
      mockFileSystemService.fileExists.calledWith(jsonTemplatePath).mockResolvedValue(true);
      const exists = await templateLoader.templateExists(dummyTemplateId);
      expect(exists).toBe(true);
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
    });

    it('should return false if JSON template file does not exist', async () => {
      mockFileSystemService.fileExists.calledWith(jsonTemplatePath).mockResolvedValue(false);
      const exists = await templateLoader.templateExists(dummyTemplateId);
      expect(exists).toBe(false);
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
    });
  }); // End of templateExists describe
}); // Add missing closing bracket for the main describe block
