/**
 * Markdown Migration Service
 *
 * Service for migrating Markdown templates to JSON templates.
 * Handles conversion, backup, and error handling.
 * Provides detailed reporting of migration results.
 */
import fs from 'fs/promises';
import path from 'path';
import { Language, LanguageCode } from '../domain/i18n/Language.js';

interface ITemplateRepository {
  getTemplate(id: string): Promise<Template | null>;
  getTemplateAsMarkdown(id: string, language: Language): Promise<string>;
  getTemplatesByType(type: string): Promise<Template[]>;
  saveTemplate(template: Template): Promise<boolean>;
  templateExists(id: string): Promise<boolean>;
  getAllTemplateIds(): Promise<string[]>;
  getAllTemplateTypes(): Promise<string[]>;
}

class Template {
  constructor(
    public id: string,
    public type: string
  ) {}
}

class Section {
  constructor(
    public id: string,
    public titles: Partial<Record<LanguageCode, string>>,
    public contents: Partial<Record<LanguageCode, string>>,
    public hidden: boolean
  ) {}
}
import { MigrationReport } from './MigrationReport.js';
import { logger } from '../shared/utils/logger.js';

/**
 * Options for migration
 */
export interface MigrationOptions {
  /**
   * Force migration even if template exists
   */
  force?: boolean;

  /**
   * Default language for templates
   */
  defaultLanguage?: LanguageCode;
}

/**
 * Default migration options
 */
const DEFAULT_OPTIONS: MigrationOptions = {
  force: false,
  defaultLanguage: 'en',
};

/**
 * Service for migrating Markdown templates to JSON templates
 */
export class MarkdownMigrationService {
  private templateRepository: ITemplateRepository;
  private markdownDir: string;
  private backupDir: string;
  private report: MigrationReport;

  /**
   * Constructor
   *
   * @param templateRepository Repository for saving templates
   * @param markdownDir Directory containing Markdown templates
   * @param backupDir Directory for backing up original Markdown files
   */
  constructor(
    templateRepository: ITemplateRepository,
    markdownDir: string,
    backupDir: string
  ) {
    this.templateRepository = templateRepository;
    this.markdownDir = markdownDir;
    this.backupDir = backupDir;
    this.report = new MigrationReport();
  }

  /**
   * Migrate all templates from Markdown to JSON
   *
   * @param options Migration options
   * @returns Promise resolving to migration report
   */
  async migrateAllTemplates(options: MigrationOptions = {}): Promise<MigrationReport> {
    try {
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

      await fs.mkdir(this.backupDir, { recursive: true });

      const files = await this.getMarkdownFiles();
      logger.info('Found Markdown files', { count: files.length });

      const migratedIds: string[] = [];

      for (const file of files) {
        try {
          const templateId = await this.migrateTemplate(file, mergedOptions);
          if (templateId) {
            migratedIds.push(templateId);
          }
        } catch (error) {
          const templateId = path.basename(file, '.md');
          this.report.addFailure(
            templateId,
            file,
            error instanceof Error ? error : String(error)
          );
          logger.error('Failed to migrate template', { file, error: error instanceof Error ? error.message : String(error) });
        }
      }

      this.report.complete();
      this.report.printSummary();

      return this.report;
    } catch (error) {
      logger.error('Failed to migrate templates', { error: error instanceof Error ? error.message : String(error) });
      this.report.complete();
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates a Markdown file from a JSON template
   *
   * @param templateId Template ID
   * @param language Language to generate Markdown for
   * @param outputDir Output directory for generated Markdown
   * @returns Promise resolving to path of generated file
   */
  async createMarkdownFile(
    templateId: string,
    language: Language,
    outputDir: string
  ): Promise<string> {
    try {
      await fs.mkdir(outputDir, { recursive: true });

      const template = await this.templateRepository.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const markdown = await this.templateRepository.getTemplateAsMarkdown(
        templateId,
        language
      );

      const filePath = path.join(outputDir, `${templateId}.md`);
      await fs.writeFile(filePath, markdown, 'utf-8');

      return filePath;
    } catch (error) {
      throw new Error(`Failed to create Markdown file for template ${templateId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets the migration report
   *
   * @returns Migration report
   */
  getReport(): MigrationReport {
    return this.report;
  }

  /**
   * Gets all Markdown files in the source directory
   *
   * @returns Promise resolving to array of file paths
   * @private
   */
  private async getMarkdownFiles(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.markdownDir, { withFileTypes: true });

      const files = entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
        .map(entry => path.join(this.markdownDir, entry.name));

      return files;
    } catch (error) {
      throw new Error(`Failed to get Markdown files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Migrates a single template from Markdown to JSON
   *
   * @param filePath Path to Markdown file
   * @param options Migration options
   * @returns Promise resolving to template ID or null if not migrated
   */
  async migrateTemplate(
    filePath: string,
    options: MigrationOptions
  ): Promise<string | null> {
    try {
      const templateId = path.basename(filePath, '.md');

      const exists = await this.templateRepository.templateExists(templateId);
      if (exists && !options.force) {
        logger.debug('Template already exists, skipping', { templateId });
        this.report.addSkipped(templateId, filePath, 'Template already exists');
        return null;
      }

      const markdown = await fs.readFile(filePath, 'utf-8');

      const backupPath = path.join(this.backupDir, path.basename(filePath));
      await fs.writeFile(backupPath, markdown, 'utf-8');

      const template = await this.parseMarkdownToTemplate(
        markdown,
        templateId,
        options.defaultLanguage || 'en'
      );

      const success = await this.templateRepository.saveTemplate(template);

      if (!success) {
        const error = new Error(`Failed to save template: ${templateId}`);
        this.report.addFailure(templateId, filePath, error);
        throw error;
      }

      logger.info('Migrated template', { templateId });

      const destinationPath = path.join(
        this.templateRepository instanceof Object && 'basePath' in this.templateRepository
          ? (this.templateRepository as any).basePath
          : 'unknown',
        `${templateId}.json`
      );

      this.report.addSuccess(templateId, filePath, destinationPath);
      return templateId;
    } catch (error) {
      const templateId = path.basename(filePath, '.md');
      this.report.addFailure(templateId, filePath, error instanceof Error ? error : String(error));
      throw new Error(`Failed to migrate template ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parses Markdown content to a Template object
   *
   * @param markdown Markdown content
   * @param templateId Template ID
   * @param defaultLanguage Default language code
   * @returns Promise resolving to Template object
   * @private
   */
  private async parseMarkdownToTemplate(
    markdown: string,
    templateId: string,
    defaultLanguage: LanguageCode = 'en'
  ): Promise<Template> {
    try {
      const lines = markdown.split('\n');

      const templateType = 'document';

      const sections: Section[] = [];
      let currentSection: {
        id: string;
        title: string;
        content: string[];
      } | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('## ')) {
          if (currentSection) {
            sections.push(this.createSection(currentSection, defaultLanguage));
          }

          const sectionTitle = line.substring(3).trim();
          const sectionId = this.createSectionId(sectionTitle);

          currentSection = {
            id: sectionId,
            title: sectionTitle,
            content: []
          };
        }
        else if (currentSection) {
          currentSection.content.push(line);
        }
      }

      if (currentSection) {
        sections.push(this.createSection(currentSection, defaultLanguage));
      }

      return new Template(templateId, templateType);
    } catch (error) {
      throw new Error(`Failed to parse Markdown: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates a Section object from parsed data
   *
   * @param sectionData Parsed section data
   * @param defaultLanguage Default language code
   * @returns Section object
   * @private
   */
  private createSection(
    sectionData: { id: string; title: string; content: string[] },
    defaultLanguage: LanguageCode = 'en'
  ): Section {
    const titleMap: Partial<Record<LanguageCode, string>> = {
      [defaultLanguage]: sectionData.title
    };

    const contentMap: Partial<Record<LanguageCode, string>> = {
      [defaultLanguage]: sectionData.content.join('\n')
    };

    return new Section(sectionData.id, titleMap, contentMap, false);
  }

  /**
   * Creates a section ID from a title
   *
   * @param title Section title
   * @returns Section ID
   * @private
   */
  private createSectionId(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
      .replace(/\s/g, '')
      .replace(/[^a-z0-9]/gi, '');
  }
}
