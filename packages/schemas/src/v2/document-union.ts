import { z } from 'zod';
// Unused import removed: SCHEMA_VERSION
// Import specific document types directly to avoid circular dependency via index
import { BranchContextJsonV2Schema } from '../document-types/branch-context.js';
import { ActiveContextJsonV2Schema } from '../document-types/active-context.js';
import { ProgressJsonV2Schema } from '../document-types/progress.js';
import { SystemPatternsJsonV2Schema } from '../document-types/system-patterns.js';
// import { GenericDocumentJsonV2Schema } from '../document-types/generic-document.js'; // Keep excluded

// Union type for discriminated union of all document types
export const JsonDocumentV2Schema = z.discriminatedUnion('documentType', [
  BranchContextJsonV2Schema,   // スキーマ全体を渡す
  ActiveContextJsonV2Schema,   // スキーマ全体を渡す
  ProgressJsonV2Schema,        // スキーマ全体を渡す
  SystemPatternsJsonV2Schema,  // スキーマ全体を渡す
  // NOTE: GenericDocumentJsonV2Schema is excluded for now as its documentType isn't a literal,
  // which is required for discriminatedUnion. Consider alternative validation if needed.
  // If Generic needs to be included, a different approach like z.union might be necessary,
  // or the Generic schema needs a literal documentType.
]);

// Export the combined union type
export type JsonDocumentV2 = z.infer<typeof JsonDocumentV2Schema>;
