import { IDocumentValidator } from '../../domain/interfaces/IDocumentValidator.js';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';

// Schema imports - these define validation and structure
import {
  BaseJsonDocumentV2Schema,
  BranchContextJsonV2Schema,
  ActiveContextJsonV2Schema,
  ProgressJsonV2Schema,
  SystemPatternsJsonV2Schema,
} from '@memory-bank/schemas';

/**
 * Validator implementation using Zod schemas
 * This allows domain entities to validate without direct dependency on Zod
 */
export class ZodDocumentValidator implements IDocumentValidator {
  /**
   * Validate a JSON string
   * @param jsonString JSON string to validate
   * @throws DomainError if validation fails
   */
  public validateJsonString(jsonString: string): void {
    try {
      JSON.parse(jsonString);
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Failed to parse JSON string: ${(error as Error).message}`
      );
    }
  }
  
  /**
   * Validate a JSON object against basic document schema
   * @param jsonData JSON object to validate
   * @throws DomainError if validation fails
   */
  public validateBaseDocument(jsonData: unknown): void {
    try {
      BaseJsonDocumentV2Schema.parse(jsonData);
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid JSON document structure: ${(error as Error).message}`
      );
    }
  }
  
  /**
   * Validate a document by type
   * @param documentType Type of document to validate
   * @param jsonData JSON object to validate
   * @throws DomainError if validation fails
   */
  public validateDocumentByType(documentType: string, jsonData: unknown): void {
    try {
      switch (documentType) {
        case 'branch_context':
          BranchContextJsonV2Schema.parse(jsonData);
          break;
        case 'active_context':
          ActiveContextJsonV2Schema.parse(jsonData);
          break;
        case 'progress':
          ProgressJsonV2Schema.parse(jsonData);
          break;
        case 'system_patterns':
          SystemPatternsJsonV2Schema.parse(jsonData);
          break;
        default:
          BaseJsonDocumentV2Schema.parse(jsonData);
          break;
      }
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid ${documentType} document: ${(error as Error).message}`
      );
    }
  }
  
  /**
   * Validate document content by type
   * @param documentType Type of document
   * @param content Content to validate
   * @throws DomainError if validation fails
   */
  public validateContentByType(documentType: string, content: Record<string, unknown>): void {
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
          // For generic types, ensure content is not empty
          if (Object.keys(content).length === 0) {
            throw new Error('Content cannot be empty');
          }
          break;
      }
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid content for ${documentType} document: ${(error as Error).message}`
      );
    }
  }
}
