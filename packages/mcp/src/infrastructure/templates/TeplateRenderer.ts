/**
 * Template Renderer
 * Converts JSON templates to markdown format
 */
// Use 'any' for now due to persistent import issues
type BaseTemplate = any;
type TemplateSection = any;
type JsonTemplate = any;
type Language = any;
import { II18nProvider } from '../i18n/interfaces/II18nProvider.js';

/**
 * Template Renderer class
 * Responsible for rendering JSON templates to Markdown
 */
export class TemplateRenderer {
  /**
   * Constructor
   *
   * @param i18nProvider Provider for internationalization services
   */
  constructor(private readonly i18nProvider: II18nProvider) { }

  /**
   * Renders a base template to Markdown format
   *
   * @param template The template to render
   * @param language The target language
   * @param variables Optional variables for substitution
   * @returns Markdown formatted string
   */
  renderToMarkdown(
    template: BaseTemplate | JsonTemplate,
    language: Language,
    variables?: Record<string, string>
  ): string {
    // Check for metadata property to identify JSON template structure
    if ('metadata' in template && 'content' in template) {
      // It's a JSON template
      return this.renderJsonTemplateToMarkdown(template as JsonTemplate, language, variables);
    } else {
      // It's a base template (array-based)
      return this.renderBaseTemplateToMarkdown(template as BaseTemplate, language, variables);
    }
  }

  /**
   * Renders a base template to Markdown format
   *
   * @param template The base template to render
   * @param language The target language
   * @param variables Optional variables for substitution
   * @returns Markdown formatted string
   */
  private renderBaseTemplateToMarkdown(
    template: BaseTemplate,
    language: Language,
    variables?: Record<string, string>
  ): string {
    const lines: string[] = [];

    // Add title
    // Assuming translate takes only the key
    const title = this.i18nProvider.translate(template.titleKey);
    lines.push(`# ${title}\n`);

    // Add sections
    for (const section of template.sections) {
      const sectionContent = this.renderSection(section, language, variables);

      // Skip empty optional sections
      if (section.isOptional && sectionContent.trim() === '') {
        continue;
      }

      lines.push(sectionContent);
    }

    return lines.join('\n');
  }

  /**
   * Renders a JSON template to Markdown format
   *
   * @param template The JSON template to render
   * @param language The target language
   * @param variables Optional variables for substitution
   * @returns Markdown formatted string
   */
  private renderJsonTemplateToMarkdown(
    template: JsonTemplate,
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
    // Loop through section values, sectionId is not needed
    for (const section of Object.values(template.content.sections)) {
      // Use type assertion for section (assuming structure is known)
      const sectionTyped = section as {
        title: Record<string, string>;
        content?: Record<string, string>;
        optional?: boolean;
      };
      const sectionContent = this.renderJsonSection(
        sectionTyped,
        language,
        variables,
      );

      // Skip empty optional sections
      // Use the typed variable
      // Ensure sectionTyped is properly typed before accessing optional
      if (sectionTyped && sectionTyped.optional && sectionContent.trim() === '') {
        continue;
      }

      lines.push(sectionContent);
    }

    return lines.join('\n');
  }

  /**
   * Renders a template section
   *
   * @param section The section to render
   * @param language The target language
   * @param variables Optional variables for substitution
   * @returns Markdown formatted string for the section
   */
  private renderSection(
    section: TemplateSection,
    language: Language,
    variables?: Record<string, string>
  ): string {
    const lines: string[] = [];

    // Translate content first to check if it's effectively empty after translation/variable replacement
    let content = section.contentKey ? this.i18nProvider.translate(section.contentKey) : '';
    if (variables && content) {
      content = this.replaceVariables(content, variables);
    }

    // If the section is optional and content is empty, return empty string immediately
    if (section.isOptional && content.trim() === '') {
        // Also check if placeholder exists, if so, don't return empty
        if (!section.placeholder) {
             return '';
        }
    }


    // Add section title if content is not empty OR if there's a placeholder
    const title = this.i18nProvider.translate(section.titleKey);
    if (title.trim() && (content.trim() !== '' || section.placeholder)) {
      lines.push(`## ${title}\n`);
    }

    // Add section content if available
    if (section.contentKey) {
      // Translate first, then replace variables
      // Push the processed content if it's not empty
      if (content.trim() !== '') {
          lines.push(content);
      }
    }

    // Add placeholder if available
    if (section.placeholder) {
      // If section already has content, add a newline
      if (section.contentKey && lines.length > 1) {
        lines.push('');
      }

      // Add placeholder comment and placeholder itself
      const placeholderComment = this.getPlaceholderComment(section.placeholder, language);
      if (placeholderComment) {
        lines.push(placeholderComment);
      }

      lines.push(section.placeholder);
    }

    return lines.join('\n');
  }

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
  ): string {
    const lines: string[] = [];

    // Get content first to check if it's effectively empty
    let content = '';
    if (section.content) {
      content = section.content[language] || section.content['en'] || Object.values(section.content)[0] || '';
    }
    let processedContent = content;
    if (variables && processedContent) {
      processedContent = this.replaceVariables(processedContent, variables);
    }

    // If the section is optional and content is empty, return empty string
    if (section.optional && processedContent.trim() === '') {
      return '';
    }

    // Get title for this language, fall back to English or first available language
    const title = section.title[language] || section.title['en'] || Object.values(section.title)[0];

    // Only add title if it's not empty AND content is not empty
    if (title && title.trim() && processedContent.trim() !== '') {
      lines.push(`## ${title}\n`);
    }

    // Add section content if available for this language
    // Add processed content if it's not empty
    if (processedContent.trim() !== '') {
        lines.push(processedContent);
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
    // Allow lowercase letters and numbers in variable names
    return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, name) => {
      return variables[name] || match;
    });
  }

  /**
   * Gets a localized comment for a placeholder
   *
   * @param placeholder The placeholder string
   * @param language The target language
   * @returns Markdown comment string
   */
  private getPlaceholderComment(placeholder: string, language: Language): string {
    // Remove brackets to get the clean placeholder name
    const placeholderName = placeholder.replace(/[{}]/g, '');

    // Try to get a translation key specific to this placeholder
    const specificKey = `template.placeholder.${placeholderName.toLowerCase()}`;
    // Translate a specific comment key using the correct object format
    const comment = this.i18nProvider.translate({ key: specificKey, language });

    // If we got back the key, it means there's no translation
    if (comment === specificKey) {
      // Use generic comments based on language
      if (language === 'ja') {
        return `<!-- メモリーバンクから自動生成されます -->`;
      } else if (language === 'zh') {
        return `<!-- 从记忆库自动生成 -->`;
      } else {
        return `<!-- Auto-generated from memory bank -->`;
      }
    }

    return `<!-- ${comment} -->`;
  }
}
