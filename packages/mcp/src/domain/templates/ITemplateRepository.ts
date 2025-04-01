/**
 * Template Repository Interface
 * 
 * Defines the contract for accessing and managing templates.
 * Part of the domain layer, with implementations in the infrastructure layer.
 */
import { Language } from '../i18n/Language.js';
import { Template } from './Template.js';

/**
 * Interface for accessing and managing templates
 */
export interface ITemplateRepository {
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
   * @param language Language to get template for
   * @param variables Optional variables for template substitution
   * @returns Promise resolving to Markdown content
   * @throws Error if template not found
   */
  getTemplateAsMarkdown(
    id: string,
    language: Language,
    variables?: Record<string, string>
  ): Promise<string>;
  
  /**
   * Gets all templates of a specific type
   * 
   * @param type Template type
   * @returns Promise resolving to array of Templates
   */
  getTemplatesByType(type: string): Promise<Template[]>;
  
  /**
   * Saves a template (creates or updates)
   * 
   * @param template Template to save
   * @returns Promise resolving to boolean indicating success
   */
  saveTemplate(template: Template): Promise<boolean>;
  
  /**
   * Checks if a template exists
   * 
   * @param id Template ID
   * @returns Promise resolving to boolean indicating if template exists
   */
  templateExists(id: string): Promise<boolean>;
  
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
