/**
 * JSON Template Loader
 * Loads and processes JSON templates with internationalization support
 */
import path from 'path';
import { JsonTemplate, validateJsonTemplate } from '../../schemas/v2/template-schema.js';
import { Language } from '../../schemas/v2/i18n-schema.js';
import { IFileSystemService } from '../storage/interfaces/IFileSystemService.js';
import { II18nProvider } from '../i18n/interfaces/II18nProvider.js';
import { TemplateRenderer } from './TemplateRenderer.js';
import { ITemplateLoader } from './interfaces/ITemplateLoader.js';

/**
 * Implementation of ITemplateLoader for JSON templates
 */
export class JsonTemplateLoader implements ITemplateLoader {
  private readonly templateRenderer: TemplateRenderer;
  
  // Legacy template file naming patterns
  private readonly LEGACY_PATTERNS = {
    ja: '{{name}}.md',
    en: '{{name}}-en.md',
    zh: '{{name}}-zh.md',
  };
  
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
  
  /**
   * Gets the legacy templates directory path
   */
  private getLegacyTemplatesDirectory(): string {
    return path.join(process.cwd(), 'src/templates/markdown');
  }
  
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
      throw new Error(`Failed to load JSON template ${templateId}: ${(error as Error).message}`);
    }
  }
  
  /**
   * Implements ITemplateLoader.getMarkdownTemplate
   */
  async getMarkdownTemplate(templateId: string, language: Language, variables?: Record<string, string>): Promise<string> {
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
      // If JSON template not found or invalid, try falling back to legacy template
      if ((error as Error).message.includes('Template not found') || (error as Error).message.includes('Invalid JSON')) {
        console.warn(`JSON template ${templateId} not found or invalid, falling back to legacy template...`);
        
        try {
          // Determine legacy file path based on naming convention
          const legacyPath = this.getLegacyTemplatePath(templateId, language);
          return this.loadLegacyTemplate(legacyPath, language);
        } catch (legacyError) {
          throw new Error(`Failed to load template ${templateId}: ${(error as Error).message}. Legacy fallback also failed: ${(legacyError as Error).message}`);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Implements ITemplateLoader.loadLegacyTemplate
   */
  async loadLegacyTemplate(templatePath: string, language: Language): Promise<string> {
    try {
      if (!templatePath.includes('.')) {
        templatePath = this.getLegacyTemplatePath(templatePath, language);
      }
      
      // Check if file exists and read it
      const exists = await this.fileSystemService.fileExists(templatePath);
      if (!exists) {
        throw new Error(`Legacy template file not found: ${templatePath}`);
      }
      
      return this.fileSystemService.readFile(templatePath);
    } catch (error) {
      throw new Error(`Failed to load legacy template from path ${templatePath}: ${(error as Error).message}`);
    }
  }
  
  /**
   * Implements ITemplateLoader.templateExists
   */
  async templateExists(templateId: string): Promise<boolean> {
    const jsonPath = path.join(this.getJsonTemplatesDirectory(), `${templateId}.json`);
    return this.fileSystemService.fileExists(jsonPath);
  }
  
  /**
   * Gets the legacy template file path based on template name and language
   * 
   * @param templateName Template name without extension
   * @param language Target language
   * @returns Full path to the legacy template file
   */
  private getLegacyTemplatePath(templateName: string, language: Language): string {
    // Get the pattern for this language
    const pattern = this.LEGACY_PATTERNS[language] || this.LEGACY_PATTERNS.en;
    
    // Replace {{name}} with the template name
    const fileName = pattern.replace('{{name}}', templateName);
    
    return path.join(this.getLegacyTemplatesDirectory(), fileName);
  }
}
