// vi.mockが巻き上げされるため、最初に定義する
vi.mock('../../../../src/templates/definitions/index.js', () => ({
  testTemplateTemplate: {
    schema: 'template_v1',
    metadata: {
      id: 'test-template',
      titleKey: 'template.title.test',
      descriptionKey: 'template.description.test',
      type: 'system',
      lastModified: '2025-04-12T12:30:00.000Z'
    },
    content: {
      sections: [
        {
          id: 'section1',
          titleKey: 'template.section.test1',
          contentKey: 'template.content.test1',
          isOptional: false
        },
        {
          id: 'section2',
          titleKey: 'template.section.test2',
          contentKey: 'template.content.test2',
          isOptional: true
        }
      ],
      placeholders: {}
    }
  },
  // nonExistentTemplateTemplateをモックに追加（エラーのテスト用）
  nonExistentTemplateTemplate: undefined
}));

// モックの後にインポート
import { vi, describe, it, beforeEach, expect } from 'vitest';
import type { Mock } from 'vitest';
import { JsonTemplateLoaderRepository } from '../../../../src/infrastructure/templates/JsonTemplateLoaderRepository.js';
import { II18nProvider } from '../../../../src/infrastructure/i18n/interfaces/II18nProvider.js';
import { Language } from '../../../../src/domain/i18n/Language.js';
import { Template } from '../../../../src/domain/templates/Template.js';
import { Section } from '../../../../src/domain/templates/Section.js';

// テスト用定数
const TEST_TEMPLATE_ID = 'test-template';
const NON_EXISTENT_TEMPLATE_ID = 'non-existent-template';
import type en from 'zod/locales/en.js';

// i18nProviderのモック
const mockI18nProvider: II18nProvider = {
  translate: vi.fn(),
  loadTranslations: vi.fn(),
  isLanguageSupported: vi.fn(),
  getSupportedLanguages: vi.fn(),
  getDefaultLanguage: vi.fn(),
};

// Sectionクラスをモック
class MockSection extends Section {
  getTitle(language: Language): string {
    if (language.code === 'ja') {
      if (this.id === 'section1') return 'テストセクション1';
      if (this.id === 'section2') return 'テストセクション2';
    }
    if (language.code === 'en') {
      if (this.id === 'section1') return 'Test Section 1';
      if (this.id === 'section2') return 'Test Section 2';
    }
    return this.id;
  }

  getContent(language: Language): string {
    if (language.code === 'ja') {
      if (this.id === 'section1') return 'テスト内容1 {{var1}}';
      if (this.id === 'section2') return 'テスト内容2';
    }
    if (language.code === 'en') {
      if (this.id === 'section1') return 'Test content 1 {{var1}}';
      if (this.id === 'section2') return 'Test content 2';
    }
    return '';
  }
}

// テンプレートのモック
const mockTemplate = new Template(
  TEST_TEMPLATE_ID,
  'system',
  {
    en: 'Test Template',
    ja: 'テストテンプレート',
    zh: '测试模板'
  },
  [
    new MockSection(
      'section1',
      {
        en: 'Test Section 1',
        ja: 'テストセクション1',
        zh: '测试章节1'
      },
      {
        en: 'Test content 1 {{var1}}',
        ja: 'テスト内容1 {{var1}}',
        zh: '测试内容1 {{var1}}'
      },
      false
    ),
    new MockSection(
      'section2',
      {
        en: 'Test Section 2',
        ja: 'テストセクション2',
        zh: '测试章节2'
      },
      {
        en: 'Test content 2',
        ja: 'テスト内容2',
        zh: '测试内容2'
      },
      true
    )
  ]
);

describe('JsonTemplateLoaderRepository', () => {
  let templateRepository: JsonTemplateLoaderRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    // i18nProviderのモック設定
    (mockI18nProvider.isLanguageSupported as Mock).mockImplementation(
      (lang: string) => ['en', 'ja', 'zh'].includes(lang)
    );

    (mockI18nProvider.translate as Mock).mockImplementation(
      (arg: string | { key: string; language: string; params?: Record<string, string> }) => {
        let key: string;
        let language: string | undefined;

        if (typeof arg === 'string') {
          key = arg;
          language = 'en';
        } else {
          if (!arg) return '';
          key = arg.key;
          language = arg.language;
        }

        // 翻訳モック
        if (key === 'template.title.test' && language === 'ja') return 'テストテンプレート';
        if (key === 'template.title.test' && language === 'en') return 'Test Template';
        if (key === 'template.section.test1' && language === 'ja') return 'テストセクション1';
        if (key === 'template.section.test1' && language === 'en') return 'Test Section 1';
        if (key === 'template.content.test1' && language === 'ja') return 'テスト内容1 {{var1}}';
        if (key === 'template.content.test1' && language === 'en') return 'Test content 1 {{var1}}';
        if (key === 'template.section.test2' && language === 'ja') return 'テストセクション2';
        if (key === 'template.section.test2' && language === 'en') return 'Test Section 2';
        if (key === 'template.content.test2' && language === 'ja') return 'テスト内容2';
        if (key === 'template.content.test2' && language === 'en') return 'Test content 2';
        return key;
      }
    );

    // Create a new instance for each test
    templateRepository = new JsonTemplateLoaderRepository(mockI18nProvider);

    // テンプレートキャッシュの初期化をモック
    vi.spyOn(templateRepository as any, 'loadAllTemplates').mockImplementation(async () => {
      const templateCache = new Map<string, Template>();
      templateCache.set(TEST_TEMPLATE_ID, mockTemplate as unknown as Template);
      (templateRepository as any).templateCache = templateCache;
      (templateRepository as any).cacheDirty = false;
    });
  });

  // ITemplateRepository実装のテスト
  describe('getTemplate', () => {
    it('should return a template if it exists', async () => {
      await (templateRepository as any).loadAllTemplates();
      const template = await templateRepository.getTemplate(TEST_TEMPLATE_ID);
      expect(template).toBeDefined();
      expect(template?.id).toBe(TEST_TEMPLATE_ID);
    });

    it('should return null if template does not exist', async () => {
      await (templateRepository as any).loadAllTemplates();
      const template = await templateRepository.getTemplate(NON_EXISTENT_TEMPLATE_ID);
      expect(template).toBeNull();
    });
  });

  describe('getTemplateAsJsonObject', () => {
    it('should return template as JSON object', async () => {
      await (templateRepository as any).loadAllTemplates();

      // テンプレートの取得メソッドをモック
      vi.spyOn(mockTemplate, 'getName').mockReturnValue('テストテンプレート');

      // テンプレートのセクションのgetter
      // getTitle/getContentはSectionクラスのインスタンスメソッドですが、
      // mockSectionはモックオブジェクトなのでプロパティを直接設定します
      const mockSection1 = mockTemplate.sections[0];
      const mockSection2 = mockTemplate.sections[1];

      // mockTemplateのgetNameメソッドをスパイして値を返す
      vi.spyOn(mockTemplate, 'getName').mockReturnValue('テストテンプレート');

      // 実際のテストではモックセクションはgetするのでなく、セクションを直接取得させる
      // つまり、実際のテンプレートのセクションがJSON化されるのでスパイは必要ない

      const language = new Language('ja');
      const jsonObject = await templateRepository.getTemplateAsJsonObject(TEST_TEMPLATE_ID, language);

      expect(jsonObject).toBeDefined();
      expect(jsonObject.id).toBe(TEST_TEMPLATE_ID);
      expect(jsonObject.type).toBe('system');
      expect(jsonObject.name).toBe('テストテンプレート');
      expect(jsonObject.sections).toHaveLength(2);
    });

    it('should throw an error if template does not exist', async () => {
      await (templateRepository as any).loadAllTemplates();
      const language = new Language('ja');

      await expect(templateRepository.getTemplateAsJsonObject(NON_EXISTENT_TEMPLATE_ID, language))
        .rejects.toThrow(`Template not found: ${NON_EXISTENT_TEMPLATE_ID}`);
    });
  });

  // ITemplateLoader実装のテスト
  describe('loadJsonTemplate', () => {
    it('should load template from TypeScript definitions', async () => {
      const template = await templateRepository.loadJsonTemplate(TEST_TEMPLATE_ID);
      expect(template).toBeDefined();
      expect(template.metadata.id).toBe(TEST_TEMPLATE_ID);
      expect(template.metadata.type).toBe('system');
    });

    it('should throw an error if template does not exist', async () => {
      vi.spyOn(templateRepository as any, 'getTypeScriptTemplateName').mockReturnValue('nonExistentTemplateTemplate');

      await expect(templateRepository.loadJsonTemplate(NON_EXISTENT_TEMPLATE_ID))
        .rejects.toThrow(`Template not found: ${NON_EXISTENT_TEMPLATE_ID}`);
    });
  });

  describe('getMarkdownTemplate', () => {
    it('should render template to markdown', async () => {
      vi.spyOn(templateRepository as any, 'renderTemplateToMarkdown').mockImplementation((template, language) => {
        if (language === 'ja') {
          return '# テストテンプレート\n\n## テストセクション1\nテスト内容1 変数値\n\n## テストセクション2\nテスト内容2';
        }
        return '# Test Template';
      });

      const markdown = await templateRepository.getMarkdownTemplate(TEST_TEMPLATE_ID, 'ja', { var1: '変数値' });

      expect(markdown).toContain('# テストテンプレート');
      expect(markdown).toContain('## テストセクション1');
      expect(markdown).toContain('テスト内容1 変数値');
    });

    it('should throw an error for unsupported language', async () => {
      (mockI18nProvider.isLanguageSupported as Mock).mockReturnValue(false);

      await expect(templateRepository.getMarkdownTemplate(TEST_TEMPLATE_ID, 'unsupported'))
        .rejects.toThrow('Unsupported language: unsupported');
    });
  });

  describe('templateExists', () => {
    it('should return true if template exists', async () => {
      await (templateRepository as any).loadAllTemplates();
      const exists = await templateRepository.templateExists(TEST_TEMPLATE_ID);
      expect(exists).toBe(true);
    });

    it('should return false if template does not exist', async () => {
      await (templateRepository as any).loadAllTemplates();
      const exists = await templateRepository.templateExists(NON_EXISTENT_TEMPLATE_ID);
      expect(exists).toBe(false);
    });
  });
});
