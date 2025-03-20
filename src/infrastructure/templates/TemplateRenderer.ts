/**
 * Template Renderer
 * Converts JSON templates to markdown format
 */
import { BaseTemplate, TemplateSection, JsonTemplate } from '../../schemas/v2/template-schema';
import { Language } from '../../schemas/v2/i18n-schema';
import { II18nProvider } from '../i18n/interfaces/II18nProvider';

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
  constructor(private readonly i18nProvider: II18nProvider) {}

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
    if ('schema' in template) {
      // It's a JSON template
      return this.renderJsonTemplateToMarkdown(template, language, variables);
    } else {
      // It's a base template (array-based)
      return this.renderBaseTemplateToMarkdown(template, language, variables);
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
    const title = this.i18nProvider.translate(template.titleKey, language);
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
    for (const [sectionId, section] of Object.entries(template.content.sections)) {
      const sectionContent = this.renderJsonSection(
        section,
        language,
        variables,
        template.content.placeholders
      );

      // Skip empty optional sections
      if (section.optional && sectionContent.trim() === '') {
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

    // Add section title
    const title = this.i18nProvider.translate(section.titleKey, language);

    // Only add title if it's not empty
    if (title.trim()) {
      lines.push(`## ${title}\n`);
    }

    // Add section content if available
    if (section.contentKey) {
      const content = this.i18nProvider.translate(section.contentKey, language, variables);
      lines.push(content);
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
    section: any,
    language: Language,
    variables?: Record<string, string>,
    placeholders?: Record<string, string>
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
    const comment = this.i18nProvider.translate(specificKey, language);

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
