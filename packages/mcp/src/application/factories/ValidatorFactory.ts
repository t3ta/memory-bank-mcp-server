import { ZodDocumentValidator } from '../../infrastructure/validation/ZodDocumentValidator.js';
import { JsonDocument } from '../../domain/entities/JsonDocument.js';
import { IDocumentValidator } from '../../domain/validation/IDocumentValidator.js';

/**
 * Factory for creating validators and setting up DI
 */
export class ValidatorFactory {
  /**
   * Set up the document validator using DI
   * This method ensures the validator is created and injected into domain entities
   */
  public static setupDocumentValidator(): IDocumentValidator {
    // Create the Zod-based validator
    const validator = new ZodDocumentValidator();
    
    // Inject it into the JsonDocument entity
    JsonDocument.setValidator(validator);
    
    return validator;
  }
}
