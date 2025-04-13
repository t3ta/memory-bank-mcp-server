/**
 * Template Loader Interface
 * Defines the contract for loading and processing templates
 */
import { Language, Template } from '@memory-bank/schemas/templates';

// 型エイリアスの更新
type JsonTemplate = Template;

/**
 * Interface for template loading and rendering functionality
 */
export interface ITemplateLoader {
  /**
   * Loads a JSON template by ID
   *
   * @param templateId The ID of the template to load
   * @returns Promise resolving to a JsonTemplate object
   * @throws Error if template not found or invalid
   */
  loadJsonTemplate(templateId: string): Promise<JsonTemplate>;

  /**
   * Gets a template in Markdown format for the specified language
   *
   * @param templateId The ID of the template
   * @param language The language code
   * @param variables Optional variables for template substitution
   * @returns Promise resolving to Markdown content
   * @throws Error if template not found or language not supported
   */
  getMarkdownTemplate(
    templateId: string,
    language: Language,
    variables?: Record<string, string>
  ): Promise<string>;

  /**
   * Checks if a template with the given ID exists
   *
   * @param templateId The ID of the template to check
   * @returns Promise resolving to true if exists, false otherwise
   */
  templateExists(templateId: string): Promise<boolean>;
}
