import { JsonDocument } from '../../domain/entities/JsonDocument.js';
import { MarkdownBuilder } from '../.jsMarkdownBuilder.js';

/**
 * Interface for document type specific conversion strategies
 *
 * Each document type (branch_context, active_context, etc.) implements
 * this interface to provide custom conversion logic.
 */
export interface IDocumentTypeConverter {
  /**
   * Check if this converter can handle the given document
   * @param document JSON document to check
   * @returns true if this converter can handle the document
   */
  canConvert(document: JsonDocument): boolean;

  /**
   * Convert JSON document to Markdown
   * @param document JSON document to convert
   * @param builder Optional markdown builder to use (will create one if not provided)
   * @returns Markdown string
   */
  convert(document: JsonDocument, builder?: MarkdownBuilder): string;
}

/**
 * Base class for document type converters with common functionality
 */
export abstract class BaseDocumentTypeConverter implements IDocumentTypeConverter {
  /**
   * Document type that this converter handles
   */
  protected abstract documentType: string;

  /**
   * Check if this converter can handle the given document
   * @param document JSON document to check
   * @returns true if document type matches this converter
   */
  canConvert(document: JsonDocument): boolean {
    return document.documentType === this.documentType;
  }

  /**
   * Convert JSON document to Markdown
   * @param document JSON document to convert
   * @param builder Optional markdown builder to use
   * @returns Markdown string
   */
  convert(document: JsonDocument, builder?: MarkdownBuilder): string {
    const md = builder || new MarkdownBuilder();

    // Add document title
    md.heading(document.title);

    // Add tags if present
    if (document.tags && document.tags.length > 0) {
      md.tags(document.tags.filter(tag => tag && typeof tag === 'object' && 'value' in tag).map((tag) => tag.value));
    }

    // Call implementation specific conversion
    this.convertContent(document, md);

    return md.build();
  }

  /**
   * Convert document content to Markdown (implemented by subclasses)
   * @param document JSON document to convert
   * @param builder Markdown builder to use
   */
  protected abstract convertContent(document: JsonDocument, builder: MarkdownBuilder): void;
}
