import { JsonPatchOperation } from './JsonPatchOperation.js';

/**
 * Service interface for applying JSON Patch operations
 */
export interface JsonPatchService {
  /**
   * Apply patch operations to a document
   * @param document Target document
   * @param operations Array of operations to apply
   * @returns New document after applying operations
   */
  apply(document: any, operations: JsonPatchOperation[]): any;

  /**
   * Validate the validity of patch operations
   * @param document Target document
   * @param operations Array of operations to validate
   * @returns true if operations are valid, false otherwise
   */
  validate(document: any, operations: JsonPatchOperation[]): boolean;

  /**
   * Generate patch operations between two documents
   * @param source Source document
   * @param target Target document
   * @returns Array of patch operations required to transform source to target
   */
  generatePatch(source: any, target: any): JsonPatchOperation[];
}
