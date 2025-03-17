/**
 * Base interface for Markdown to JSON converters
 * Each document type will implement this interface with specialized conversion logic
 */
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { JsonDocument } from '../../domain/entities/JsonDocument.js';

/**
 * Base interface for all Markdown to JSON converters
 */
export interface BaseConverter {
  /**
   * Convert Markdown content to a JsonDocument
   * @param markdownContent Markdown content to convert
   * @param path Document path
   * @returns JsonDocument instance
   */
  convert(markdownContent: string, path: DocumentPath): JsonDocument;
}
