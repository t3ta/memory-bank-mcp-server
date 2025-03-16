import { JsonDocument } from '../../../../domain/entities/JsonDocument.js';
import { BaseDocumentTypeConverter } from '../DocumentTypeConverter.js';
import { MarkdownBuilder } from '../MarkdownBuilder.js';

/**
 * Converter for generic documents
 * Handles documents that don't match other specific converters
 */
export class GenericConverter extends BaseDocumentTypeConverter {
  protected documentType = 'generic';
  
  /**
   * Generic converter can handle any document type
   * This is a fallback converter for unknown document types
   * @param document Any JSON document
   * @returns Always true to indicate it can handle any document
   */
  override canConvert(document: JsonDocument): boolean {
    // Generic converter handles any document type that doesn't match other converters
    return true;
  }
  
  /**
   * Convert generic document content to Markdown
   * @param document Any JSON document
   * @param builder Markdown builder
   */
  protected convertContent(document: JsonDocument, builder: MarkdownBuilder): void {
    // Extract content from document
    const content = document.content as Record<string, any>;
    
    // Process each content property as a section
    for (const [key, value] of Object.entries(content)) {
      // Skip empty values
      if (value === null || value === undefined) continue;
      
      // Format key as section title
      const sectionTitle = this.formatSectionTitle(key);
      builder.heading(sectionTitle, 2);
      
      // Handle different value types
      if (Array.isArray(value)) {
        // Array handling
        if (value.length > 0) {
          if (typeof value[0] === 'object' && value[0] !== null) {
            // Array of objects - convert to structured content
            this.processArrayOfObjects(value, builder);
          } else {
            // Array of primitives - convert to list
            builder.list(value.map(item => String(item)));
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // Object handling
        this.processObject(value, builder);
      } else {
        // Primitive value handling
        builder.paragraph(String(value));
      }
    }
  }
  
  /**
   * Process an array of objects into markdown
   * @param array Array of objects
   * @param builder Markdown builder
   */
  private processArrayOfObjects(array: any[], builder: MarkdownBuilder): void {
    array.forEach((item, index) => {
      // If object has a title property, use it
      const itemTitle = item.title || item.name || `Item ${index + 1}`;
      builder.heading(itemTitle, 3);
      
      // Process each property
      for (const [key, value] of Object.entries(item)) {
        // Skip title/name which we've already used
        if (key === 'title' || key === 'name') continue;
        
        const propertyTitle = this.formatSectionTitle(key);
        
        if (Array.isArray(value)) {
          // Array property
          builder.heading(propertyTitle, 4);
          builder.list(value.map(v => String(v)));
        } else if (typeof value === 'object' && value !== null) {
          // Nested object
          builder.heading(propertyTitle, 4);
          this.processObject(value, builder);
        } else {
          // Primitive value
          builder.heading(propertyTitle, 4);
          builder.paragraph(String(value));
        }
      }
    });
  }
  
  /**
   * Process an object into markdown
   * @param obj Object to process
   * @param builder Markdown builder
   */
  private processObject(obj: Record<string, any>, builder: MarkdownBuilder): void {
    for (const [key, value] of Object.entries(obj)) {
      const propertyTitle = this.formatSectionTitle(key);
      
      if (Array.isArray(value)) {
        // Array property
        builder.heading(propertyTitle, 4);
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          this.processArrayOfObjects(value, builder);
        } else {
          builder.list(value.map(v => String(v)));
        }
      } else if (typeof value === 'object' && value !== null) {
        // Nested object
        builder.heading(propertyTitle, 4);
        this.processObject(value, builder);
      } else if (value !== null && value !== undefined) {
        // Primitive value
        builder.heading(propertyTitle, 4);
        builder.paragraph(String(value));
      }
    }
  }
  
  /**
   * Format a section title from a camelCase, snake_case, or UPPER_CASE key
   * @param key Object property key
   * @returns Formatted section title
   */
  private formatSectionTitle(key: string): string {
    // Check if the key is kebab-case
    if (key.includes('-')) {
      // Just capitalize the first letter for kebab-case
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
    
    // Handle different case patterns
    let spacedKey = key;
    
    // Replace underscores with spaces (for snake_case and UPPER_CASE)
    spacedKey = spacedKey.replace(/_/g, ' ');
    
    // Add space before capital letters for camelCase
    spacedKey = spacedKey.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Split by spaces and capitalize each word
    return spacedKey
      .split(' ')
      .map(word => {
        // For UPPER_CASE converted to spaces, convert to Title Case
        if (word === word.toUpperCase() && word.length > 1) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        // Otherwise just capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }
}
