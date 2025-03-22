/**
 * File-based implementation of the Template Repository
 * 
 * Stores and retrieves templates from JSON files.
 * Each template is stored in its own file with all language variations.
 */
import path from 'path';
import fs from 'fs/promises';
import { ITemplateRepository } from '../../domain/templates/ITemplateRepository.js';
import { Template } from '../../domain/templates/Template.js';
import { Section, LanguageTextMap } from '../../domain/templates/Section.js';
import { Language, LanguageCode } from '../../domain/i18n/Language.js';

/**
 * Type representing the structure of a template file
 */
interface TemplateFile {
  id: string;
  type: string;
  names: LanguageTextMap;
  sections: SectionData[];
  lastModified: string;
}

/**
 * Type representing a section within a template file
 */
interface SectionData {
  id: string;
  titles: LanguageTextMap;
  contents: LanguageTextMap;
  isOptional: boolean;
}

/**
 * File-based implementation of Template Repository
 */
export class FileTemplateRepository implements ITemplateRepository {
  private readonly basePath: string;
  private templateCache: Map<string, Template>;
  private cacheDirty: boolean;

  /**
   * Constructor
   * 
   * @param basePath Base path for storing template files
   */
  constructor(basePath: string) {
    this.basePath = basePath;
    this.templateCache = new Map();
    this.cacheDirty = true;
  }

  /**
   * Initialize the repository
   * 
   * @returns Promise resolving when initialization is complete
   */
  async initialize(): Promise<void> {
    try {
      // Ensure templates directory exists
      await fs.mkdir(this.basePath, { recursive: true });
      
      // Load all templates into cache
      await this.loadAllTemplates();
    } catch (error) {
      throw new Error(`Failed to initialize Template repository: ${(error as Error).message}`);
    }
  }

  /**
   * Gets a template by ID
   * 
   * @param id Template ID
   * @returns Promise resolving to Template or null if not found
   */
  async getTemplate(id: string): Promise<Template | null> {
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }
    
    return this.templateCache.get(id) || null;
  }

  /**
   * Gets a template by ID in Markdown format
   * 
   * @param id Template ID
   * @param language Language to get template for
   * @param variables Optional variables for template substitution
   * @returns Promise resolving to Markdown content
   * @throws Error if template not found
   */
  async getTemplateAsMarkdown(
    id: string,
    language: Language,
    variables?: Record<string, string>
  ): Promise<string> {
    const template = await this.getTemplate(id);
    
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }
    
    // Convert template to Markdown
    let markdown = `# ${template.getName(language)}\n\n`;
    
    for (const section of template.sections) {
      const title = section.getTitle(language);
      const content = section.getContent(language);
      
      if (title) {
        markdown += `## ${title}\n\n`;
      }
      
      if (content) {
        markdown += `${content}\n\n`;
      }
    }
    
    // Replace variables if provided
    if (variables && Object.keys(variables).length > 0) {
      Object.entries(variables).forEach(([name, value]) => {
        const pattern = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
        markdown = markdown.replace(pattern, value);
      });
    }
    
    return markdown;
  }

  /**
   * Gets all templates of a specific type
   * 
   * @param type Template type
   * @returns Promise resolving to array of Templates
   */
  async getTemplatesByType(type: string): Promise<Template[]> {
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }
    
    const templates: Template[] = [];
    
    for (const template of this.templateCache.values()) {
      if (template.type === type) {
        templates.push(template);
      }
    }
    
    return templates;
  }

  /**
   * Saves a template (creates or updates)
   * 
   * @param template Template to save
   * @returns Promise resolving to boolean indicating success
   */
  async saveTemplate(template: Template): Promise<boolean> {
    try {
      // Update cache
      this.templateCache.set(template.id, template);
      
      // Save to file
      await this.saveTemplateToFile(template);
      
      return true;
    } catch (error) {
      console.error(`Failed to save template: ${template.id}`, error);
      return false;
    }
  }

  /**
   * Checks if a template exists
   * 
   * @param id Template ID
   * @returns Promise resolving to boolean indicating if template exists
   */
  async templateExists(id: string): Promise<boolean> {
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }
    
    return this.templateCache.has(id);
  }

  /**
   * Gets IDs of all available templates
   * 
   * @returns Promise resolving to array of template IDs
   */
  async getAllTemplateIds(): Promise<string[]> {
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }
    
    return Array.from(this.templateCache.keys());
  }

  /**
   * Gets all available template types
   * 
   * @returns Promise resolving to array of template types
   */
  async getAllTemplateTypes(): Promise<string[]> {
    if (this.cacheDirty) {
      await this.loadAllTemplates();
    }
    
    const types = new Set<string>();
    
    for (const template of this.templateCache.values()) {
      types.add(template.type);
    }
    
    return Array.from(types);
  }

  /**
   * Loads all templates into cache
   * 
   * @private
   */
  private async loadAllTemplates(): Promise<void> {
    try {
      // Clear the cache
      this.templateCache.clear();
      
      // Check if directory exists
      try {
        await fs.access(this.basePath);
      } catch (error) {
        // Directory doesn't exist, create it
        await fs.mkdir(this.basePath, { recursive: true });
        // No files to load
        this.cacheDirty = false;
        return;
      }
      
      // Get all template files
      const files = await fs.readdir(this.basePath);
      const templateFiles = files.filter(file => file.endsWith('.json'));
      
      // Load each file
      for (const file of templateFiles) {
        const id = path.basename(file, '.json');
        await this.loadTemplate(id);
      }
      
      // Cache is now clean
      this.cacheDirty = false;
    } catch (error) {
      console.error('Failed to load templates', error);
      throw new Error(`Failed to load templates: ${(error as Error).message}`);
    }
  }

  /**
   * Loads a template by ID
   * 
   * @param id Template ID
   * @private
   */
  private async loadTemplate(id: string): Promise<void> {
    try {
      const filePath = path.join(this.basePath, `${id}.json`);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        // File doesn't exist
        return;
      }
      
      // Read and parse the file
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as TemplateFile;
      
      // Validate data
      if (data.id !== id) {
        throw new Error(`Template ID mismatch in file ${filePath}: expected ${id}, got ${data.id}`);
      }
      
      // Convert to domain model
      const sections: Section[] = data.sections.map(sectionData => {
        return new Section(
          sectionData.id,
          sectionData.titles,
          sectionData.contents,
          sectionData.isOptional
        );
      });
      
      const template = new Template(
        data.id,
        data.type,
        data.names,
        sections
      );
      
      // Add to cache
      this.templateCache.set(id, template);
    } catch (error) {
      console.error(`Failed to load template: ${id}`, error);
      throw new Error(`Failed to load template ${id}: ${(error as Error).message}`);
    }
  }

  /**
   * Saves a template to file
   * 
   * @param template Template to save
   * @private
   */
  private async saveTemplateToFile(template: Template): Promise<void> {
    try {
      // Convert to file format
      const sections: SectionData[] = template.sections.map(section => {
        return {
          id: section.id,
          titles: section.titleMap,
          contents: section.contentMap,
          isOptional: section.isOptional
        };
      });
      
      const data: TemplateFile = {
        id: template.id,
        type: template.type,
        names: template.nameMap,
        sections,
        lastModified: new Date().toISOString()
      };
      
      // Write to file
      const filePath = path.join(this.basePath, `${template.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save template to file: ${template.id}`, error);
      throw new Error(`Failed to save template ${template.id}: ${(error as Error).message}`);
    }
  }
}