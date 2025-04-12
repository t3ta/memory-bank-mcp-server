/**
 * JsonTemplateLoaderRepository
 *
 * TypeScript定義からテンプレートを直接ロードするリポジトリの実装。
 * ITemplateRepositoryインターフェースとITemplateLoaderインターフェースの両方を実装し、
 * FileTemplateRepositoryとTemplateRendererの機能を統合した効率的で軽量な実装です。
 */

import { Template as DomainTemplate } from '../../domain/templates/Template.js';
import { ITemplateRepository } from '../../domain/templates/ITemplateRepository.js';
import { Language } from '../../domain/i18n/Language.js';
import { Section, LanguageTextMap } from '../../domain/templates/Section.js';
import { Template as SchemaTemplate, Language as SchemaLanguage } from '@memory-bank/schemas/templates';
import * as templateDefinitions from '../../templates/definitions/index.js';
import { II18nProvider } from '../i18n/interfaces/II18nProvider.js';
import { ITemplateLoader } from './interfaces/ITemplateLoader.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * JsonTemplateLoaderRepository class
 * TypeScript定義からテンプレートを直接ロードする
 * ITemplateRepositoryとITemplateLoaderの両方を実装したクラス
 */
export class JsonTemplateLoaderRepository implements ITemplateRepository, ITemplateLoader {
  // テンプレートをキャッシュするためのマップ
  private templateCache: Map<string, DomainTemplate> = new Map();
  private cacheDirty = true;
  private readonly componentLogger = logger.withContext({ component: 'JsonTemplateLoaderRepository' });

  /**
   * コンストラクタ
   * @param i18nProvider 国際化サービス
   */
  constructor(
    private readonly i18nProvider: II18nProvider
  ) {}

  /**
   * テンプレートIDをTypeScript変数名に変換
   * 例: 'rules' → 'rulesTemplate'
   * 例: 'active-context' → 'activeContextTemplate'
   */
  private getTypeScriptTemplateName(templateId: string): string {
    return `${templateId.replace(/-([a-z])/g, (_, p1) => p1.toUpperCase())}Template`;
  }

  /**
   * 初期化メソッド - 必要に応じて呼び出す
   */
  async initialize(): Promise<void> {
    await this.loadAllTemplates();
  }

  /**
   * すべてのテンプレートをロードしてキャッシュに格納
   */
  private async loadAllTemplates(): Promise<void> {
    try {
      // キャッシュをクリア
      this.templateCache.clear();

      this.componentLogger.debug('Loading templates from TypeScript definitions');

      // テンプレートをロード
      for (const [key, value] of Object.entries(templateDefinitions)) {
        if (key.endsWith('Template') && value && typeof value === 'object' && 'schema' in value && value.schema === 'template_v1') {
          try {
            const tsTemplate = value as SchemaTemplate;

            if (tsTemplate.metadata && tsTemplate.content && tsTemplate.metadata.id) {
              const id = tsTemplate.metadata.id;

              this.componentLogger.debug(`Loading template ${id} from TypeScript definition`);

              // テンプレートを作成
              const template = this.convertSchemaTemplateToDomain(tsTemplate);

              // キャッシュに追加
              this.templateCache.set(id, template);
            }
          } catch (error) {
            this.componentLogger.warn(`Failed to load template ${key} from TypeScript:`, error);
          }
        }
      }

      this.componentLogger.info(`Loaded ${this.templateCache.size} templates from TypeScript definitions`);
      this.cacheDirty = false;
    } catch (error) {
      this.componentLogger.error('Failed to load templates:', error);
      throw new Error(`Failed to load templates: ${(error as Error).message}`);
    }
  }

  /**
   * スキーマテンプレートをドメインテンプレートに変換
   */
  private convertSchemaTemplateToDomain(tsTemplate: SchemaTemplate): DomainTemplate {
    // セクションを作成
    const sections: Section[] = tsTemplate.content.sections.map(sectionData => {
      // このセクションのタイトルとコンテンツマップを作成
      const titleMap: LanguageTextMap = {};
      const contentMap: LanguageTextMap = {};

      if (this.i18nProvider) {
        // 英語のタイトルとコンテンツ
        titleMap.en = this.i18nProvider.translate({
          key: sectionData.titleKey,
          language: 'en'
        });
        contentMap.en = this.i18nProvider.translate({
          key: sectionData.contentKey,
          language: 'en'
        });

        // 日本語のタイトルとコンテンツ
        titleMap.ja = this.i18nProvider.translate({
          key: sectionData.titleKey,
          language: 'ja'
        });
        contentMap.ja = this.i18nProvider.translate({
          key: sectionData.contentKey,
          language: 'ja'
        });

        // 中国語のタイトルとコンテンツ
        titleMap.zh = this.i18nProvider.translate({
          key: sectionData.titleKey,
          language: 'zh'
        });
        contentMap.zh = this.i18nProvider.translate({
          key: sectionData.contentKey,
          language: 'zh'
        });
      } else {
        // フォールバック
        titleMap.en = sectionData.titleKey;
        contentMap.en = sectionData.contentKey;
      }

      return new Section(
        sectionData.id,
        titleMap,
        contentMap,
        sectionData.isOptional
      );
    });

    // 名前マップを作成
    const nameMap: LanguageTextMap = {};

    if (this.i18nProvider && tsTemplate.metadata.titleKey) {
      nameMap.en = this.i18nProvider.translate({
        key: tsTemplate.metadata.titleKey,
        language: 'en'
      });
      nameMap.ja = this.i18nProvider.translate({
        key: tsTemplate.metadata.titleKey,
        language: 'ja'
      });
      nameMap.zh = this.i18nProvider.translate({
        key: tsTemplate.metadata.titleKey,
        language: 'zh'
      });
    } else {
      nameMap.en = tsTemplate.metadata.titleKey || tsTemplate.metadata.id;
    }

    // ドメインテンプレートを作成
    return new DomainTemplate(
      tsTemplate.metadata.id,
      tsTemplate.metadata.type,
      nameMap,
      sections
    );
  }

  /**
   * テンプレートを取得する
   */
  async getTemplate(id: string): Promise<DomainTemplate | null> {
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }

    return this.templateCache.get(id) || null;
  }

  /**
   * テンプレートをJSONオブジェクトとして取得する
   */
  async getTemplateAsJsonObject(
    id: string,
    language: Language,
    _variables?: Record<string, string>
  ): Promise<Record<string, any>> {
    this.componentLogger.debug(`Getting template '${id}' as JSON object for language: ${language.code}`);

    // キャッシュが汚れている場合はリロード
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }

    // キャッシュからテンプレートを取得
    let template = this.templateCache.get(id);

    // 見つからない場合は、再度リロードして確認
    if (!template) {
      this.componentLogger.debug(`Template '${id}' not found in cache, forcing reload`);
      this.cacheDirty = true;
      await this.loadAllTemplates();
      template = this.templateCache.get(id);
    }

    // TypeScript定義から直接ロード
    if (!template) {
      this.componentLogger.debug(`Template '${id}' still not found, attempting to load directly from TypeScript`);

      const tsTemplateName = this.getTypeScriptTemplateName(id);
      const tsTemplate = (templateDefinitions as Record<string, SchemaTemplate | undefined>)[tsTemplateName];

      if (tsTemplate && tsTemplate.schema === 'template_v1') {
        this.componentLogger.debug(`Found TypeScript template '${id}' as '${tsTemplateName}'`);

        try {
          template = this.convertSchemaTemplateToDomain(tsTemplate);

          // キャッシュに保存
          this.templateCache.set(id, template);
        } catch (error) {
          this.componentLogger.error(`Failed to process TypeScript template '${id}':`, error);
        }
      }
    }

    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    // JSONオブジェクトを構築
    const jsonObject: Record<string, any> = {
      id: template.id,
      type: template.type,
      name: template.getName(language),
      sections: template.sections.map(section => ({
        id: section.id,
        title: section.getTitle(language),
        content: section.getContent(language),
        isOptional: section.isOptional,
      })),
    };

    return jsonObject;
  }

  /**
   * 指定したタイプのテンプレートをすべて取得
   */
  async getTemplatesByType(type: string): Promise<DomainTemplate[]> {
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }

    const templates: DomainTemplate[] = [];

    for (const template of this.templateCache.values()) {
      if (template.type === type) {
        templates.push(template);
      }
    }

    return templates;
  }

  /**
   * テンプレートを保存する（TypeScript定義でTypeScriptファイルに書き込まれるため、このメソッドはサポートしない）
   */
  async saveTemplate(_template: DomainTemplate): Promise<boolean> {
    this.componentLogger.warn('saveTemplate is not supported in JsonTemplateLoaderRepository. Templates should be defined in TypeScript files.');
    return false;
  }

  /**
   * テンプレートが存在するかチェック
   */
  async templateExists(id: string): Promise<boolean> {
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }

    if (this.templateCache.has(id)) {
      return true;
    }

    // TypeScript定義内で直接チェック
    const tsTemplateName = this.getTypeScriptTemplateName(id);
    return !!(templateDefinitions as Record<string, unknown>)[tsTemplateName];
  }

  /**
   * 利用可能なすべてのテンプレートIDを取得
   */
  async getAllTemplateIds(): Promise<string[]> {
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }

    return Array.from(this.templateCache.keys());
  }

  /**
   * 利用可能なすべてのテンプレートタイプを取得
   */
  async getAllTemplateTypes(): Promise<string[]> {
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }

    const types = new Set<string>();

    for (const template of this.templateCache.values()) {
      types.add(template.type);
    }

    return Array.from(types);
  }

  // ===== ITemplateLoader インターフェース実装 =====

  /**
   * TemplateLoaderインターフェースのloadJsonTemplateメソッドを実装
   * スキーマTemplateを直接返す
   */
  async loadJsonTemplate(templateId: string): Promise<SchemaTemplate> {
    this.componentLogger.debug(`Loading JSON template: ${templateId}`);

    // TypeScript定義から直接テンプレートを取得
    const tsTemplateName = this.getTypeScriptTemplateName(templateId);
    const template = (templateDefinitions as Record<string, SchemaTemplate | undefined>)[tsTemplateName];

    if (template && template.schema === 'template_v1') {
      this.componentLogger.debug(`Found TypeScript template '${templateId}' as '${tsTemplateName}'`);
      return template;
    }

    // 見つからなかった場合はエラー
    this.componentLogger.error(`Template '${templateId}' not found in TypeScript definitions`);
    throw new Error(`Template not found: ${templateId}`);
  }

  /**
   * TemplateLoaderインターフェースのgetMarkdownTemplateメソッドを実装
   * テンプレートをMarkdownにレンダリング
   */
  async getMarkdownTemplate(
    templateId: string,
    language: SchemaLanguage,
    variables?: Record<string, string>
  ): Promise<string> {
    this.componentLogger.debug(`Getting markdown template: ${templateId}, language: ${language}`);

    // 言語サポートチェック
    if (!this.i18nProvider.isLanguageSupported(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    try {
      // TypeScript定義からテンプレートを取得
      const tsTemplate = await this.loadJsonTemplate(templateId);

      // Markdownにレンダリング
      return this.renderTemplateToMarkdown(tsTemplate, language, variables);
    } catch (error) {
      this.componentLogger.error(`Failed to load or render template ${templateId}`, { error });
      throw error;
    }
  }

  /**
   * テンプレートをMarkdownにレンダリング
   * 旧TemplateRendererの機能を統合
   */
  private renderTemplateToMarkdown(
    template: SchemaTemplate,
    language: SchemaLanguage,
    variables?: Record<string, string>
  ): string {
    const lines: string[] = [];

    // タイトルを追加
    const titleKey = template.metadata.titleKey;
    const title = this.i18nProvider.translate({
      key: titleKey,
      language
    });
    lines.push(`# ${title}\n`);

    // セクションを追加
    for (const section of template.content.sections) {
      const sectionContent = this.renderSection(
        section,
        language,
        variables
      );

      // 空のオプションセクションはスキップ
      if (section.isOptional && sectionContent.trim() === '') {
        continue;
      }

      lines.push(sectionContent);
    }

    return lines.join('\n');
  }

  /**
   * テンプレートのセクションをレンダリング
   */
  private renderSection(
    section: SchemaTemplate['content']['sections'][0],
    language: SchemaLanguage,
    variables?: Record<string, string>
  ): string {
    const lines: string[] = [];

    // コンテンツを先に翻訳して、空かどうかをチェック
    let content = section.contentKey ? this.i18nProvider.translate({
      key: section.contentKey,
      language
    }) : '';

    if (variables && content) {
      content = this.replaceVariables(content, variables);
    }

    // セクションがオプショナルで内容が空の場合は空文字を返す
    if (section.isOptional && content.trim() === '') {
      return '';
    }

    // 内容が空でない場合はタイトルを追加
    const title = this.i18nProvider.translate({
      key: section.titleKey,
      language
    });

    if (title.trim() && content.trim() !== '') {
      lines.push(`## ${title}\n`);
    }

    // 内容が空でない場合は追加
    if (content.trim() !== '') {
      lines.push(content);
    }

    return lines.join('\n');
  }

  /**
   * テキスト内の変数を置換
   */
  private replaceVariables(text: string, variables: Record<string, string>): string {
    // 小文字とアンダースコアを含む変数名をサポート
    return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, name) => {
      return variables[name] || match;
    });
  }
}
