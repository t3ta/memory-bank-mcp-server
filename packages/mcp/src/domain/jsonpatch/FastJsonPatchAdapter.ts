// Explicitly import as ES module - stricter ESM approach
import * as jsonpatchNs from 'fast-json-patch';
// Ensure default export is obtained correctly for all environments
const jsonpatch = (jsonpatchNs.default === undefined) ? jsonpatchNs : jsonpatchNs.default;
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import { JsonPatchOperation } from './JsonPatchOperation.js';
import { JsonPatchService } from './JsonPatchService.js';

/**
 * Adapter class for integrating with the fast-json-patch library
 * Implements the JsonPatchService interface
 */
export class FastJsonPatchAdapter implements JsonPatchService {
  private readonly options?: any;

  /**
   * Constructor
   * @param options Options for the fast-json-patch library
   */
  constructor(options?: any) {
    this.options = options;
  }

  /**
   * Implementation of the apply method from JsonPatchService interface
   * @param document Target document
   * @param operations Array of operations to apply
   * @returns New document after applying operations
   */
  apply(document: any, operations: JsonPatchOperation[]): any {
    return this.applyPatch(document, operations);
  }

  /**
   * Implementation of the validate method from JsonPatchService interface
   * @param document Target document
   * @param operations Array of operations to validate
   * @returns true if operations are valid, false otherwise
   */
  validate(document: any, operations: JsonPatchOperation[]): boolean {
    const libOps = this.convertOperations(operations);
    const result = jsonpatch.validate(libOps, document);
    return result === undefined;
  }

  /**
   * Implementation of the generatePatch method from JsonPatchService interface
   * @param source Source document
   * @param target Target document
   * @returns Array of patch operations required to transform source to target
   */
  generatePatch(source: any, target: any): JsonPatchOperation[] {
    return this.compareDocuments(source, target);
  }

  /**
   * Apply patch operations to a document
   * @param document Target document
   * @param operations Array of operations to apply
   * @returns New document after applying operations
   * @throws DomainError if an error occurs during operation application
   */
  applyPatch(document: any, operations: JsonPatchOperation[]): any {
    try {
      // Convert operations to library format
      const libOps = this.convertOperations(operations);

      // Apply operations
      const result = jsonpatch.applyPatch(document, libOps, this.options);

      // fast-json-patch modifies the document by default,
      // but here we return a new object (ensure immutability)
      return result.newDocument;
    } catch (error) {
      // Convert library error to domain-specific error and throw
      // (handleLibraryError always throws, so it won't return)
      this.handleLibraryError(error);
    }
  }

  /**
   * Validate patch operations and return a report containing error information
   * @param document Target document
   * @param operations Array of operations to validate
   * @returns Array of error information (empty array if no issues)
   */
  validateWithErrors(document: any, operations: JsonPatchOperation[]): any[] {
    const libOps = this.convertOperations(operations);
    const result = jsonpatch.validate(libOps, document);

    if (result === undefined) {
      return [];
    }

    return Array.isArray(result) ? result : [result];
  }

  /**
   * Get the difference between two documents as patch operations
   * @param document1 Source document
   * @param document2 Target document
   * @returns Array of JsonPatchOperation representing the difference
   */
  compareDocuments(document1: any, document2: any): JsonPatchOperation[] {
    const diff = jsonpatch.compare(document1, document2);
    return diff.map(op => this.convertFromLibraryOperation(op));
  }

  /**
   * Convert JsonPatchOperation to fast-json-patch format
   * @param operation JsonPatchOperation to convert
   * @returns Operation object in fast-json-patch format
   */
  convertOperation(operation: JsonPatchOperation): any {
    return operation.toFastJsonPatchOperation();
  }

  /**
   * Convert multiple JsonPatchOperations to fast-json-patch format
   * @param operations Array of JsonPatchOperation to convert
   * @returns Array of operation objects in fast-json-patch format
   */
  convertOperations(operations: JsonPatchOperation[]): any[] {
    return operations.map(op => this.convertOperation(op));
  }

  /**
   * Create JsonPatchOperation from fast-json-patch format operation
   * @param libOp Operation in fast-json-patch format
   * @returns New JsonPatchOperation instance
   */
  convertFromLibraryOperation(libOp: any): JsonPatchOperation {
    return JsonPatchOperation.create(
      libOp.op,
      libOp.path,
      libOp.value,
      libOp.from
    );
  }

  /**
   * Convert library error to domain-specific error
   * @param error Error that occurred
   * @throws DomainError Converted domain error
   */
  private handleLibraryError(error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Convert to appropriate error type based on error message
    if (message.includes('Path not found')) {
      throw new DomainError(
        DomainErrorCodes.PATH_NOT_FOUND,
        `Path not found: ${message}`
      );
    }

    if (message.includes('Test failed')) {
      throw new DomainError(
        DomainErrorCodes.TEST_FAILED,
        `Test failed: ${message}`
      );
    }

    // Other errors
    throw new DomainError(
      DomainErrorCodes.JSON_PATCH_FAILED,
      `JSON patch operation failed: ${message}`
    );
  }
}
