/**
 * JSON Template Loader
 * Loads and processes JSON templates with internationalization support
 */
import path from 'node:path';
import * as fs from 'fs';

// 型定義を更新
import { Template, Language } from '@memory-bank/schemas/templates';
// テンプレート定義をインポート
import * as templateDefinitions from '../../templates/definitions/index.js';

import { IFileSystemService } from '../storage/interfaces/IFileSystemService.js';
import { II18nProvider } from '../i18n/interfaces/II18nProvider.js';
import { TemplateRenderer } from './TeplateRenderer.js';
import { ITemplateLoader } from './interfaces/ITemplateLoader.js';
import { logger } from '../../shared/utils/logger.js';

// 型エイリアスの更新
type JsonTemplate = Template;
// unknown型を経由して型変換することで安全に変換する
const validateJsonTemplate = (data: Record<string, unknown>): Template => {
  // 基本的な検証（最低限のプロパティが存在するか）
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid template: data must be an object');
  }
  if (!('schema' in data) || !('metadata' in data) || !('content' in data)) {
    throw new Error('Invalid template: missing required properties (schema, metadata, or content)');
  }
  return data as unknown as Template;
};

/**
 * Implementation of ITemplateLoader for JSON templates
 */
export class JsonTemplateLoader implements ITemplateLoader {
  private readonly templateRenderer: TemplateRenderer;

  // Legacy patterns removed as per user request

  /**
   * Constructor
   *
   * @param fileSystemService Service for file system operations
   * @param i18nProvider Provider for internationalization services
   */
  constructor(
    private readonly fileSystemService: IFileSystemService,
    private readonly i18nProvider: II18nProvider
  ) {
    this.templateRenderer = new TemplateRenderer(i18nProvider);
  }

  /**
   * Gets the JSON templates directory path
   */
  private getJsonTemplatesDirectory(): string {
    // For CI and test compatibility, we need to check multiple paths
    const possiblePaths = [
      // Development path for src directory
      path.join(process.cwd(), 'packages/mcp/src/templates/json'),
      // Test environment often uses docRoot/templates/json
      path.join(process.cwd(), 'src/templates/json'),
      // Direct path for tests or when running in dist
      path.join(process.cwd(), 'templates/json')
    ];
    
    for (const pathToCheck of possiblePaths) {
      if (fs.existsSync(pathToCheck)) {
        logger.debug(`Found valid template path: ${pathToCheck}`);
        return pathToCheck;
      }
    }

    // Default to the primary path if none found
    const defaultPath = path.join(process.cwd(), 'packages/mcp/src/templates/json');
    logger.debug(`Using default template path: ${defaultPath}`);
    return defaultPath;
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
   */
  async loadJsonTemplate(templateId: string): Promise<JsonTemplate> {
    // 1. メモリ内の定義をチェック
    const tsTemplateName = this.getTypeScriptTemplateName(templateId);
    
        // インデックスシグネチャの代わりに、型安全にアクセスする
    const template = (templateDefinitions as Record<string, Template | undefined>)[tsTemplateName];
    if (template) {
      logger.debug(`Found in-memory template '${templateId}' as '${tsTemplateName}'`);
      return template;
    }
    
    // 2. 次にファイルシステムをチェック (後方互換性のため)
    const templatePath = path.join(this.getJsonTemplatesDirectory(), `${templateId}.json`);
    
    logger.debug(`Trying to load template '${templateId}' from path: ${templatePath}`);

    try {
      // Check if file exists
      const exists = await this.fileSystemService.fileExists(templatePath);
      if (!exists) {
        logger.error(`Template '${templateId}' not found at: ${templatePath}`);
        throw new Error(`Template not found: ${templateId}`);
      }

      // Read template file
      const content = await this.fileSystemService.readFile(templatePath);
      
      // Parse and validate template
      const template = JSON.parse(content);
      return validateJsonTemplate(template);
    } catch (error) {
      // If it's a SyntaxError (JSON parse error), rethrow it directly
      if (error instanceof SyntaxError) {
        throw error;
      }
      // Otherwise, wrap in generic load error message
      logger.error(`Failed to load template '${templateId}': ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to load JSON template ${templateId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Implements ITemplateLoader.getMarkdownTemplate
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
      // Load the JSON template
      const template = await this.loadJsonTemplate(templateId);

      // Render to Markdown - Language型にキャスト
      return this.templateRenderer.renderToMarkdown(template, language as unknown as Language, variables);
    } catch (error) {
      // Legacy fallback removed, rethrow the original error
      logger.error(`Failed to load or render JSON template ${templateId}`, { error });
      throw error;
    }
  }

  /**
   * Implements ITemplateLoader.templateExists
   */
  async templateExists(templateId: string): Promise<boolean> {
    // 1. メモリ内テンプレートをチェック
    const tsTemplateName = this.getTypeScriptTemplateName(templateId);
    const template = (templateDefinitions as Record<string, Template | undefined>)[tsTemplateName];
    if (template) {
      return true;
    }
    
    // 2. JSONファイルをチェック
    const templatePath = path.join(this.getJsonTemplatesDirectory(), `${templateId}.json`);
    
    try {
      return await this.fileSystemService.fileExists(templatePath);
    } catch (error) {
      logger.debug(`Error checking if template exists: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}