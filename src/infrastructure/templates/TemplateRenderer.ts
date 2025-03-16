/**
 * Template Renderer
 * Converts JSON templates to markdown format
 */
import { BaseTemplate, TemplateSection } from '../../schemas/v2/template-schema.js';
import { Language } from '../../schemas/v2/i18n-schema.js';
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
  constructor(private readonly i18nProvider: II18nProvider) {}
  
  /**
   * Renders a template to Markdown format
   * 
   * @param template The template to render
   * @param language The target language
   * @param variables Optional variables for substitution
   * @returns Markdown formatted string
   */
  renderToMarkdown(template: BaseTemplate, language: Language, variables?: Record<string, string>): string {
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
   * Renders a template section
   * 
   * @param section The section to render
   * @param language The target language
   * @param variables Optional variables for substitution
   * @returns Markdown formatted string for the section
   */
  private renderSection(section: TemplateSection, language: Language, variables?: Record<string, string>): string {
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
    let comment = this.i18nProvider.translate(specificKey, language);
    
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
