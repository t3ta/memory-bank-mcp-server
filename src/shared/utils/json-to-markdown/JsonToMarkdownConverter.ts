import { JsonDocument } from '../../../domain/entities/JsonDocument.js';
import { IDocumentTypeConverter } from './DocumentTypeConverter.js';
import { MarkdownBuilder } from './MarkdownBuilder.js';
import { SharedUtilsError, SharedUtilsErrorCodes } from '../../errors/SharedUtilsError.js';

/**
 * @deprecated This class is deprecated in v2.1.0 as Markdown support has been removed.
 * All documents should use JSON format only.
 */

/**
 * Options for JSON to Markdown conversion
 */
export interface JsonToMarkdownOptions {
  /**
   * Pretty print the markdown output
   * Adds extra line breaks for readability
   */
  prettyPrint?: boolean;

  /**
   * Use caching for conversion results
   * Improve performance for repeated conversions
   */
  useCache?: boolean;
}

/**
 * Default conversion options
 */
const DEFAULT_OPTIONS: JsonToMarkdownOptions = {
  prettyPrint: true,
  useCache: true,
};

/**
 * Main converter class for JSON to Markdown transformation
 */
export class JsonToMarkdownConverter {
  private converters: IDocumentTypeConverter[] = [];
  private cache: Map<string, string> = new Map();

  /**
   * Create a new JSON to Markdown converter
   * @param converters Optional array of document type converters
   */
  constructor(converters?: IDocumentTypeConverter[]) {
    if (converters) {
      this.converters = converters;
    }
  }

  /**
   * Register a document type converter
   * @param converter Converter implementation
   * @returns this converter for chaining
   */
  registerConverter(converter: IDocumentTypeConverter): JsonToMarkdownConverter {
    this.converters.push(converter);
    return this;
  }

  /**
   * Convert JSON document to Markdown
   * @param document JSON document to convert
   * @param options Conversion options
   * @returns Markdown string
   * @throws SharedUtilsError if no converter found for document type
   * @deprecated This method is deprecated in v2.1.0 as Markdown support has been removed.
   * All documents should use JSON format only.
   */
  convert(document: JsonDocument, options: JsonToMarkdownOptions = {}): string {
    console.warn('DEPRECATED: JsonToMarkdownConverter is deprecated in v2.1.0. Markdown support has been removed.');
    console.warn('Please use JSON format only for all documents.');
    // Merge options with defaults
    const mergedOptions: JsonToMarkdownOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // Check cache if enabled
    if (mergedOptions.useCache) {
      const cacheKey = this.getCacheKey(document);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        return cached;
      }
    }

    // Find appropriate converter
    const converter = this.findConverter(document);

    if (!converter) {
      throw new SharedUtilsError(
        SharedUtilsErrorCodes.CONVERSION_ERROR,
        `No converter found for document type: ${document.documentType}`
      );
    }

    // Create builder
    const builder = new MarkdownBuilder();

    // Convert document
    const markdown = converter.convert(document, builder);

    // Store in cache if enabled
    if (mergedOptions.useCache) {
      const cacheKey = this.getCacheKey(document);
      this.cache.set(cacheKey, markdown);
    }

    return markdown;
  }

  /**
   * Clear the conversion cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get the number of registered converters
   * @returns Number of converters
   */
  getConverterCount(): number {
    return this.converters.length;
  }

  /**
   * Find the appropriate converter for a document
   * @param document JSON document to convert
   * @returns Converter implementation or null if none found
   */
  private findConverter(document: JsonDocument): IDocumentTypeConverter | null {
    // Try to find specific converter
    for (const converter of this.converters) {
      if (converter.canConvert(document)) {
        return converter;
      }
    }

    // No converter found
    return null;
  }

  /**
   * Generate a cache key for a document
   * @param document JSON document
   * @returns Cache key string
   */
  private getCacheKey(document: JsonDocument): string {
    // Use document ID, path, and last modified date as key
    const lastModified =
      document.lastModified instanceof Date
        ? document.lastModified.toISOString()
        : document.lastModified;

    return `${document.id.value}|${document.path.value}|${lastModified}`;
  }
}
