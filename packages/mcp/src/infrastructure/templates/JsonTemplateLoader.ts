/**
 * JSON Template Loader
 * Loads and processes JSON templates with internationalization support
 */
import path from 'node:path';
// 具体的な型が定義されるまでの暫定対応としてRecordを使用
type JsonTemplate = Record<string, unknown>;
const validateJsonTemplate = (data: Record<string, unknown>): Record<string, unknown> => data; // Dummy validator
type Language = 'en' | 'ja' | 'zh';
import { IFileSystemService } from '../storage/interfaces/IFileSystemService.js';
import { II18nProvider } from '../i18n/interfaces/II18nProvider.js';
import { TemplateRenderer } from './TeplateRenderer.js';
import { ITemplateLoader } from './interfaces/ITemplateLoader.js';
import { logger } from '../../shared/utils/logger.js';

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
    // Use project-relative paths instead of import.meta.url
    return path.join(process.cwd(), 'src/templates/json');
  }

  // Legacy directory method removed

  /**
   * Implements ITemplateLoader.loadJsonTemplate
   */
  async loadJsonTemplate(templateId: string): Promise<JsonTemplate> {
    const templatePath = path.join(this.getJsonTemplatesDirectory(), `${templateId}.json`);

    try {
      // Check if file exists
      const exists = await this.fileSystemService.fileExists(templatePath);
      if (!exists) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Read template file
      const content = await this.fileSystemService.readFile(templatePath);

      // Parse and validate template
      const template = JSON.parse(content);
      return validateJsonTemplate(template);
    } catch (error) {
      // If it's a SyntaxError (JSON parse error), rethrow it directly
      // so the caller can potentially identify it specifically.
      if (error instanceof SyntaxError) {
        throw error;
      }
      // Otherwise, wrap it in a generic load error message.
      throw new Error(`Failed to load JSON template ${templateId}: ${(error as Error).message}`);
    }
  }

  /**
   * Implements ITemplateLoader.getMarkdownTemplate
   */
  async getMarkdownTemplate(
    templateId: string,
    language: Language,
    variables?: Record<string, string>
  ): Promise<string> {
    // Check if language is supported
    if (!this.i18nProvider.isLanguageSupported(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    try {
      // Load the JSON template
      const template = await this.loadJsonTemplate(templateId);

      // Render to Markdown
      return this.templateRenderer.renderToMarkdown(template, language, variables);
    } catch (error) {
      // Legacy fallback removed, rethrow the original error
      logger.error(`Failed to load or render JSON template ${templateId}`, { error });
      throw error;
    }
  }

  // loadLegacyTemplate method removed

  /**
   * Implements ITemplateLoader.templateExists
   */
  async templateExists(templateId: string): Promise<boolean> {
    const jsonPath = path.join(this.getJsonTemplatesDirectory(), `${templateId}.json`);
    return this.fileSystemService.fileExists(jsonPath);
  }
// getLegacyTemplatePath method removed
}
// Remove extra closing bracket
