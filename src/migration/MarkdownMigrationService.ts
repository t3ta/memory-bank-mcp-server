/**
 * Markdown Migration Service
 * 
 * Service for migrating Markdown-based templates to JSON-based templates.
 * Provides tools for parsing, conversion, and validation during the migration period.
 */
import fs from 'fs/promises';
import path from 'path';
import { Language, LanguageCode } from '../domain/i18n/Language.js';
import { Template } from '../domain/templates/Template.js';
import { Section, LanguageTextMap } from '../domain/templates/Section.js';
import { ITemplateRepository } from '../domain/templates/ITemplateRepository.js';

/**
 * Service for migrating Markdown templates to JSON templates
 */
export class MarkdownMigrationService {
  private templateRepository: ITemplateRepository;
  private markdownDir: string;
  private backupDir: string;

  /**
   * Constructor
   * 
   * @param templateRepository Template repository for storing migrated templates
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
  }

  /**
   * Migrates all Markdown templates in the directory
   * 
   * @returns Promise resolving to array of migrated template IDs
   */
  async migrateAllTemplates(): Promise<string[]> {
    // Ensure backup directory exists
    await fs.mkdir(this.backupDir, { recursive: true });
    
    // Get all Markdown files
    const files = await fs.readdir(this.markdownDir);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    
    // Migrate each file
    const migratedIds: string[] = [];
    
    for (const file of markdownFiles) {
      try {
        const templateId = path.basename(file, '.md');
        
        // Skip if template already exists in repository
        const exists = await this.templateRepository.templateExists(templateId);
        if (exists) {
          console.log(`Template ${templateId} already exists, skipping migration`);
          continue;
        }
        
        const migratedId = await this.migrateTemplate(templateId);
        migratedIds.push(migratedId);
      } catch (error) {
        console.error(`Failed to migrate ${file}:`, error);
      }
    }
    
    return migratedIds;
  }

  /**
   * Migrates a single Markdown template
   * 
   * @param templateId Template ID (filename without extension)
   * @returns Promise resolving to migrated template ID
   */
  async migrateTemplate(templateId: string): Promise<string> {
    const filePath = path.join(this.markdownDir, `${templateId}.md`);
    
    // Read Markdown content
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Parse Markdown
    const { title, sections } = this.parseMarkdown(content);
    
    // Create template
    const template = new Template(
      templateId,
      'migrated',
      { en: title }, // Default to English for now
      sections
    );
    
    // Save template
    await this.templateRepository.saveTemplate(template);
    
    // Backup the original file
    const backupPath = path.join(this.backupDir, `${templateId}.md`);
    await fs.copyFile(filePath, backupPath);
    
    return templateId;
  }

  /**
   * Parses Markdown content into title and sections
   * 
   * @param markdown Markdown content
   * @returns Object with title and sections
   */
  private parseMarkdown(markdown: string): { title: string, sections: Section[] } {
    const lines = markdown.split('\n');
    
    // Extract title (first h1)
    let title = 'Migrated Template';
    let currentSectionId = '';
    let currentSectionTitle = '';
    let currentSectionContent = '';
    const sections: Section[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Main title (h1)
      if (line.startsWith('# ') && !title) {
        title = line.substring(2).trim();
        continue;
      }
      
      // Section title (h2)
      if (line.startsWith('## ')) {
        // If we were collecting content for a previous section, save it
        if (currentSectionId) {
          sections.push(
            new Section(
              currentSectionId,
              { en: currentSectionTitle },
              { en: currentSectionContent.trim() }
            )
          );
        }
        
        // Start new section
        currentSectionTitle = line.substring(3).trim();
        currentSectionId = this.sanitizeId(currentSectionTitle);
        currentSectionContent = '';
        continue;
      }
      
      // Add to current section content
      if (currentSectionId) {
        currentSectionContent += line + '\n';
      }
    }
    
    // Add the last section if there is one
    if (currentSectionId) {
      sections.push(
        new Section(
          currentSectionId,
          { en: currentSectionTitle },
          { en: currentSectionContent.trim() }
        )
      );
    }
    
    return { title, sections };
  }

  /**
   * Sanitizes a string for use as an ID
   * 
   * @param text Text to sanitize
   * @returns Sanitized ID
   */
  private sanitizeId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Gets the content of a Markdown template
   * 
   * @param templateId Template ID
   * @returns Promise resolving to Markdown content or null if not found
   */
  async getMarkdownTemplate(templateId: string): Promise<string | null> {
    try {
      const filePath = path.join(this.markdownDir, `${templateId}.md`);
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      return null;
    }
  }

  /**
   * Converts a JSON template to Markdown
   * 
   * @param template Template to convert
   * @param language Language to use for conversion
   * @returns Markdown representation of the template
   */
  convertTemplateToMarkdown(template: Template, language: Language): string {
    let markdown = `# ${template.getName(language)}\n\n`;
    
    for (const section of template.sections) {
      const title = section.getTitle(language);
      const content = section.getContent(language);
      
      if (title) {
        markdown += `## ${title}\n\n`;
      }
      
      if (content) {
        markdown += `${content}\n\n`;
      }
    }
    
    return markdown;
  }

  /**
   * Creates a Markdown template from a JSON template
   * 
   * @param templateId Template ID
   * @param language Language to use
   * @param outputPath Directory to write the Markdown file to
   * @returns Promise resolving to the path of the created file
   */
  async createMarkdownFile(
    templateId: string,
    language: Language,
    outputPath: string
  ): Promise<string> {
    // Get template
    const template = await this.templateRepository.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Convert to Markdown
    const markdown = this.convertTemplateToMarkdown(template, language);
    
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });
    
    // Write to file
    const filePath = path.join(outputPath, `${templateId}.md`);
    await fs.writeFile(filePath, markdown, 'utf-8');
    
    return filePath;
  }
}
