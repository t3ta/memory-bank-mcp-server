/**
 * Template Renderer
 * Converts JSON templates to markdown format
 */
import { Language } from '@memory-bank/schemas'; // Removed unused JsonTemplate alias
import type { JsonDocumentV2 } from '@memory-bank/schemas'; // Import the type directly
// import { II18nProvider } from '../i18n/interfaces/II18nProvider.js'; // Removed unused import

/**
 * Template Renderer class
 * Responsible for rendering JSON templates to Markdown
 */
export class TemplateRenderer {
  /**
   * Constructor
   * Constructor
   */
  constructor(/* private readonly i18nProvider: II18nProvider */) {} // Removed unused i18nProvider

  /**
   * Renders a base template to Markdown format
   *
   * @param template The template to render
   * @param language The target language
   * @param variables Optional variables for substitution
   * @returns Markdown formatted string
   */
  renderToMarkdown(
    template: JsonDocumentV2, // Use JsonDocumentV2 type
    language: Language,
    variables?: Record<string, string>
  ): string {
    // Always render as JSON template now
    return this.renderJsonTemplateToMarkdown(template, language, variables);
    // Removed the else block for BaseTemplate
  }

  // Removed renderBaseTemplateToMarkdown method

  /**
   * Renders a JSON template to Markdown format
   *
   * @param template The JSON template to render
   * @param language The target language
   * @param variables Optional variables for substitution
   * @returns Markdown formatted string
   */
  private renderJsonTemplateToMarkdown(
    template: JsonDocumentV2, // Use JsonDocumentV2 type
    language: Language,
    variables?: Record<string, string>
  ): string {
    const lines: string[] = [];

    // Add title
    const title =
      template.metadata.name[language] ||
      template.metadata.name['en'] ||
      Object.values(template.metadata.name)[0];
    lines.push(`# ${title}\n`);

    // Add sections
    // Define section type inline for clarity
    type JsonSection = { title: Record<string, string>; content?: Record<string, string>; optional?: boolean; };
    for (const section of Object.values(template.content.sections)) { // Use Object.values, remove sectionId
      const typedSection = section as JsonSection; // Type assertion
      const sectionContent = this.renderJsonSection(
        typedSection,
        language,
        variables
        // Removed placeholders argument
      );

      // Skip empty optional sections
      if (typedSection.optional && sectionContent.trim() === '') { // Use typedSection here
        continue;
      }

      lines.push(sectionContent);
    }

    return lines.join('\n');
  }

  // Removed renderSection method as it used the old TemplateSection type

  /**
   * Renders a JSON template section
   *
   * @param section The section to render
   * @param language The target language
   * @param variables Optional variables for substitution
   * @param placeholders Optional placeholders mapping
   * @returns Markdown formatted string for the section
   */
  private renderJsonSection(
    section: {
      title: Record<string, string>;
      content?: Record<string, string>;
      optional?: boolean;
    },
    language: Language,
    variables?: Record<string, string>
    // placeholders?: Record<string, string> // Removed unused parameter
  ): string {
    const lines: string[] = [];

    // Get title for this language, fall back to English or first available language
    const title = section.title[language] || section.title['en'] || Object.values(section.title)[0];

    // Only add title if it's not empty
    if (title && title.trim()) {
      lines.push(`## ${title}\n`);
    }

    // Add section content if available for this language
    if (section.content) {
      const content =
        section.content[language] || section.content['en'] || Object.values(section.content)[0];
      if (content) {
        let processedContent = content;

        // Replace variables
        if (variables) {
          processedContent = this.replaceVariables(processedContent, variables);
        }

        lines.push(processedContent);
      }
    }

    return lines.join('\n');
  }

  /**
   * Replace variables in a text
   *
   * @param text The text containing variables
   * @param variables The variables mapping
   * @returns Text with variables replaced
   */
  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{([A-Z_]+)\}\}/g, (match, name) => {
      return variables[name] || match;
    });
  }

  // Removed unused getPlaceholderComment method
}
