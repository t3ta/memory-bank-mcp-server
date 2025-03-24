/**
 * Section Domain Model
 * 
 * Represents a section within a template with multilingual title and content.
 * Implements value object pattern - immutable and equality based on value.
 */
import { Language, LanguageCode } from '../i18n/Language.js';

/**
 * Type for multilingual text mapping
 */
export type LanguageTextMap = Partial<Record<LanguageCode, string>>;

/**
 * Section class represents a section of a template with localized titles and content
 */
export class Section {
  private readonly _id: string;
  private readonly _titleMap: LanguageTextMap;
  private readonly _contentMap: LanguageTextMap;
  private readonly _isOptional: boolean;

  /**
   * Constructor with validation
   * 
   * @param id Section identifier
   * @param titleMap Map of language codes to localized titles
   * @param contentMap Optional map of language codes to localized content
   * @param isOptional Whether this section is optional
   * @throws Error if id is empty or titleMap is empty
   */
  constructor(
    id: string,
    titleMap: LanguageTextMap,
    contentMap: LanguageTextMap = {},
    isOptional: boolean = false
  ) {
    if (!id || id.trim() === '') {
      throw new Error('Section ID cannot be empty');
    }
    
    if (!titleMap || Object.keys(titleMap).length === 0) {
      throw new Error('Section must have at least one title translation');
    }
    
    this._id = id.trim();
    this._titleMap = { ...titleMap };
    this._contentMap = { ...contentMap };
    this._isOptional = isOptional;
  }

  /**
   * Gets the section identifier
   */
  get id(): string {
    return this._id;
  }

  /**
   * Gets the map of language codes to titles
   */
  get titleMap(): LanguageTextMap {
    return { ...this._titleMap };
  }

  /**
   * Gets the map of language codes to content
   */
  get contentMap(): LanguageTextMap {
    return { ...this._contentMap };
  }

  /**
   * Gets whether this section is optional
   */
  get isOptional(): boolean {
    return this._isOptional;
  }

  /**
   * Creates a Section instance, validating inputs
   * 
   * @param id Section identifier
   * @param titleMap Map of language codes to localized titles
   * @param contentMap Optional map of language codes to localized content
   * @param isOptional Whether this section is optional
   * @returns Section instance
   * @throws Error if id is empty or titleMap is empty
   */
  static create(
    id: string,
    titleMap: LanguageTextMap,
    contentMap: LanguageTextMap = {},
    isOptional: boolean = false
  ): Section {
    return new Section(id, titleMap, contentMap, isOptional);
  }

  /**
   * Gets the localized title for a specific language
   * 
   * @param language Language to get title for
   * @returns Localized title string
   */
  getTitle(language: Language): string {
    // Try to get title for the requested language
    if (this._titleMap[language.code]) {
      return this._titleMap[language.code];
    }
    
    // Fall back to English if available
    if (this._titleMap.en) {
      return this._titleMap.en;
    }
    
    // Fall back to first available language
    const firstKey = Object.keys(this._titleMap)[0] as LanguageCode;
    return this._titleMap[firstKey];
  }

  /**
   * Gets the localized content for a specific language
   * 
   * @param language Language to get content for
   * @returns Localized content string or empty string if not available
   */
  getContent(language: Language): string {
    // Try to get content for the requested language
    if (this._contentMap[language.code]) {
      return this._contentMap[language.code];
    }
    
    // If no content for requested language, try English
    if (this._contentMap.en) {
      return this._contentMap.en;
    }
    
    // If no English content, try first available
    const contentKeys = Object.keys(this._contentMap);
    if (contentKeys.length > 0) {
      const firstKey = contentKeys[0] as LanguageCode;
      return this._contentMap[firstKey];
    }
    
    // No content available
    return '';
  }

  /**
   * Creates a new Section with updated content for a language
   * 
   * @param languageCode Language code to update content for
   * @param content New content text
   * @returns New Section instance with updated content
   */
  withContent(languageCode: LanguageCode, content: string): Section {
    // Create new content map with updated value
    const newContentMap = {
      ...this._contentMap,
      [languageCode]: content,
    };
    
    return new Section(this._id, this._titleMap, newContentMap, this._isOptional);
  }

  /**
   * Creates a new Section with updated title for a language
   * 
   * @param languageCode Language code to update title for
   * @param title New title text
   * @returns New Section instance with updated title
   */
  withTitle(languageCode: LanguageCode, title: string): Section {
    // Create new title map with updated value
    const newTitleMap = {
      ...this._titleMap,
      [languageCode]: title,
    };
    
    return new Section(this._id, newTitleMap, this._contentMap, this._isOptional);
  }

  /**
   * Compare equality with another Section object
   * 
   * @param other Another Section object to compare
   * @returns true if equal, false otherwise
   */
  equals(other: Section): boolean {
    if (this._id !== other.id || this._isOptional !== other.isOptional) {
      return false;
    }
    
    // Compare title maps
    const thisTitleKeys = Object.keys(this._titleMap);
    const otherTitleKeys = Object.keys(other.titleMap);
    
    if (thisTitleKeys.length !== otherTitleKeys.length) {
      return false;
    }
    
    for (const key of thisTitleKeys) {
      if (this._titleMap[key as LanguageCode] !== other.titleMap[key as LanguageCode]) {
        return false;
      }
    }
    
    // Compare content maps
    const thisContentKeys = Object.keys(this._contentMap);
    const otherContentKeys = Object.keys(other.contentMap);
    
    if (thisContentKeys.length !== otherContentKeys.length) {
      return false;
    }
    
    for (const key of thisContentKeys) {
      if (this._contentMap[key as LanguageCode] !== other.contentMap[key as LanguageCode]) {
        return false;
      }
    }
    
    return true;
  }
}
