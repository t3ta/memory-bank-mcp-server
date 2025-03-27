import { Language, LanguageCode } from "../../domain/i18n/Language.js";
import { Template } from "../../domain/templates/Template.js";
import { LanguageTextMap } from "../../domain/templates/types.js";
import { TemplateService } from "../../application/templates/TemplateService.js";
import { ITemplateController } from "./interfaces/ITemplateController.js";

/**
 * Controller for template operations
 */
export class TemplateController implements ITemplateController {
  readonly _type = "controller" as const;
  
  /**
   * Constructor
   * 
   * @param templateService Template service instance
   */
  constructor(private readonly templateService: TemplateService) {}

  /**
   * Gets a template by ID
   * 
   * @param id Template ID
   * @returns Promise resolving to Template or null if not found
   */
  async getTemplate(id: string): Promise<Template | null> {
    return this.templateService.getTemplate(id);
  }

  /**
   * Gets a template by ID in Markdown format
   * 
   * @param id Template ID
   * @param languageCode Language code to get template for
   * @param variables Optional variables for template substitution
   * @returns Promise resolving to Markdown content
   * @throws Error if template not found
   */
  async getTemplateAsMarkdown(
    id: string,
    languageCode: LanguageCode,
    variables?: Record<string, string>
  ): Promise<string> {
    const language = new Language(languageCode);
    return this.templateService.getTemplateAsMarkdown(id, language, variables);
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
  async createTemplate(
    id: string,
    type: string,
    namesMap: LanguageTextMap
  ): Promise<Template> {
    return this.templateService.createTemplate(id, type, namesMap);
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
  async updateTemplate(
    id: string,
    type: string,
    namesMap: LanguageTextMap
  ): Promise<Template> {
    return this.templateService.updateTemplate(id, type, namesMap);
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
    sectionId: string,
    titlesMap: LanguageTextMap,
    contentsMap: LanguageTextMap = {},
    isOptional: boolean = false
  ): Promise<Template> {
    return this.templateService.addOrUpdateSection(
      templateId,
      sectionId,
      titlesMap,
      contentsMap,
      isOptional
    );
  }

  /**
   * Removes a section from a template
   * 
   * @param templateId Template ID
   * @param sectionId Section ID
   * @returns Promise resolving to the updated template
   * @throws Error if template not found
   */
  async removeSection(
    templateId: string,
    sectionId: string
  ): Promise<Template> {
    return this.templateService.removeSection(templateId, sectionId);
  }

  /**
   * Gets all templates of a specific type
   * 
   * @param type Template type
   * @returns Promise resolving to array of Templates
   */
  async getTemplatesByType(type: string): Promise<Template[]> {
    return this.templateService.getTemplatesByType(type);
  }

  /**
   * Gets IDs of all available templates
   * 
   * @returns Promise resolving to array of template IDs
   */
  async getAllTemplateIds(): Promise<string[]> {
    return this.templateService.getAllTemplateIds();
  }

  /**
   * Gets all available template types
   * 
   * @returns Promise resolving to array of template types
   */
  async getAllTemplateTypes(): Promise<string[]> {
    return this.templateService.getAllTemplateTypes();
  }
}
