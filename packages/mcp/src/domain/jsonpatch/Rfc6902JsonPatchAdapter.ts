import { applyPatch, Operation as Rfc6902Operation } from 'rfc6902'; // Import only what's available
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
      // applyPatch modifies the document in place
      applyPatch(clonedDocument, rfc6902Ops);
      // Return the modified clone
      return clonedDocument;
    } catch (error: any) {
      this.componentLogger.error('Error applying JSON Patch:', { error });
      this.handleLibraryError(error);
    }
  }

  /**
   * Validate patch operations against a document using rfc6902's applyPatch in a try-catch.
   * Note: This is a basic validation. It checks if applying the patch throws an error.
   * It might not catch all invalid scenarios, especially related to 'test' operations.
   * @param document Target document.
   * @param operations Array of operations to validate (JsonPatchOperation format).
   * @returns true if applying the patch does not throw an error, false otherwise.
   */
  validate(document: any, operations: JsonPatchOperation[]): boolean {
    const rfc6902Ops = this.convertOperationsToRfc6902(operations);
    try {
      // Try applying the patch to a clone to see if it throws
      const clonedDocument = structuredClone(document);
      applyPatch(clonedDocument, rfc6902Ops);
      return true; // No error thrown, assume valid for this basic check
    } catch (error: any) {
      this.componentLogger.warn('JSON Patch validation failed (error during apply attempt):', { error });
      return false; // Error thrown, assume invalid
    }
  }

  /**
   * Generate patch operations (diff) - Not supported by rfc6902 library directly.
   * @param source Source document.
   * @param target Target document.
   * @returns Throws an error as this operation is not supported.
   */
  generatePatch(_source: any, _target: any): JsonPatchOperation[] { // Add underscore prefix to unused parameters
    const featureName = 'generatePatch (diff)';
    this.componentLogger.error(`${featureName} is not supported by the Rfc6902JsonPatchAdapter.`);
    throw new DomainError(
      DomainErrorCodes.FEATURE_NOT_AVAILABLE, // Use FEATURE_NOT_AVAILABLE instead
      `Feature '${featureName}' is not available in this adapter.`
    );
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
  * This might only be needed if generatePatch were implemented.
  * @param rfcOp Operation in rfc6902 format.
  * @returns New JsonPatchOperation instance.
  */
  /* // Commented out as generatePatch is not implemented
  private _convertFromRfc6902Operation(rfcOp: Rfc6902Operation): JsonPatchOperation {
   // Assuming JsonPatchOperation.create can handle these properties
   // Need to cast to access potential 'value' and 'from' which are not on all Operation types
   return JsonPatchOperation.create(
     rfcOp.op,
     rfcOp.path,
     (rfcOp as any).value,
     (rfcOp as any).from
   );
 }
 */


  /**
   * Convert library error to domain-specific error.
   * @param error Error that occurred.
   * @throws DomainError Converted domain error.
   */
  private handleLibraryError(error: any): never {
    const message = error instanceof Error ? error.message : 'Unknown JSON Patch error';

    // Basic error mapping (can be expanded based on rfc6902 error types/messages)
    if (error && error.name === 'TEST_OPERATION_FAILED') { // rfc6902 might have a specific error name/code
      throw new DomainError(DomainErrorCodes.TEST_FAILED, `Test failed: ${message}`, { originalError: error });
    }
    // Check for common pointer/path errors (adjust based on actual rfc6902 errors)
    if (message.toLowerCase().includes('invalid pointer') || message.toLowerCase().includes('path') || message.toLowerCase().includes('member')) {
      throw new DomainError(DomainErrorCodes.PATH_NOT_FOUND, `Invalid path or pointer: ${message}`, { originalError: error });
    }

    // Generic fallback
    throw new DomainError(DomainErrorCodes.JSON_PATCH_FAILED, `JSON patch operation failed: ${message}`, { originalError: error });
  }
}
