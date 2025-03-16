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
  convertMarkdownsToJsonTemplate(
    templateId: string,
    templateType: string,
    languageContents: Record<string, string>,
    nameMap: Record<string, string>,
    descriptionMap?: Record<string, string>
  ): JsonTemplate {
    // Extract sections from each language version
    const sectionsByLanguage: Record<string, Record<string, ExtractedSection>> = {};
    const allSectionTitles = new Map<string, string>();
    const sectionIdMapping: Record<string, Record<string, string>> = {};

    // Process each language version
    for (const [language, content] of Object.entries(languageContents)) {
      const sections = this.extractSections(content);
      sectionsByLanguage[language] = sections;
      
      // Collect all section IDs and their titles
      for (const [id, section] of Object.entries(sections)) {
        if (!sectionIdMapping[id]) {
          sectionIdMapping[id] = {};
        }
        sectionIdMapping[id][language] = section.title;
        allSectionTitles.set(id, section.title);
      }
    }

    // Determine common section IDs across languages
    const mappedSectionIds = Object.keys(sectionIdMapping);
          isOptional = true;
    // Construct template sections
    const templateSections: Record<string, JsonTemplateSection> = {};
    
    for (const sectionId of mappedSectionIds) {
      const titleMap: Record<string, string> = {};
      const contentMap: Record<string, string> = {};
      // When a section only appears in one language, it's considered optional
      let isOptional = false;
      
      // For each language, get the section title and content
      for (const [language, sections] of Object.entries(sectionsByLanguage)) {
        const section = Object.entries(sections).find(
          ([id, _]) => id === sectionId
        )?.[1];
        
        if (section) {
          titleMap[language] = section.title;
          contentMap[language] = section.content;
        } else {
          // If section is missing in any language, it's optional
          isOptional = true;
        }
      }

      // Create the template section
      templateSections[sectionId] = createJsonTemplateSection(
        titleMap,
        contentMap,
        isOptional
      );
    }
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
    // For non-latin characters (like Japanese), just return the original title
    if (/[\u3000-\u9fff]/.test(title)) {
      return title;
    }
    
    // For latin characters, convert to camelCase
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
    // For non-latin characters (like Japanese), create a mapping to common IDs
    if (/[\u3000-\u9fff]/.test(title)) {
      if (title === 'はじめに') return 'introduction';
      if (title === '主要な内容') return 'mainContent';
      if (title === 'まとめ') return 'summary';
      // If no mapping exists, just return the original title
      placeholders[match[1]] = '';
    }
    
  /**
   * Normalize a section title to a valid section ID
   * 
   * @param title Section title
   * @returns Normalized section ID
   */
    // For non-latin characters (like Japanese), create a mapping to common IDs
    if (/[　-鿿]/.test(title)) {
      if (title === 'はじめに') return 'introduction';
      if (title === '主要な内容') return 'mainContent';
      if (title === 'まとめ') return 'summary';
      // If no mapping exists, just return the original title
      return title;
    }
    
    // For latin characters, convert to camelCase
    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    
    return words[0] + words.slice(1).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
  }
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
