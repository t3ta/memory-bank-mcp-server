import { applyPatch, createPatch, Operation as Rfc6902Operation } from 'rfc6902'; // Import rfc6902 functions
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import { JsonPatchOperation } from './JsonPatchOperation.js';
import { JsonPatchService } from './JsonPatchService.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Adapter class for integrating with the rfc6902 library.
 * Implements the JsonPatchService interface.
 */
export class Rfc6902JsonPatchAdapter implements JsonPatchService {

  private readonly componentLogger = logger.withContext({ component: 'Rfc6902JsonPatchAdapter' });

  /**
   * Apply patch operations to a document using rfc6902.
   * @param document Target document (will be cloned to ensure immutability).
   * @param operations Array of operations to apply (JsonPatchOperation format).
   * @returns New document after applying operations.
   * @throws DomainError if an error occurs during operation application.
   */
  apply(document: any, operations: JsonPatchOperation[]): any {
    const rfc6902Ops = this.convertOperationsToRfc6902(operations);
    try {
      // Use structuredClone for deep cloning (available in Node.js v17+)
      const clonedDocument = structuredClone(document);
      // applyPatch modifies the document in place and returns an array of errors
      const errors = applyPatch(clonedDocument, rfc6902Ops);
      
      // Check for errors
      const firstError = errors.find(err => err !== null);
      if (firstError) {
        this.componentLogger.error('Error applying JSON Patch:', { errors });
        throw new DomainError(
          DomainErrorCodes.JSON_PATCH_FAILED,
          `JSON patch operation failed: ${firstError.message || 'Unknown error'}`,
          { operation: firstError.operation, index: firstError.index }
        );
      }
      
      // Return the modified clone
      return clonedDocument;
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error; // Re-throw domain errors
      }
      this.componentLogger.error('Unexpected error applying JSON Patch:', { error });
      this.handleLibraryError(error);
    }
  }

  /**
   * Validate patch operations against a document.
   * Note: rfc6902 doesn't provide a direct validation function, so we apply the patch to a clone
   * and check if any errors are returned.
   * @param document Target document.
   * @param operations Array of operations to validate (JsonPatchOperation format).
   * @returns true if no errors are returned from applyPatch, false otherwise.
   */
  validate(document: any, operations: JsonPatchOperation[]): boolean {
    const rfc6902Ops = this.convertOperationsToRfc6902(operations);
    try {
      // Try applying the patch to a clone to see if it throws
      const clonedDocument = structuredClone(document);
      const errors = applyPatch(clonedDocument, rfc6902Ops);
      const valid = errors.every(err => err === null);
      
      if (!valid) {
        this.componentLogger.warn('JSON Patch validation failed:', { errors });
      }
      
      return valid;
    } catch (error: any) {
      this.componentLogger.warn('JSON Patch validation failed (unexpected error):', { error });
      return false; // Error thrown, assume invalid
    }
  }

  /**
   * Generate patch operations (diff) between two documents.
   * @param source Source document.
   * @param target Target document.
   * @returns Array of JsonPatchOperation representing the diff.
   */
  generatePatch(source: any, target: any): JsonPatchOperation[] {
    try {
      // createPatch returns an array of operations
      const diff = createPatch(source, target);
      
      // Convert rfc6902 operations to JsonPatchOperation
      return diff.map(op => this.convertFromRfc6902Operation(op));
    } catch (error: any) {
      this.componentLogger.error('Error generating JSON Patch diff:', { error });
      throw new DomainError(
        DomainErrorCodes.JSON_PATCH_FAILED,
        `Failed to generate patch diff: ${error.message || 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  /**
   * Converts internal JsonPatchOperation format to rfc6902 format.
   * @param operations Array of JsonPatchOperation.
   * @returns Array of operations in rfc6902 format.
   */
  private convertOperationsToRfc6902(operations: JsonPatchOperation[]): Rfc6902Operation[] {
    return operations.map(op => {
      // Ensure path and from are converted to strings
      const rfcOp: any = { op: op.op, path: op.path.toString() };
      if (op.value !== undefined) {
        rfcOp.value = op.value;
      }
      if (op.from !== undefined) {
        // Ensure 'from' path is also converted to string
        rfcOp.from = op.from.toString();
      }
      // Ensure the final object conforms to Rfc6902Operation type as much as possible
      return rfcOp as Rfc6902Operation;
    });
  }

  /**
   * Converts rfc6902 operation format back to internal JsonPatchOperation format.
   * @param rfcOp Operation in rfc6902 format.
   * @returns New JsonPatchOperation instance.
   */
  private convertFromRfc6902Operation(rfcOp: Rfc6902Operation): JsonPatchOperation {
    return JsonPatchOperation.create(
      rfcOp.op as JsonPatchOperation['op'],
      rfcOp.path,
      (rfcOp as any).value,
      (rfcOp as any).from
    );
  }

  /**
   * Convert library error to domain-specific error.
   * @param error Error that occurred.
   * @throws DomainError Converted domain error.
   */
  private handleLibraryError(error: any): never {
    const message = error instanceof Error ? error.message : 'Unknown JSON Patch error';

    // Basic error mapping (can be expanded based on rfc6902 error types/messages)
    if (message.toLowerCase().includes('test')) {
      throw new DomainError(DomainErrorCodes.TEST_FAILED, `Test failed: ${message}`, { originalError: error });
    }
    
    // Check for common pointer/path errors
    if (message.toLowerCase().includes('invalid pointer') || 
        message.toLowerCase().includes('path') || 
        message.toLowerCase().includes('member')) {
      throw new DomainError(DomainErrorCodes.PATH_NOT_FOUND, `Invalid path or pointer: ${message}`, { originalError: error });
    }

    // Generic fallback
    throw new DomainError(DomainErrorCodes.JSON_PATCH_FAILED, `JSON patch operation failed: ${message}`, { originalError: error });
  }
}
