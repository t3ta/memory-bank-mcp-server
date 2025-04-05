import { z } from 'zod';
import { DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path
import { commonValidators } from '../validation-helpers.js';

// Technical Decision schema for System Patterns
export const TechnicalDecisionContentV2Schema = z.object({
  title: commonValidators.nonEmptyString('title'),
  context: commonValidators.nonEmptyString('context'),
  decision: commonValidators.nonEmptyString('decision'),
  consequences: z.array(z.string()).min(1, { message: '少なくとも1つの結果を提供する必要があります' }),
});

// System Patterns document type
export const SystemPatternsContentV2Schema = z.object({
  technicalDecisions: z.array(TechnicalDecisionContentV2Schema).default([]),
  implementationPatterns: z.array(z.string()).default([]), // implementationPatterns を追加
}).strict(); // Add .strict()

// Define SystemPatterns specific metadata (documentType is now at top level)
const SystemPatternsMetadataSchema = DocumentMetadataV2Schema; // No need to extend for documentType anymore

// Define the full SystemPatterns schema
export const SystemPatternsJsonV2Schema = z.object({
  schema: z.literal('memory_document_v2'), // Explicitly define schema version
  documentType: z.literal('system_patterns'), // Discriminator at top level
  metadata: SystemPatternsMetadataSchema,     // Use the updated metadata schema
  content: SystemPatternsContentV2Schema,      // Use the specific content schema
});

// Type exports
export type TechnicalDecisionContentV2 = z.infer<typeof TechnicalDecisionContentV2Schema>;
export type SystemPatternsMetadataV2 = z.infer<typeof SystemPatternsMetadataSchema>; // Add metadata type export
export type SystemPatternsContentV2 = z.infer<typeof SystemPatternsContentV2Schema>;
export type SystemPatternsJsonV2 = z.infer<typeof SystemPatternsJsonV2Schema>;
