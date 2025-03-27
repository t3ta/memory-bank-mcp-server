/**
 * Migration validator
 *
 * Validates JSON documents against their respective schemas
 */
import { z } from 'zod';
import { DocumentType } from '../domain/entities/JsonDocument.js';
import { Logger } from '../shared/utils/logger.js';
  BaseJsonDocumentV2Schema,
  BranchContextJsonV2Schema,
  ActiveContextJsonV2Schema,
  ProgressJsonV2Schema,
  SystemPatternsJsonV2Schema,
} from '@memory-bank/schemas';


/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  success: boolean;

  /**
   * Error messages if validation failed
   */
  errors?: string[];
}

/**
 * Service for validating JSON documents against schemas
 */
export class MigrationValidator {
  /**
   * @param logger Logger instance
   */
  constructor(private readonly logger: Logger) { }

  /**
   * Validate a JSON document against its schema
   * @param jsonData JSON data to validate
   * @param documentType Document type
   * @returns Validation result
   */
  validateJson(jsonData: unknown, documentType: DocumentType): ValidationResult {
    try {
      // First validate against base schema
      BaseJsonDocumentV2Schema.parse(jsonData);

      // Then validate against specific schema
      let schema: z.ZodType;

      switch (documentType) {
        case 'branch_context':
          schema = BranchContextJsonV2Schema;
          break;
        case 'active_context':
          schema = ActiveContextJsonV2Schema;
          break;
        case 'progress':
          schema = ProgressJsonV2Schema;
          break;
        case 'system_patterns':
          schema = SystemPatternsJsonV2Schema;
          break;
        default:
          // Default to base schema
          schema = BaseJsonDocumentV2Schema;
          break;
      }

      schema.parse(jsonData);

      this.logger.debug(`Validated ${documentType} document successfully`);
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => {
          return `${err.path.join('.')}: ${err.message}`;
        });

        this.logger.error(`Validation failed for ${documentType} document: ${errors.join(', ')}`);
        return {
          success: false,
          errors,
        };
      }

      this.logger.error(`Unexpected validation error: ${(error as Error).message}`);
      return {
        success: false,
        errors: [(error as Error).message],
      };
    }
  }
}
