/**
 * Template Domain Model
 * 
 * Represents a template with multilingual properties and sections.
 * Implements value object pattern - immutable and equality based on value.
 */
import { Language, LanguageCode } from '../i18n/Language.js';
import { Section, LanguageTextMap } from './Section.js';

/**
 * Template class represents a template with localized names and sections
 */
export class Template {
  private readonly _id: string;
  private readonly _type: string;
  private readonly _nameMap: LanguageTextMap;
  private readonly _sections: Section[];

  /**
   * Constructor with validation
   * 
   * @param id Template identifier
   * @param type Template type
   * @param nameMap Map of language codes to localized names
   * @param sections Optional array of template sections
   * @throws Error if id is empty, type is empty, or nameMap is empty
   */
  constructor(
    id: string,
    type: string,
    nameMap: LanguageTextMap,
    sections: Section[] = []
  ) {
    if (!id || id.trim() === '') {
      throw new Error('Template ID cannot be empty');
    }
    
    if (!type || type.trim() === '') {
      throw new Error('Template type cannot be empty');
    }
    
    if (!nameMap || Object.keys(nameMap).length === 0) {
      throw new Error('Template must have at least one name translation');
    }
    
    this._id = id.trim();
    this._type = type.trim();
    this._nameMap = { ...nameMap };
    this._sections = [...sections]; // Create a copy to avoid external modifications
  }

  /**
   * Gets the template identifier
   */
  get id(): string {
    return this._id;
  }

  /**
   * Gets the template type
   */
  get type(): string {
    return this._type;
  }

  /**
   * Gets the map of language codes to names
   */
  get nameMap(): LanguageTextMap {
    return { ...this._nameMap };
  }

  /**
   * Gets the array of sections
   */
  get sections(): Section[] {
    return [...this._sections]; // Return a copy to avoid external modifications
  }

  /**
   * Creates a Template instance, validating inputs
   * 
   * @param id Template identifier
   * @param type Template type
   * @param nameMap Map of language codes to localized names
   * @param sections Optional array of template sections
   * @returns Template instance
   * @throws Error if id is empty, type is empty, or nameMap is empty
   */
  static create(
    id: string,
    type: string,
    nameMap: LanguageTextMap,
    sections: Section[] = []
  ): Template {
    return new Template(id, type, nameMap, sections);
  }

  /**
   * Gets the localized name for a specific language
   * 
   * @param language Language to get name for
   * @returns Localized name string
   */
  getName(language: Language): string {
    // Try to get name for the requested language
    if (this._nameMap[language.code]) {
      return this._nameMap[language.code] as string;
    }
    
    // Fall back to English if available
    if (this._nameMap.en) {
      return this._nameMap.en;
    }
    
    // Fall back to first available language
    const firstKey = Object.keys(this._nameMap)[0] as LanguageCode;
    return this._nameMap[firstKey] as string;
  }

  /**
   * Gets a section by ID
   * 
   * @param sectionId Section ID to look for
   * @returns Section if found, null otherwise
   */
  getSection(sectionId: string): Section | null {
    const section = this._sections.find(s => s.id === sectionId);
    return section || null;
  }

  /**
   * Creates a new Template with a section added or updated
   * 
   * @param section Section to add or update
   * @returns New Template instance with the section added or updated
   */
  withSection(section: Section): Template {
    // Check if section with same ID already exists
    const index = this._sections.findIndex(s => s.id === section.id);
    
    let newSections;
    if (index >= 0) {
      // Replace existing section
      newSections = [...this._sections];
      newSections[index] = section;
    } else {
      // Add new section
      newSections = [...this._sections, section];
    }
    
    return new Template(this._id, this._type, this._nameMap, newSections);
  }

  /**
   * Creates a new Template with a section removed
   * 
   * @param sectionId ID of section to remove
   * @returns New Template instance with the section removed, or this instance if not found
   */
  withoutSection(sectionId: string): Template {
    const index = this._sections.findIndex(s => s.id === sectionId);
    
    // If section not found, return this instance
    if (index < 0) {
      return this;
    }
    
    // Create new array without the section
    const newSections = [...this._sections];
    newSections.splice(index, 1);
    
    return new Template(this._id, this._type, this._nameMap, newSections);
  }

  /**
   * Compare equality with another Template object
   * 
   * @param other Another Template object to compare
   * @returns true if equal, false otherwise
   */
  equals(other: Template): boolean {
    if (this._id !== other.id || this._type !== other.type) {
      return false;
    }
    
    // Compare name maps
    const thisNameKeys = Object.keys(this._nameMap);
    const otherNameKeys = Object.keys(other.nameMap);
    
    if (thisNameKeys.length !== otherNameKeys.length) {
      return false;
    }
    
    for (const key of thisNameKeys) {
      if (this._nameMap[key as LanguageCode] !== other.nameMap[key as LanguageCode]) {
        return false;
      }
    }
    
    // Compare sections (length and identity)
    if (this._sections.length !== other.sections.length) {
      return false;
    }
    
    for (let i = 0; i < this._sections.length; i++) {
      if (!this._sections[i].equals(other.sections[i])) {
        return false;
      }
    }
    
    return true;
  }
}
