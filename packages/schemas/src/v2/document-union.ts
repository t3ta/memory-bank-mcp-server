import { z } from 'zod';
import { SCHEMA_VERSION } from './json-document.js'; // Import SCHEMA_VERSION
// Import specific document types directly to avoid circular dependency via index
import { BranchContextJsonV2Schema } from '../document-types/branch-context.js';
import { ActiveContextJsonV2Schema } from '../document-types/active-context.js';
import { ProgressJsonV2Schema } from '../document-types/progress.js';
import { SystemPatternsJsonV2Schema } from '../document-types/system-patterns.js';
// import { GenericDocumentJsonV2Schema } from '../document-types/generic-document.js'; // Keep excluded

// Union type for discriminated union of all document types
export const JsonDocumentV2Schema = z.discriminatedUnion('documentType', [
  // Branch Context
  z.object({
    schema: z.literal(SCHEMA_VERSION),
    metadata: BranchContextJsonV2Schema.shape.metadata,
    content: BranchContextJsonV2Schema.shape.content,
    documentType: z.literal('branch_context'), // Discriminator at top level
  }),
  // Active Context
  z.object({
    schema: z.literal(SCHEMA_VERSION),
    metadata: ActiveContextJsonV2Schema.shape.metadata,
    content: ActiveContextJsonV2Schema.shape.content,
    documentType: z.literal('active_context'), // Discriminator at top level
  }),
  // Progress
  z.object({
    schema: z.literal(SCHEMA_VERSION),
    metadata: ProgressJsonV2Schema.shape.metadata,
    content: ProgressJsonV2Schema.shape.content,
    documentType: z.literal('progress'), // Discriminator at top level
  }),
  // System Patterns
  z.object({
    schema: z.literal(SCHEMA_VERSION),
    metadata: SystemPatternsJsonV2Schema.shape.metadata,
    content: SystemPatternsJsonV2Schema.shape.content,
    documentType: z.literal('system_patterns'), // Discriminator at top level
  }),
  // NOTE: GenericDocumentJsonV2Schema is excluded for now as its documentType isn't a literal,
  // which is required for discriminatedUnion. Consider alternative validation if needed.
]);

// Export the combined union type
export type JsonDocumentV2 = z.infer<typeof JsonDocumentV2Schema>;
