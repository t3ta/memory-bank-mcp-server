/**
 * Template Loader
 * Loads and processes templates with internationalization support
 * TS定義を最優先し、他のパスをフォールバックとしない実装
 */

// 型定義
import { Template, Language } from '@memory-bank/schemas/templates';
// テンプレート定義をインポート（TS定義が唯一のソース）
import * as templateDefinitions from '../../templates/definitions/index.js';

import { II18nProvider } from '../i18n/interfaces/II18nProvider.js';
import { TemplateRenderer } from './TeplateRenderer.js';
import { ITemplateLoader } from './interfaces/ITemplateLoader.js';
import { logger } from '../../shared/utils/logger.js';

// 型エイリアスの更新
type TSTemplate = Template;

/**
 * Implementation of ITemplateLoader using TypeScript template definitions
 */
export class JsonTemplateLoader implements ITemplateLoader {
  private readonly templateRenderer: TemplateRenderer;

  /**
   * Constructor
   *
   * @param i18nProvider Provider for internationalization services
   */
  constructor(
    private readonly i18nProvider: II18nProvider
  ) {
    this.templateRenderer = new TemplateRenderer(i18nProvider);
  }

  /**
   * テンプレートIDをTypeScript変数名に変換
   * 例: 'rules' → 'rulesTemplate'
   * 例: 'active-context' → 'activeContextTemplate'
   */
  private getTypeScriptTemplateName(templateId: string): string {
    return `${templateId.replace(/-([a-z])/g, (_, p1) => p1.toUpperCase())}Template`;
  }

  /**
   * Implements ITemplateLoader.loadJsonTemplate
   * TS定義を使用してテンプレートを取得
   */
  async loadJsonTemplate(templateId: string): Promise<TSTemplate> {
    // TS定義をチェック
    const tsTemplateName = this.getTypeScriptTemplateName(templateId);
    
    // インデックスシグネチャの代わりに、型安全にアクセスする
    const template = (templateDefinitions as Record<string, Template | undefined>)[tsTemplateName];
    if (template) {
      logger.debug(`Found TypeScript template '${templateId}' as '${tsTemplateName}'`);
      return template;
    }
    
    // 見つからなかった場合はエラー
    logger.error(`Template '${templateId}' not found in TypeScript definitions`);
    throw new Error(`Template not found: ${templateId}`);
  }

  /**
   * Implements ITemplateLoader.getMarkdownTemplate
   * TS定義からテンプレートを取得してMarkdownにレンダリング
   */
  async getMarkdownTemplate(
    templateId: string,
    language: string,
    variables?: Record<string, string>
  ): Promise<string> {
    // Check if language is supported
    if (!this.i18nProvider.isLanguageSupported(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    try {
      // TS定義からテンプレートを取得
      const template = await this.loadJsonTemplate(templateId);

      // Render to Markdown - Language型にキャスト
      return this.templateRenderer.renderToMarkdown(template, language as unknown as Language, variables);
    } catch (error) {
      logger.error(`Failed to load or render template ${templateId}`, { error });
      throw error;
    }
  }

  /**
   * Implements ITemplateLoader.templateExists
   * TS定義テンプレートの存在チェック
   */
  async templateExists(templateId: string): Promise<boolean> {
    // TS定義テンプレートをチェック
    const tsTemplateName = this.getTypeScriptTemplateName(templateId);
    const template = (templateDefinitions as Record<string, Template | undefined>)[tsTemplateName];
    return !!template;
  }
}
