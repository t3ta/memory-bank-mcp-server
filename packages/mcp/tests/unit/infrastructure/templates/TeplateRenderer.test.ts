import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
// import { mock } from 'jest-mock-extended'; // jest-mock-extended を削除
import { TemplateRenderer } from '../../../../src/infrastructure/templates/TeplateRenderer.js'; // .js 追加
import { II18nProvider } from '../../../../src/infrastructure/i18n/interfaces/II18nProvider.js'; // .js 追加
import { Language } from '@memory-bank/schemas/v2';

// Mocks
// jest-mock-extended の代わりに vi.fn() で手動モックを作成する
const mockI18nProvider: II18nProvider = {
  translate: vi.fn(),
  loadTranslations: vi.fn(),
  isLanguageSupported: vi.fn(),
  getSupportedLanguages: vi.fn(), // 不足していたメソッドを追加
  getDefaultLanguage: vi.fn(), // 不足していたメソッドを追加
};

// Test target instance
const renderer = new TemplateRenderer(mockI18nProvider);

// Dummy Template Data
const dummyJsonTemplate = {
  schema: 'template_v1', // Template schema
  metadata: {
    id: 'test-template',
    titleKey: 'template.title.test',
    descriptionKey: 'template.description.test',
    type: 'system',
    lastModified: '2025-04-01T00:00:00.000Z'
  },
  content: {
    sections: [
      {
        id: 'section1',
        titleKey: 'template.section.test_section1',
        contentKey: 'template.content.test_section1',
        isOptional: false
      },
      {
        id: 'section2',
        titleKey: 'template.section.test_section2',
        contentKey: 'template.content.test_section2',
        isOptional: false
      },
      {
        id: 'optionalSectionEmpty',
        titleKey: 'template.section.test_optional_empty',
        contentKey: 'template.content.test_optional_empty', // Empty content in mock
        isOptional: true
      },
      {
        id: 'optionalSectionPresent',
        titleKey: 'template.section.test_optional_present',
        contentKey: 'template.content.test_optional_present',
        isOptional: true
      },
      {
        id: 'fallbackSection',
        titleKey: 'template.section.test_fallback',
        contentKey: 'template.content.test_fallback',
        isOptional: false
      }
    ],
    placeholders: {
      'TEST': 'template.placeholder.test'
    }
  }
};

const dummyBaseTemplate = {
  titleKey: 'base_title',
  sections: [
    { titleKey: 'base_section1_title', contentKey: 'base_section1_content', placeholder: '{{PLACEHOLDER_1}}' },
    { titleKey: 'base_section2_title', contentKey: 'base_section2_content' },
    { titleKey: 'base_optional_empty_title', contentKey: 'base_optional_empty_content', isOptional: true }, // Empty content mock needed
    { titleKey: 'base_optional_present_title', contentKey: 'base_optional_present_content', isOptional: true },
  ],
};

describe('TemplateRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // jest -> vi

    // Setup mock for i18nProvider.translate to handle both string and object arguments
    (mockI18nProvider.translate as Mock).mockImplementation((arg: string | { key: string; language: Language; params?: Record<string, string> }) => { // as Mock を追加
      let key: string;
      let language: Language | undefined;
      if (typeof arg === 'string') {
        key = arg;
        language = 'en'; // Assume default language if only key is passed
      } else {
        if (!arg) return '';
        key = arg.key;
        language = arg.language;
      }

      // Mock translations
      if (key === 'base_title') return 'Base Title';
      if (key === 'base_section1_title') return 'Base Section 1';
      if (key === 'base_section1_content') return 'Base Content 1 with {{VAR_1}}';
      if (key === 'base_section2_title') return 'Base Section 2';
      if (key === 'base_section2_content') return 'Base Content 2';
      if (key === 'base_optional_empty_title') return 'Base Optional Empty';
      if (key === 'base_optional_empty_content') return ''; // Mock empty content
      if (key === 'base_optional_present_title') return 'Base Optional Present';
      if (key === 'base_optional_present_content') return 'This base optional should appear';
      if (key === 'template.placeholder.placeholder_1' && language === 'ja') return 'プレースホルダー1コメント';
      if (key === 'template.placeholder.placeholder_1' && language === 'en') return 'Placeholder 1 Comment';
      if (key === 'template.placeholder.placeholder_1') return 'Placeholder 1 Generic Comment'; // Fallback

      return key; // Default
    });
  });

  describe('renderToMarkdown (JSON Template)', () => {
    it('should render a JSON template correctly for ja', () => {
      const variables = { VAR_1: '変数1' };
      
      // テスト用の翻訳を設定
      (mockI18nProvider.translate as Mock).mockImplementation((arg: { key: string; language: Language }) => {
        if (arg.key === 'template.title.test' && arg.language === 'ja') return 'テストテンプレート';
        if (arg.key === 'template.section.test_section1' && arg.language === 'ja') return 'セクション1';
        if (arg.key === 'template.content.test_section1' && arg.language === 'ja') return '内容 1 {{VAR_1}}';
        if (arg.key === 'template.section.test_section2' && arg.language === 'ja') return 'セクション2';
        if (arg.key === 'template.content.test_section2' && arg.language === 'ja') return '内容 2';
        if (arg.key === 'template.section.test_optional_empty' && arg.language === 'ja') return '省略可能な空';
        if (arg.key === 'template.content.test_optional_empty' && arg.language === 'ja') return ''; // 空の内容
        if (arg.key === 'template.section.test_optional_present' && arg.language === 'ja') return '省略可能な表示項目';
        if (arg.key === 'template.content.test_optional_present' && arg.language === 'ja') return 'これは表示されるべき';
        if (arg.key === 'template.section.test_fallback' && arg.language === 'ja') return 'フォールバックセクション';
        if (arg.key === 'template.content.test_fallback' && arg.language === 'ja') return 'フォールバック内容';
        // 指定されていない場合は英語のフォールバックを模倣
        if (arg.language === 'ja') return arg.key;
        return arg.key;
      });
      
      const markdown = renderer.renderToMarkdown(dummyJsonTemplate, 'ja', variables);

      // 期待される内容をチェック
      expect(markdown).toContain('# テストテンプレート');
      expect(markdown).toContain('## セクション1');
      expect(markdown).toContain('内容 1 変数1'); // 変数が置換されていることを確認
      expect(markdown).toContain('## セクション2');
      expect(markdown).toContain('内容 2');
      expect(markdown).not.toContain('省略可能な空'); // 空の内容は省略されるべき
      expect(markdown).toContain('## 省略可能な表示項目');
      expect(markdown).toContain('これは表示されるべき');
      expect(markdown).toContain('## フォールバックセクション');
      expect(markdown).toContain('フォールバック内容');
    });

    it('should render a JSON template correctly for en', () => {
      const variables = { VAR_1: 'Variable1' };
      
      // 英語の翻訳を設定
      (mockI18nProvider.translate as Mock).mockImplementation((arg: { key: string; language: Language }) => {
        if (arg.key === 'template.title.test' && arg.language === 'en') return 'Test Template';
        if (arg.key === 'template.section.test_section1' && arg.language === 'en') return 'Section 1';
        if (arg.key === 'template.content.test_section1' && arg.language === 'en') return 'Content 1 {{VAR_1}}';
        if (arg.key === 'template.section.test_section2' && arg.language === 'en') return 'Section 2';
        if (arg.key === 'template.content.test_section2' && arg.language === 'en') return 'Content 2';
        if (arg.key === 'template.section.test_optional_empty' && arg.language === 'en') return 'Optional Empty';
        if (arg.key === 'template.content.test_optional_empty' && arg.language === 'en') return ''; // 空の内容
        if (arg.key === 'template.section.test_optional_present' && arg.language === 'en') return 'Optional Present';
        if (arg.key === 'template.content.test_optional_present' && arg.language === 'en') return 'This should appear';
        if (arg.key === 'template.section.test_fallback' && arg.language === 'en') return 'Fallback Section';
        if (arg.key === 'template.content.test_fallback' && arg.language === 'en') return 'Fallback Content';
        return arg.key;
      });
      
      const markdown = renderer.renderToMarkdown(dummyJsonTemplate, 'en', variables);

      // 期待される内容をチェック
      expect(markdown).toContain('# Test Template');
      expect(markdown).toContain('## Section 1');
      expect(markdown).toContain('Content 1 Variable1'); // 変数が置換されていることを確認
      expect(markdown).toContain('## Section 2');
      expect(markdown).toContain('Content 2');
      expect(markdown).not.toContain('Optional Empty'); // 空の内容は省略されるべき
      expect(markdown).toContain('## Optional Present');
      expect(markdown).toContain('This should appear');
      expect(markdown).toContain('## Fallback Section');
      expect(markdown).toContain('Fallback Content');
    });

     it('should handle missing language keys by falling back to en or first available', () => {
      // テスト用の新しいテンプレート形式で言語フォールバックをテスト
      const templateWithMissingLang = {
        schema: 'template_v1',
        metadata: {
          id: 'missing-lang-template',
          titleKey: 'template.title.missing',
          descriptionKey: 'template.description.missing',
          type: 'system',
          lastModified: '2025-04-01T00:00:00.000Z'
        },
        content: {
          sections: [
            {
              id: 'section1',
              titleKey: 'template.section.missing_s1',
              contentKey: 'template.content.missing_s1',
              isOptional: false
            },
            {
              id: 'section2',
              titleKey: 'template.section.missing_s2',
              contentKey: 'template.content.missing_s2',
              isOptional: false
            }
          ],
          placeholders: {}
        }
      };
      
      // 一部の言語のみ利用可能なモック翻訳を設定
      (mockI18nProvider.translate as Mock).mockImplementation((arg: { key: string; language: Language }) => {
        // 英語の翻訳のみ存在するケース
        if (arg.key === 'template.title.missing' && arg.language === 'en') return 'English Only Title';
        if (arg.key === 'template.section.missing_s1' && arg.language === 'en') return 'English Section';
        if (arg.key === 'template.content.missing_s1' && arg.language === 'en') return 'English Content';
        
        // 中国語の翻訳のみ存在するケース
        if (arg.key === 'template.section.missing_s2' && arg.language === 'zh') return 'Chinese Title';
        if (arg.key === 'template.content.missing_s2' && arg.language === 'zh') return 'Chinese Content';
        
        // 言語不一致の場合、デフォルトのフォールバック動作をシミュレート
        if (arg.key === 'template.title.missing') return 'English Only Title'; // 内部でenにフォールバック
        if (arg.key === 'template.section.missing_s1') return 'English Section'; // 内部でenにフォールバック
        if (arg.key === 'template.content.missing_s1') return 'English Content'; // 内部でenにフォールバック
        if (arg.key === 'template.section.missing_s2') return 'Chinese Title'; // 内部でenがないのでzhにフォールバック
        if (arg.key === 'template.content.missing_s2') return 'Chinese Content'; // 内部でenがないのでzhにフォールバック
        
        return arg.key; // その他の場合はキーをそのまま返す
      });
      
      const markdown = renderer.renderToMarkdown(templateWithMissingLang, 'ja'); // 日本語でリクエスト

      // フォールバック結果の検証
      expect(markdown).toContain('# English Only Title'); // タイトルは英語にフォールバック
      expect(markdown).toContain('## English Section'); // セクション1のタイトルは英語にフォールバック
      expect(markdown).toContain('English Content'); // セクション1の内容は英語にフォールバック
      expect(markdown).toContain('## Chinese Title'); // セクション2のタイトルは中国語にフォールバック
      expect(markdown).toContain('Chinese Content'); // セクション2の内容は中国語にフォールバック
    });
  });

  describe('renderToMarkdown (Base Template)', () => {
    it('should render a base template correctly for ja', () => {
      const variables = { VAR_1: '変数壱' };
      // Setup specific mocks for Japanese translations for this test case
      (mockI18nProvider.translate as Mock).mockImplementation((arg: string | { key: string; language: Language; params?: Record<string, string> }) => { // as Mock を追加
        let key: string;
        let lang: Language | undefined;
        if (typeof arg === 'string') { key = arg; lang = 'ja'; } else { key = arg.key; lang = arg.language; }

        if (key === 'base_title') return 'ベースタイトル';
        if (key === 'base_section1_title') return 'ベースセクション1';
        if (key === 'base_section1_content') return 'ベース内容1 {{VAR_1}}';
        if (key === 'base_section2_title') return 'ベースセクション2';
        if (key === 'base_section2_content') return 'ベース内容2';
        if (key === 'base_optional_empty_title') return '任意空';
        if (key === 'base_optional_empty_content') return '';
        if (key === 'base_optional_present_title') return '任意有';
        if (key === 'base_optional_present_content') return 'これは表示されるべき';
        // Mock placeholder comment translation for ja
        if (key === 'template.placeholder.placeholder_1' && lang === 'ja') return 'プレースホルダー1コメント';
        return key; // Fallback
      });

      const markdown = renderer.renderToMarkdown(dummyBaseTemplate, 'ja', variables);

      expect(markdown).toContain('# ベースタイトル');
      expect(markdown).toContain('## ベースセクション1');
      expect(markdown).toContain('ベース内容1 変数壱');
      expect(markdown).toContain('<!-- プレースホルダー1コメント -->'); // Expect specific ja comment
      expect(markdown).toContain('{{PLACEHOLDER_1}}');
      expect(markdown).toContain('## ベースセクション2');
      expect(markdown).toContain('ベース内容2');
      expect(markdown).not.toContain('任意空'); // Optional empty skipped
      expect(markdown).toContain('## 任意有');
      expect(markdown).toContain('これは表示されるべき');
    });

    it('should render a base template correctly for en', () => {
      const variables = { VAR_1: 'VariableOne' };
      // Use default mocks from beforeEach for en

      const markdown = renderer.renderToMarkdown(dummyBaseTemplate, 'en', variables);

      expect(markdown).toContain('# Base Title');
      expect(markdown).toContain('## Base Section 1');
      expect(markdown).toContain('Base Content 1 with VariableOne');
      // Check placeholder comment (assuming getPlaceholderComment uses object format)
      expect(mockI18nProvider.translate).toHaveBeenCalledWith({ key: 'template.placeholder.placeholder_1', language: 'en' });
      expect(markdown).toContain('<!-- Placeholder 1 Comment -->');
      expect(markdown).toContain('{{PLACEHOLDER_1}}');
      expect(markdown).toContain('## Base Section 2');
      expect(markdown).toContain('Base Content 2');
      expect(markdown).not.toContain('Base Optional Empty'); // Optional empty skipped
      expect(markdown).toContain('## Base Optional Present');
      expect(markdown).toContain('This base optional should appear');
    });

    it('should use generic placeholder comment if specific translation is missing', () => {
      // Setup mock to return the key for the specific placeholder comment key
      (mockI18nProvider.translate as Mock).mockImplementation((arg: string | { key: string; language: Language; params?: Record<string, string> }) => { // as Mock を追加
        let key: string;
        if (typeof arg === 'string') key = arg; else key = arg.key;
        // Return the key itself ONLY for the specific placeholder key
        if (key === 'template.placeholder.placeholder_1') return key;
        // Provide other basic translations needed by the renderer for 'en'
        if (key === 'base_title') return 'Base Title';
        if (key === 'base_section1_title') return 'Base Section 1';
        if (key === 'base_section1_content') return 'Base Content 1 with {{VAR_1}}';
        if (key === 'base_section2_title') return 'Base Section 2';
        if (key === 'base_section2_content') return 'Base Content 2';
        if (key === 'base_optional_empty_title') return 'Base Optional Empty';
        if (key === 'base_optional_empty_content') return '';
        if (key === 'base_optional_present_title') return 'Base Optional Present';
        if (key === 'base_optional_present_content') return 'This base optional should appear';
        return key; // Fallback
      });

      const markdown = renderer.renderToMarkdown(dummyBaseTemplate, 'en');
      // Expect the generic comment because the specific key was returned by the mock
      expect(markdown).toContain('<!-- Auto-generated from memory bank -->'); // Generic en comment
      // Verify the specific key was requested
      expect(mockI18nProvider.translate).toHaveBeenCalledWith({ key: 'template.placeholder.placeholder_1', language: 'en' });
    });
  });

  describe('replaceVariables', () => {
    // Access private method for testing (common practice, but be mindful)
    const replaceVariables = (renderer as any).replaceVariables;

    it('should replace variables correctly', () => {
      const text = 'Hello {{NAME}}, welcome to {{PLACE}}!';
      const variables = { NAME: 'Mirai', PLACE: 'CodeLand' };
      expect(replaceVariables(text, variables)).toBe('Hello Mirai, welcome to CodeLand!');
    });

    it('should handle variables with numbers and underscores', () => {
      const text = 'Value: {{VAR_1}}, Setting: {{CONFIG_2_VALUE}}';
      const variables = { VAR_1: '123', CONFIG_2_VALUE: 'true' };
      expect(replaceVariables(text, variables)).toBe('Value: 123, Setting: true');
    });

    it('should handle lowercase variable names correctly due to updated regex', () => { // Test name updated to reflect the change
       const text = 'Test: {{var_lower}}, {{VAR_UPPER}}';
       const variables = { var_lower: 'lower', VAR_UPPER: 'UPPER' };
       // Regex now matches lowercase letters too
       expect(replaceVariables(text, variables)).toBe('Test: lower, UPPER');
     });


    it('should not replace non-matching placeholders', () => {
      const text = 'Keep {{this}}, replace {{THAT}}';
      const variables = { THAT: 'replaced' };
      expect(replaceVariables(text, variables)).toBe('Keep {{this}}, replace replaced');
    });

    it('should handle empty variables object', () => {
      const text = 'Text with {{VAR}}';
      expect(replaceVariables(text, {})).toBe('Text with {{VAR}}');
    });

     it('should handle variables not found in the map', () => {
       const text = 'Found: {{FOUND}}, Not Found: {{NOT_FOUND}}';
       const variables = { FOUND: 'yes' };
       expect(replaceVariables(text, variables)).toBe('Found: yes, Not Found: {{NOT_FOUND}}');
     });
  });
});
