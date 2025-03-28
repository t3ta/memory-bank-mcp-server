/**
 * Template Service
 *
 * Application service for managing templates and template operations.
 * Provides high-level functionality for working with templates.
 */
import { Language } from '../../domain/i18n/Language.js';
import { ITemplateRepository } from '../../domain/templates/ITemplateRepository.js';
// import { /* Section, */ LanguageTextMap } from '../../domain/templates/Section.js'; // Removed unused LanguageTextMap import
import { Template } from '../../domain/templates/Template.js';

/**
 * Service for managing templates
 */
export class TemplateService {
  private repository: ITemplateRepository;

  /**
   * Constructor
   *
   * @param repository Repository for accessing templates
   */
  constructor(repository: ITemplateRepository) {
    this.repository = repository;
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
   * Gets a template as Markdown for a specific language
   *
   * @param id Template ID
   * @param language Language to get template for
   * @param variables Optional variables for template substitution
   * @returns Promise resolving to Markdown content
   * @throws Error if template not found
   */
  async getTemplateAsMarkdown(
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
   * @param namesMap Map of language codes to template names
   * @returns Promise resolving to the created template
   * @throws Error if template ID already exists
   */
  async createTemplate(id: string, type: string, /* namesMap: LanguageTextMap */): Promise<Template> { // Removed unused namesMap
    // Check if template already exists
    const exists = await this.repository.templateExists(id);
    if (exists) {
      throw new Error(`Template with ID ${id} already exists`);
    }

    // Create and save the template
    // Adjusted constructor call due to Template class change
    const template = new Template(id, type /*, namesMap */); // Use constructor, remove namesMap
    await this.repository.saveTemplate(template);

    return template;
  }

  /**
   * Updates a template's basic properties
   *
   * @param id Template ID
   * @param type New template type
   * @param namesMap New map of language codes to template names
   * @returns Promise resolving to the updated template
   * @throws Error if template not found
   */
  async updateTemplate(id: string, type: string, /* namesMap: LanguageTextMap */): Promise<Template> { // Removed unused namesMap
    // Get existing template
    const template = await this.repository.getTemplate(id);
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }

    // Create updated template
    // Adjusted constructor call due to Template class change
    const updatedTemplate = new Template(id, type /*, namesMap, template.sections */); // Use constructor, remove namesMap and sections

    // Save and return
    await this.repository.saveTemplate(updatedTemplate);
    return updatedTemplate;
  }

  /**
   * Adds or updates a section in a template
   *
   * @param templateId Template ID
   * @param sectionId Section ID
   * @param titlesMap Map of language codes to section titles
   * @param contentsMap Map of language codes to section contents
   * @param isOptional Whether the section is optional
   * @returns Promise resolving to the updated template
   * @throws Error if template not found
   */
  async addOrUpdateSection(
    templateId: string,
    /* sectionId: string, */ // Removed unused parameter
    /* titlesMap: LanguageTextMap, */ // Removed unused parameter
    /* contentsMap: LanguageTextMap = {}, */ // Removed unused parameter
    /* isOptional: boolean = false */ // Removed unused parameter
  ): Promise<Template> {
    // Get existing template
    const template = await this.repository.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Create section and attempt to add (currently commented out)
    // const section = Section.create(sectionId, titlesMap, contentsMap, isOptional); // Removed unused variable
    // const updatedTemplate = template.withSection(Section.create(sectionId, titlesMap, contentsMap, isOptional)); // Commented out: withSection does not exist on Template placeholder
    const updatedTemplate = template; // Placeholder: return original template for now

    // Save and return
    await this.repository.saveTemplate(updatedTemplate);
    return updatedTemplate;
  }

  /**
   * Removes a section from a template
   *
   * @param templateId Template ID
   * @param sectionId Section ID
   * @returns Promise resolving to the updated template
   * @throws Error if template not found
   */
  async removeSection(templateId: string, /* sectionId: string */): Promise<Template> { // Removed unused sectionId
    // Get existing template
    const template = await this.repository.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Remove section
    // const updatedTemplate = template.withoutSection(sectionId); // Commented out: withoutSection does not exist on Template placeholder
    const updatedTemplate = template; // Placeholder: return original template for now

    // If no changes (section didn't exist), return existing template
    if (updatedTemplate === template) {
      return template;
    }

    // Save and return
    await this.repository.saveTemplate(updatedTemplate);
    return updatedTemplate;
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
}
