import path from 'node:path';
import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
// import { mock } from 'jest-mock-extended'; // jest-mock-extended を削除
import { JsonTemplateLoader } from '../../../../src/infrastructure/templates/JsonTemplateLoader.js'; // .js 追加
import { IFileSystemService } from '../../../../src/infrastructure/storage/interfaces/IFileSystemService.js'; // .js 追加
import { II18nProvider } from '../../../../src/infrastructure/i18n/interfaces/II18nProvider.js'; // .js 追加
import { Language } from '@memory-bank/schemas/v2'; // 正しい Language 型を schemas からインポート
// import { TemplateRenderer } from '../../../../src/infrastructure/templates/TeplateRenderer.js'; // 未使用なので削除

// Mocks
// jest-mock-extended の代わりに vi.fn() で手動モックを作成する
const mockFileSystemService: IFileSystemService = {
  fileExists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
  // ensureDir: vi.fn(), // IFileSystemService に存在しないため削除
  // readDir: vi.fn(), // IFileSystemService に存在しないため削除
  readFileChunk: vi.fn(), // readFileChunk もモック
  // 不足していたメソッドを追加
  createDirectory: vi.fn(),
  directoryExists: vi.fn(),
  listFiles: vi.fn(),
  getFileStats: vi.fn(),
};
const mockI18nProvider: II18nProvider = {
  translate: vi.fn(),
  loadTranslations: vi.fn(),
  isLanguageSupported: vi.fn(),
  getSupportedLanguages: vi.fn(), // 不足していたメソッドを追加
  getDefaultLanguage: vi.fn(), // 不足していたメソッドを追加
};

// TemplateRenderer のモックは難しいので、本物を使うか、必要なら部分的にモックする
// 今回は i18nProvider をモックしているので、Renderer の i18n 関連は制御できる
// const mockTemplateRenderer = mock<TemplateRenderer>();

// Test target instance
const templateLoader = new JsonTemplateLoader(mockFileSystemService, mockI18nProvider);

// Dummy template data
const dummyTemplateId = 'test-template';
// テンプレート構造を検証ルールに合わせる（schema, metadata, content必須）
const dummyJsonTemplate = {
  schema: "template_v1",
  metadata: {
    id: "test-template",
    titleKey: "template.title.test",
    descriptionKey: "template.description.test",
    type: "system",
    lastModified: "2025-04-01T00:00:00.000Z"
  },
  content: {
    sections: [
      {
        id: "section1",
        titleKey: "template.section.test_section1",
        contentKey: "template.content.test_section1",
        isOptional: false
      },
      {
        id: "section2",
        titleKey: "template.section.test_section2",
        contentKey: "template.content.test_section2",
        isOptional: false
      }
    ],
    placeholders: {
      "TEST": "template.placeholder.test"
    }
  }
};
const dummyJsonTemplateString = JSON.stringify(dummyJsonTemplate);
// const dummyLegacyTemplateContent = '# Legacy {{title_placeholder}}\n\nLegacy content {{var1}}.'; // 未使用なので削除

// Mock paths (assuming test runs from project root)
const jsonTemplatesDir = path.join(process.cwd(), 'packages/mcp/src/templates/json');
// const legacyTemplatesDir = path.join(process.cwd(), 'src/templates/markdown'); // 未使用なので削除
const jsonTemplatePath = path.join(jsonTemplatesDir, `${dummyTemplateId}.json`);
// const legacyTemplatePathEn = path.join(legacyTemplatesDir, `${dummyTemplateId}-en.md`); // 未使用なので削除
// const legacyTemplatePathJa = path.join(legacyTemplatesDir, `${dummyTemplateId}.md`); // 未使用なので削除

describe('JsonTemplateLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // jest -> vi

    // Mock getJsonTemplatesDirectory method to return predictable path
    vi.spyOn(JsonTemplateLoader.prototype, 'getJsonTemplatesDirectory' as any).mockReturnValue(jsonTemplatesDir);

    // Default mock implementations
    (mockI18nProvider.isLanguageSupported as Mock).mockImplementation((lang: string) => ['en', 'ja'].includes(lang)); // as Mock と型注釈を追加
    // Setup mock for i18nProvider.translate to handle both string and object arguments
    (mockI18nProvider.translate as Mock).mockImplementation((arg: string | { key: string; language: Language; params?: Record<string, string> }) => { // as Mock を追加
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
      // calledWith は削除し、expect で確認する
      (mockFileSystemService.fileExists as Mock).mockResolvedValue(true); // as Mock に修正
      (mockFileSystemService.readFile as Mock).mockResolvedValue(dummyJsonTemplateString); // as Mock に修正

      const template = await templateLoader.loadJsonTemplate(dummyTemplateId);

      expect(template).toEqual(dummyJsonTemplate);
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(jsonTemplatePath);
    });

    it('should throw an error if the template file does not exist', async () => {
      (mockFileSystemService.fileExists as Mock).mockResolvedValue(false); // as Mock に修正

      await expect(templateLoader.loadJsonTemplate(dummyTemplateId))
        .rejects.toThrow(`Failed to load JSON template ${dummyTemplateId}: Template not found: ${dummyTemplateId}`);

      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
      expect(mockFileSystemService.readFile).not.toHaveBeenCalled();
    });

    it('should throw an error if reading the file fails', async () => {
      const readError = new Error('Permission denied');
      (mockFileSystemService.fileExists as Mock).mockResolvedValue(true); // as Mock に修正
      (mockFileSystemService.readFile as Mock).mockRejectedValue(readError); // as Mock に修正

      await expect(templateLoader.loadJsonTemplate(dummyTemplateId))
        .rejects.toThrow(`Failed to load JSON template ${dummyTemplateId}: Permission denied`);

      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(jsonTemplatePath);
    });

    it('should throw an error if the JSON content is invalid', async () => {
      const invalidJsonString = '{"title": "Test", sections: []}'; // Invalid JSON (missing quotes around sections)
      (mockFileSystemService.fileExists as Mock).mockResolvedValue(true); // as Mock に修正
      (mockFileSystemService.readFile as Mock).mockResolvedValue(invalidJsonString); // as Mock に修正

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
      (mockFileSystemService.fileExists as Mock).mockResolvedValue(true); // as Mock に修正
      (mockFileSystemService.readFile as Mock).mockResolvedValue(dummyJsonTemplateString); // as Mock に修正

      // テスト用の翻訳を設定
      (mockI18nProvider.translate as Mock).mockImplementation((arg: { key: string; language: Language }) => {
        if (arg.key === 'template.title.test' && arg.language === 'ja') return 'テストテンプレート';
        if (arg.key === 'template.section.test_section1' && arg.language === 'ja') return 'テストセクション1';
        if (arg.key === 'template.content.test_section1' && arg.language === 'ja') return 'テスト内容1 {{var1}}';
        if (arg.key === 'template.section.test_section2' && arg.language === 'ja') return 'テストセクション2';
        if (arg.key === 'template.content.test_section2' && arg.language === 'ja') return 'テスト内容2';
        return arg.key; // デフォルト: キーをそのまま返す
      });

      const markdown = await templateLoader.getMarkdownTemplate(dummyTemplateId, 'ja', variables);

      // 期待される内容をチェック
      expect(markdown).toContain('# テストテンプレート');
      expect(markdown).toContain('## テストセクション1');
      expect(markdown).toContain('テスト内容1 VariableValue'); // 変数が置換されていることを確認
      expect(markdown).toContain('## テストセクション2');
      expect(markdown).toContain('テスト内容2');
      
      // ファイルアクセスの確認
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(jsonTemplatePath);
      
      // 翻訳が呼び出されたことを確認
      expect(mockI18nProvider.translate).toHaveBeenCalled();
    });

    it('should throw an error for an unsupported language', async () => {
      await expect(templateLoader.getMarkdownTemplate(dummyTemplateId, 'zh')) // zh is not supported in mock
        .rejects.toThrow('Unsupported language: zh');
      expect(mockFileSystemService.fileExists).not.toHaveBeenCalled(); // Should fail before file access
    });

    // Legacy fallback tests removed as the functionality is removed

    it('should throw error if JSON template fails and legacy fallback also fails (file not found)', async () => {
      // JSON template does not exist
      (mockFileSystemService.fileExists as Mock).mockResolvedValue(false); // as Mock に修正
      // Legacy template check removed

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
      // const legacyReadError = new Error('Legacy read failed'); // 未使用なので削除
      // JSON template exists but read fails
      (mockFileSystemService.fileExists as Mock).mockResolvedValue(true); // as Mock に修正
      (mockFileSystemService.readFile as Mock).mockRejectedValue(jsonReadError); // as Mock に修正
      // Legacy template checks removed

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
        (mockFileSystemService.fileExists as Mock).mockResolvedValue(true); // as Mock に修正
        (mockFileSystemService.readFile as Mock).mockRejectedValue(unexpectedError); // as Mock に修正

        await expect(templateLoader.getMarkdownTemplate(dummyTemplateId, 'ja'))
            .rejects.toThrow(`Failed to load JSON template ${dummyTemplateId}: Unexpected network error`);

        // Ensure legacy fallback was NOT attempted (already removed, but keep check)
        // expect(mockFileSystemService.fileExists).not.toHaveBeenCalledWith(legacyTemplatePathJa); // This check is now redundant
    });
  }); // End of getMarkdownTemplate describe

  // describe('loadLegacyTemplate', ...) removed as the method is removed

  describe('templateExists', () => { // Corrected indentation
    it('should return true if JSON template file exists', async () => {
      (mockFileSystemService.fileExists as Mock).mockResolvedValue(true); // as Mock に修正
      const exists = await templateLoader.templateExists(dummyTemplateId);
      expect(exists).toBe(true);
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
    });

    it('should return false if JSON template file does not exist', async () => {
      (mockFileSystemService.fileExists as Mock).mockResolvedValue(false); // as Mock に修正
      const exists = await templateLoader.templateExists(dummyTemplateId);
      expect(exists).toBe(false);
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(jsonTemplatePath);
    });
  }); // End of templateExists describe
}); // Add missing closing bracket for the main describe block
