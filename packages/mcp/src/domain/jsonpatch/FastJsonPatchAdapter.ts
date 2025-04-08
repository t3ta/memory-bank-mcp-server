// packages/mcp/src/domain/jsonpatch/FastJsonPatchAdapter.ts
import * as fastJsonPatch from 'fast-json-patch';
import { DomainError, DomainErrorCodes, DomainErrorCode } from '../../shared/errors/DomainError.js';
import { JsonPatchOperation } from './JsonPatchOperation.js';
import { JsonPatchService } from './JsonPatchService.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Adapter class for integrating with the fast-json-patch library.
 * Implements the JsonPatchService interface.
 */
export class FastJsonPatchAdapter implements JsonPatchService {

  private readonly componentLogger = logger.withContext({ component: 'FastJsonPatchAdapter' });

  /**
   * Apply patch operations to a document using fast-json-patch.
   * @param document Target document (will be cloned to ensure immutability).
   * @param operations Array of operations to apply (JsonPatchOperation format).
   * @returns New document after applying operations.
   * @throws DomainError if an error occurs during operation application.
   */
  apply(document: any, operations: JsonPatchOperation[]): any {
    // Implementation using fastJsonPatch.applyPatch and detailed error handling
    const patch = this.convertOperationsToFastJsonPatch(operations);
    try {
      // fast-json-patch's applyPatch returns a new document by default if mutable is false (default)
      // Pass validate = true to enable internal validation before applying
      const result = fastJsonPatch.applyPatch(document, patch, true, false); // validate = true, mutable = false
      this.componentLogger.debug('Patch applied successfully');
      return result.newDocument;
    } catch (error: any) {
       this.componentLogger.error('Error applying JSON Patch:', { operations: operations.map(op => op.toJSON()), error });
       // fast-json-patch throws JsonPatchError which might contain the index
       this.handleLibraryError(error, operations);
    }
  }

  /**
   * Validate patch operations against a document using fast-json-patch's validate function.
   * @param document Target document.
   * @param operations Array of operations to validate (JsonPatchOperation format).
   * @returns true if the patch is valid, false otherwise.
   * @throws DomainError if validation itself fails unexpectedly.
   */
  validate(document: any, operations: JsonPatchOperation[]): boolean {
    const patch = this.convertOperationsToFastJsonPatch(operations);
    try {
      // fastJsonPatch.validate returns the first error object if invalid, or undefined if valid
      const validationError = fastJsonPatch.validate(patch, document);
      if (validationError) {
          // Log the validation error found
          this.componentLogger.warn('JSON Patch validation failed:', { error: validationError });
          // Return false as the patch is invalid
          return false;
      }
      this.componentLogger.debug('Patch validation successful');
      return true; // No errors found
    } catch (error: any) {
        // This catch block is for unexpected errors during the validation process itself
        this.componentLogger.error('Unexpected error during JSON Patch validation:', { error });
        // Throw an error to indicate a problem with the validation process
         throw new DomainError(
             DomainErrorCodes.UNEXPECTED_ERROR,
             `Unexpected error during patch validation: ${error.message}`,
             { originalError: error }
         );
    }
  }

  /**
   * Generate patch operations (diff) between two documents using fast-json-patch's compare function.
   * @param source Source document.
   * @param target Target document.
   * @returns Array of JsonPatchOperation representing the diff.
   */
  generatePatch(source: any, target: any): JsonPatchOperation[] {
    try {
      const diff = fastJsonPatch.compare(source, target);
      this.componentLogger.debug('Patch generated successfully', { diff });
      // Convert fast-json-patch operations back to our internal format
      return this.convertFromFastJsonPatch(diff);
    } catch (error: any) {
        this.componentLogger.error('Error generating JSON Patch diff:', { error });
        throw new DomainError(
            DomainErrorCodes.JSON_PATCH_FAILED, // Or a more specific code?
            `Failed to generate patch diff: ${error.message}`,
            { originalError: error }
        );
    }
  }

  /**
   * Converts internal JsonPatchOperation format to fast-json-patch format.
   * Needs to handle potential undefined 'value' or 'from'.
   */
  private convertOperationsToFastJsonPatch(operations: JsonPatchOperation[]): fastJsonPatch.Operation[] {
     // JsonPatchOperation needs a method to convert itself to the fast-json-patch format
     // Let's assume JsonPatchOperation.toFastJsonPatchOperation() exists and handles this.
     return operations.map(op => op.toFastJsonPatchOperation());
  }

   /**
   * Converts fast-json-patch operation format back to internal JsonPatchOperation format.
   */
  private convertFromFastJsonPatch(patch: fastJsonPatch.Operation[]): JsonPatchOperation[] {
      // Need to handle potential undefined 'value' or 'from' when creating JsonPatchOperation
      return patch.map(op => JsonPatchOperation.create(
          op.op as JsonPatchOperation['op'], // Cast needed, ensure op types align
          op.path,
          (op as any).value, // Use type assertion to access potentially missing property
          (op as any).from   // Use type assertion to access potentially missing property
      ));
  }


  /**
   * Convert library error (fast-json-patch JsonPatchError) to domain-specific error.
   */
  private handleLibraryError(error: any, operations: JsonPatchOperation[]): never {
    const originalMessage = error instanceof Error ? error.message : 'Unknown JSON Patch error';
    let detailedMessage = `JSON patch operation failed: ${originalMessage}`;
    let errorCode: DomainErrorCode = DomainErrorCodes.JSON_PATCH_FAILED;
    const context: Record<string, any> = {
        originalError: error,
        operations: operations.map(op => op.toJSON()) // Include original operations for context
    };

    // Check if it's a fast-json-patch specific error
    if (error instanceof fastJsonPatch.JsonPatchError) {
        context.errorName = error.name; // e.g., "OPERATION_PATH_UNRESOLVABLE"
        context.errorIndex = error.index; // Index of the failing operation in the patch array
        context.failingOperationInput = error.operation; // The operation object that failed

        const failingOpIndex = error.index;
        detailedMessage = `JSON patch failed at operation index ${failingOpIndex}: ${error.message}`;

        // Try to get the corresponding original operation for better context
        if (failingOpIndex !== undefined && failingOpIndex >= 0 && failingOpIndex < operations.length) {
            const failingOp = operations[failingOpIndex];
            context.failingOperation = failingOp.toJSON();
            detailedMessage = `JSON patch failed at operation index ${failingOpIndex} (${failingOp.op} ${failingOp.path.toString()}): ${error.message}`;
        } else {
             // Sometimes index might not be available or valid
             detailedMessage = `JSON patch failed: ${error.message}`;
        }


        // Map specific fast-json-patch error names to our DomainErrorCodes
        switch (error.name) {
            case 'TEST_OPERATION_FAILED':
                errorCode = DomainErrorCodes.TEST_FAILED;
                break;
            case 'OPERATION_PATH_UNRESOLVABLE': // Path for op (add, replace, remove, test) doesn't exist
            case 'OPERATION_PATH_INVALID': // Path format is wrong
            // case 'OPERATION_PATH_CANNOT_BE_AUTOCREATED': // Cannot create intermediate paths (Seems not a standard error name)
                errorCode = DomainErrorCodes.PATH_NOT_FOUND; // Or INVALID_JSON_PATH?
                break;
            case 'OPERATION_FROM_UNRESOLVABLE': // 'from' path for move/copy doesn't exist
                errorCode = DomainErrorCodes.PATH_NOT_FOUND;
                 // Add specific 'from' path to context if possible
                 if (error.operation && error.operation.from) {
                    context.problematicFromPath = error.operation.from;
                    detailedMessage += ` (source path: ${error.operation.from})`;
                 }
                break;
            case 'OPERATION_VALUE_REQUIRED': // e.g., add needs value
            case 'OPERATION_VALUE_CANNOT_CONTAIN_UNDEFINED': // Value contains undefined
                errorCode = DomainErrorCodes.INVALID_OPERATION; // Or a more specific INVALID_VALUE code?
                break;
            // Add more specific mappings based on fast-json-patch error names
            // e.g., OPERATION_OP_INVALID, OPERATION_FROM_REQUIRED, etc.
            default:
                errorCode = DomainErrorCodes.JSON_PATCH_FAILED;
        }
    } else if (originalMessage.toLowerCase().includes('path') || originalMessage.toLowerCase().includes('pointer')) {
         // Fallback for generic path errors if not caught by specific types
         errorCode = DomainErrorCodes.PATH_NOT_FOUND;
    }


    this.componentLogger.error('Detailed JSON Patch Error:', { errorCode, detailedMessage, context });
    // Throw the enhanced DomainError
    throw new DomainError(errorCode, detailedMessage, context);
  }
}
