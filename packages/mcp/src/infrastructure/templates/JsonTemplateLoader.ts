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
    // Get from current file's location for more consistent results
    const currentFilePath = __dirname;
    // 上の階層に上がって src/templates/json を見つける
    const srcPath = path.resolve(currentFilePath, '../../../templates/json');
    
    logger.debug(`Using template path (from __dirname): ${srcPath}`);
    
    return srcPath;
  }

  // Legacy directory method removed

  /**
   * Implements ITemplateLoader.loadJsonTemplate
   */
  async loadJsonTemplate(templateId: string): Promise<JsonTemplate> {
    // Get template path from src directory only
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
      logger.error(`Failed to load template '${templateId}': ${error.message}`);
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
    // Only check in src directory
    const templatePath = path.join(this.getJsonTemplatesDirectory(), `${templateId}.json`);
    
    try {
      return await this.fileSystemService.fileExists(templatePath);
    } catch (error) {
      logger.debug(`Error checking if template exists: ${error.message}`);
      return false;
    }
  }
// getLegacyTemplatePath method removed
}
// Remove extra closing bracket
