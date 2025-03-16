/**
 * Markdown to JSON Template Converter
 * Utility for converting Markdown templates to JSON format
 */

import { JsonTemplate, JsonTemplateSection, createJsonTemplate, createJsonTemplateSection } from '../../schemas/v2/template-schema.js';

/**
 * Interface for language files mapping
 */
interface LanguageFiles {
  [language: string]: string;
}

/**
 * Interface representing a section extracted from Markdown
 */
interface ExtractedSection {
  title: string;
  content: string;
}

/**
 * Utility class for converting Markdown templates to JSON format
 */
export class MarkdownToJsonConverter {
  /**
   * Convert multiple language versions of a Markdown template to a single JSON template
   * 
   * @param templateId The ID for the new template
   * @param templateType The type of template (e.g., "pull-request", "rules")
   * @param languageContents Map of language codes to markdown content
   * @param nameMap Map of language codes to template names
   * @param descriptionMap Optional map of language codes to template descriptions
   * @returns A JSON template object
   */
  convertMarkdownsToJsonTemplate(
    templateId: string,
    templateType: string,
    languageContents: Record<string, string>,
    nameMap: Record<string, string>,
    descriptionMap?: Record<string, string>
  ): JsonTemplate {
    // Extract sections from each language version
    const sectionsByLanguage: Record<string, Record<string, ExtractedSection>> = {};
    const allSectionIds = new Set<string>();

    // Process each language version
    for (const [language, content] of Object.entries(languageContents)) {
      const sections = this.extractSections(content);
      sectionsByLanguage[language] = sections;
      
      // Collect all section IDs
      Object.keys(sections).forEach(id => allSectionIds.add(id));
    }

    // Construct template sections
    const templateSections: Record<string, JsonTemplateSection> = {};
    
    for (const sectionId of allSectionIds) {
      const titleMap: Record<string, string> = {};
      const contentMap: Record<string, string> = {};
      let isOptional = true;

      // For each language, get the section title and content
      for (const [language, sections] of Object.entries(sectionsByLanguage)) {
        const section = sections[sectionId];
        if (section) {
          titleMap[language] = section.title;
          contentMap[language] = section.content;
          
          // If at least one language has non-empty content, consider the section required
          if (section.content.trim() !== '') {
            isOptional = false;
          }
        }
      }

      // Create the template section
      templateSections[sectionId] = createJsonTemplateSection(
        titleMap,
        contentMap,
        isOptional
      );
    }

    // Create the template with all sections
    return createJsonTemplate(
      templateId,
      templateType,
      nameMap,
      templateSections,
      descriptionMap
    );
  }

  /**
   * Extract sections from Markdown content
   * Sections are identified by heading level 2 (## )
   * 
   * @param markdown Markdown content
   * @returns Map of normalized section IDs to section objects
   */
  private extractSections(markdown: string): Record<string, ExtractedSection> {
    const sections: Record<string, ExtractedSection> = {};
    const lines = markdown.split('\n');
    
    let currentSectionId: string | null = null;
    let currentSectionTitle: string | null = null;
    let currentSectionContent: string[] = [];
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line is a section header (## )
      if (line.startsWith('## ')) {
        // If we were already processing a section, save it
        if (currentSectionId) {
          sections[currentSectionId] = {
            title: currentSectionTitle!,
            content: currentSectionContent.join('\n').trim()
          };
        }
        
        // Start new section
        currentSectionTitle = line.substring(3).trim();
        currentSectionId = this.normalizeToSectionId(currentSectionTitle);
        currentSectionContent = [];
      } 
      // If we're in a section, add content
      else if (currentSectionId) {
        currentSectionContent.push(line);
      }
    }
    
    // Don't forget to save the last section
    if (currentSectionId) {
      sections[currentSectionId] = {
        title: currentSectionTitle!,
        content: currentSectionContent.join('\n').trim()
      };
    }
    
    return sections;
  }

  /**
   * Normalize a section title to a valid section ID
   * 
   * @param title Section title
   * @returns Normalized section ID
   */
  private normalizeToSectionId(title: string): string {
    // Remove any non-alphanumeric characters, replace spaces with hyphens
    // and convert to camelCase
    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    
    return words[0] + words.slice(1).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
  }

  /**
   * Find placeholders in Markdown content
   * Placeholders are in the format {{PLACEHOLDER_NAME}}
   * 
   * @param markdown Markdown content
   * @returns Map of placeholder names to empty strings (to be filled with descriptions)
   */
  findPlaceholders(markdown: string): Record<string, string> {
    const placeholders: Record<string, string> = {};
    const regex = /\{\{([A-Z_]+)\}\}/g;
    let match;
    
    while ((match = regex.exec(markdown)) !== null) {
      placeholders[match[1]] = '';
    }
    
    return placeholders;
  }
}
