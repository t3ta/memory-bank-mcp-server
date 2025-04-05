import { IDocumentValidator } from '../../domain/validation/IDocumentValidator.js';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';

import {
  SCHEMA_VERSION, // ここで SCHEMA_VERSION をインポート
  BaseJsonDocumentV2Schema,
  DocumentMetadataV2Schema, // DocumentMetadataV2Schema をインポート
  BranchContextJsonV2Schema,
  ActiveContextJsonV2Schema,
  ProgressJsonV2Schema,
  SystemPatternsJsonV2Schema,
} from '@memory-bank/schemas';

/**
 * Implementation of IDocumentValidator using Zod schemas
 * This keeps validation logic separate from domain entities
 */
export class ZodDocumentValidator implements IDocumentValidator {
  /**
   * Validates content for a specific document type
   * @param documentType Type of document
   * @param content Content to validate
   * @returns true if valid, throws error if not
   */
  public validateContent(documentType: string, content: Record<string, unknown>): boolean {
    try {
      switch (documentType) {
        case 'branch_context':
          BranchContextJsonV2Schema.shape.content.parse(content);
          break;
        case 'active_context':
          ActiveContextJsonV2Schema.shape.content.parse(content);
          break;
        case 'progress':
          ProgressJsonV2Schema.shape.content.parse(content);
          break;
        case 'system_patterns':
          SystemPatternsJsonV2Schema.shape.content.parse(content);
          break;
        default:
          if (Object.keys(content).length === 0) {
            throw new Error('Content cannot be empty');
          }
          break;
      }
      return true;
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid content for ${documentType} document: ${(error as Error).message}`
      );
    }
  }

  /**
   * Validates a complete document object
   * @param document Document to validate
   * @returns true if valid, throws error if not
   */
  public validateDocument(document: unknown): boolean {
    try {
      BaseJsonDocumentV2Schema.parse(document);

      const baseDocument = document as { metadata: { documentType: string } };
      const documentType = baseDocument.metadata.documentType;

      switch (documentType) {
        case 'branch_context':
          BranchContextJsonV2Schema.parse(document);
          break;
        case 'active_context':
          ActiveContextJsonV2Schema.parse(document);
          break;
        case 'progress':
          ProgressJsonV2Schema.parse(document);
          break;
        case 'system_patterns':
          SystemPatternsJsonV2Schema.parse(document);
          break;
        default:
          BaseJsonDocumentV2Schema.parse(document);
          break;
      }
      return true;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid document structure: ${(error as Error).message}`
      );
    }
  }

  /**
   * Validates metadata structure
   * @param metadata Metadata to validate
   * @returns true if valid, throws error if not
   */
  public validateMetadata(metadata: Record<string, unknown>): boolean {
    try {
      DocumentMetadataV2Schema.parse(metadata); // DocumentMetadataV2Schema を直接使う
      return true;
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid document metadata: ${(error as Error).message}`
      );
    }
  }

  /**
   * @returns The current schema version
   */
  public getSchemaVersion(): string {
    return SCHEMA_VERSION;
  }
}
