/**
 * Factory for creating appropriate converters based on document type
 */
import { DocumentType } from '../../domain/entities/JsonDocument.js';
import { BaseConverter } from './BaseConverter.js';
import { BranchContextConverter } from './BranchContextConverter.js';
import { ActiveContextConverter } from './ActiveContextConverter.js';
import { SystemPatternsConverter } from './SystemPatternsConverter.js';
import { ProgressConverter } from './ProgressConverter.js';
import { GenericConverter } from './GenericConverter.js';

/**
 * Factory for creating document type-specific converters
 */
export class ConverterFactory {
  private readonly converters: Map<DocumentType, BaseConverter>;

  /**
   * Create a new converter factory
   */
  constructor() {
    this.converters = new Map<DocumentType, BaseConverter>();
    this.registerDefaultConverters();
  }

  /**
   * Register default converters for standard document types
   */
  private registerDefaultConverters(): void {
    this.registerConverter('branch_context', new BranchContextConverter());
    this.registerConverter('active_context', new ActiveContextConverter());
    this.registerConverter('system_patterns', new SystemPatternsConverter());
    this.registerConverter('progress', new ProgressConverter());
    this.registerConverter('generic', new GenericConverter());
  }

  /**
   * Register a custom converter for a document type
   * @param documentType Document type
   * @param converter Converter instance
   */
  public registerConverter(documentType: DocumentType, converter: BaseConverter): void {
    this.converters.set(documentType, converter);
  }

  /**
   * Get converter for a document type
   * @param documentType Document type
   * @returns Appropriate converter
   * @throws Error if no converter is registered for the document type
   */
  public getConverter(documentType: DocumentType): BaseConverter {
    const converter = this.converters.get(documentType);

    if (!converter) {
      // Fall back to generic converter
      const genericConverter = this.converters.get('generic');

      if (!genericConverter) {
        throw new Error(`No converter registered for document type '${documentType}'`);
      }

      return genericConverter;
    }

    return converter;
  }
}
