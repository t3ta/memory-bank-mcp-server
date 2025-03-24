/**
 * Template Controller Interface
 * 
 * Defines the contract for the template controller.
 */
import { Language, LanguageCode } from '../../../domain/i18n/Language.js';
import { Template } from '../../../domain/templates/Template.js';
import { LanguageTextMap } from '../../../domain/templates/Section.js';

/**
 * Interface for template controller
 */
export interface ITemplateController {
  /**
   * Gets a template by ID
   * 
   * @param id Template ID
   * @returns Promise resolving to Template or null if not found
   */
  getTemplate(id: string): Promise<Template | null>;
  
  /**
   * Gets a template by ID in Markdown format
   * 
   * @param id Template ID
   * @param languageCode Language code to get template for
   * @param variables Optional variables for template substitution
   * @returns Promise resolving to Markdown content
   * @throws Error if template not found
   */
  getTemplateAsMarkdown(
    id: string,
    languageCode: LanguageCode,
    variables?: Record<string, string>
  ): Promise<string>;
  
  /**
   * Creates a new template
   * 
   * @param id Template ID
   * @param type Template type
   * @param namesMap Map of language codes to template names
   * @returns Promise resolving to the created template
   * @throws Error if template ID already exists
   */
  createTemplate(
    id: string,
    type: string,
    namesMap: LanguageTextMap
  ): Promise<Template>;
  
  /**
   * Updates a template's basic properties
   * 
   * @param id Template ID
   * @param type New template type
   * @param namesMap New map of language codes to template names
   * @returns Promise resolving to the updated template
   * @throws Error if template not found
   */
  updateTemplate(
    id: string,
    type: string,
    namesMap: LanguageTextMap
  ): Promise<Template>;
  
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
  addOrUpdateSection(
    templateId: string,
    sectionId: string,
    titlesMap: LanguageTextMap,
    contentsMap?: LanguageTextMap,
    isOptional?: boolean
  ): Promise<Template>;
  
  /**
   * Removes a section from a template
   * 
   * @param templateId Template ID
   * @param sectionId Section ID
   * @returns Promise resolving to the updated template
   * @throws Error if template not found
   */
  removeSection(
    templateId: string,
    sectionId: string
  ): Promise<Template>;
  
  /**
   * Gets all templates of a specific type
   * 
   * @param type Template type
   * @returns Promise resolving to array of Templates
   */
  getTemplatesByType(type: string): Promise<Template[]>;
  
  /**
   * Gets IDs of all available templates
   * 
   * @returns Promise resolving to array of template IDs
   */
  getAllTemplateIds(): Promise<string[]>;
  
  /**
   * Gets all available template types
   * 
   * @returns Promise resolving to array of template types
   */
  getAllTemplateTypes(): Promise<string[]>;
}
