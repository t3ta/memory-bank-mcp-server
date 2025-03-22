/**
 * Template Service
 * 
 * Application service for managing templates.
 * Provides functionalities for template creation, retrieval, and rendering.
 */
import { Language, LanguageCode } from '../../domain/i18n/Language.js';
import { ITemplateRepository } from '../../domain/templates/ITemplateRepository.js';
import { Template } from '../../domain/templates/Template.js';
import { Section } from '../../domain/templates/Section.js';
import { II18nRepository } from '../../domain/i18n/II18nRepository.js';

/**
 * Service for managing templates
 */
export class TemplateService {
  private repository: ITemplateRepository;
  private i18nRepository: II18nRepository;

  /**
   * Constructor
   * 
   * @param repository Repository for accessing templates
   * @param i18nRepository Repository for accessing translations
   */
  constructor(repository: ITemplateRepository, i18nRepository: II18nRepository) {
    this.repository = repository;
    this.i18nRepository = i18nRepository;
  }

  /**
   * Gets a template by ID
   * 
   * @param id Template ID
   * @returns Promise resolving to Template or null if not found
   */
  async getTemplate(id: string): Promise<Template | null> {
    return this.repository.getTemplate(id);
  }

  /**
   * Gets all templates of a specific type
   * 
   * @param type Template type
   * @returns Promise resolving to array of Templates
   */
  async getTemplatesByType(type: string): Promise<Template[]> {
    return this.repository.getTemplatesByType(type);
  }

  /**
   * Renders a template as Markdown for a specific language
   * 
   * @param id Template ID
   * @param language Language to render for
   * @param variables Optional variables for template substitution
   * @returns Promise resolving to Markdown content
   * @throws Error if template not found
   */
  async renderTemplateAsMarkdown(
    id: string,
    language: Language,
    variables?: Record<string, string>
  ): Promise<string> {
    return this.repository.getTemplateAsMarkdown(id, language, variables);
  }

  /**
   * Creates a new template
   * 
   * @param id Template ID
   * @param type Template type
   * @param names Map of language codes to template names
   * @returns Promise resolving to created Template
   */
  async createTemplate(
    id: string,
    type: string,
    names: Partial<Record<LanguageCode, string>>
  ): Promise<Template> {
    // Check if template with this ID already exists
    const exists = await this.repository.templateExists(id);
    if (exists) {
      throw new Error(`Template with ID '${id}' already exists`);
    }

    // Create new template with no sections
    const template = new Template(id, type, names);
    
    // Save to repository
    const success = await this.repository.saveTemplate(template);
    if (!success) {
      throw new Error(`Failed to save template '${id}'`);
    }
    
    return template;
  }

  /**
   * Updates an existing template
   * 
   * @param template Template to update
   * @returns Promise resolving to boolean indicating success
   */
  async updateTemplate(template: Template): Promise<boolean> {
    // Check if template exists
    const exists = await this.repository.templateExists(template.id);
    if (!exists) {
      throw new Error(`Template with ID '${template.id}' does not exist`);
    }
    
    return this.repository.saveTemplate(template);
  }

  /**
   * Adds a section to a template
   * 
   * @param templateId Template ID
   * @param sectionId Section ID
   * @param titles Map of language codes to section titles
   * @param contents Optional map of language codes to section contents
   * @param isOptional Whether the section is optional
   * @returns Promise resolving to updated Template
   * @throws Error if template not found
   */
  async addSection(
    templateId: string,
    sectionId: string,
    titles: Partial<Record<LanguageCode, string>>,
    contents: Partial<Record<LanguageCode, string>> = {},
    isOptional: boolean = false
  ): Promise<Template> {
    // Get the template
    const template = await this.repository.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID '${templateId}' not found`);
    }
    
    // Create section
    const section = new Section(sectionId, titles, contents, isOptional);
    
    // Add section to template
    const updatedTemplate = template.withSection(section);
    
    // Save updated template
    const success = await this.repository.saveTemplate(updatedTemplate);
    if (!success) {
      throw new Error(`Failed to add section to template '${templateId}'`);
    }
    
    return updatedTemplate;
  }

  /**
   * Removes a section from a template
   * 
   * @param templateId Template ID
   * @param sectionId Section ID
   * @returns Promise resolving to updated Template
   * @throws Error if template not found
   */
  async removeSection(templateId: string, sectionId: string): Promise<Template> {
    // Get the template
    const template = await this.repository.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID '${templateId}' not found`);
    }
    
    // Check if section exists
    const section = template.getSection(sectionId);
    if (!section) {
      throw new Error(`Section with ID '${sectionId}' not found in template '${templateId}'`);
    }
    
    // Remove section from template
    const updatedTemplate = template.withoutSection(sectionId);
    
    // Save updated template
    const success = await this.repository.saveTemplate(updatedTemplate);
    if (!success) {
      throw new Error(`Failed to remove section from template '${templateId}'`);
    }
    
    return updatedTemplate;
  }

  /**
   * Updates a section in a template
   * 
   * @param templateId Template ID
   * @param section Updated section
   * @returns Promise resolving to updated Template
   * @throws Error if template or section not found
   */
  async updateSection(templateId: string, section: Section): Promise<Template> {
    // Get the template
    const template = await this.repository.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID '${templateId}' not found`);
    }
    
    // Check if section exists
    const existingSection = template.getSection(section.id);
    if (!existingSection) {
      throw new Error(`Section with ID '${section.id}' not found in template '${templateId}'`);
    }
    
    // Update section in template
    const updatedTemplate = template.withSection(section);
    
    // Save updated template
    const success = await this.repository.saveTemplate(updatedTemplate);
    if (!success) {
      throw new Error(`Failed to update section in template '${templateId}'`);
    }
    
    return updatedTemplate;
  }

  /**
   * Gets IDs of all available templates
   * 
   * @returns Promise resolving to array of template IDs
   */
  async getAllTemplateIds(): Promise<string[]> {
    return this.repository.getAllTemplateIds();
  }

  /**
   * Gets all available template types
   * 
   * @returns Promise resolving to array of template types
   */
  async getAllTemplateTypes(): Promise<string[]> {
    return this.repository.getAllTemplateTypes();
  }

  /**
   * Resolves a translation key using the I18n repository
   * 
   * @param key Translation key
   * @param language Language to get translation for
   * @returns Promise resolving to translated text or null if not found
   */
  private async resolveTranslation(
    key: string,
    language: Language
  ): Promise<string | null> {
    const translation = await this.i18nRepository.getTranslation(key, language);
    return translation ? translation.text : null;
  }
}
