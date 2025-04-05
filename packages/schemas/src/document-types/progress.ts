import { z } from 'zod';
import { DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path

// Progress document type
import { commonValidators } from '../validation-helpers.js'; // Import commonValidators

export const ProgressContentV2Schema = z.object({
  status: commonValidators.nonEmptyString('status'), // status を必須に戻す
  completionPercentage: z.number().int().min(0).max(100), // completionPercentage を追加 (0-100)
  workingFeatures: z.array(z.string()).default([]),
  pendingImplementation: z.array(z.string()).default([]),
  currentState: z.string().optional(),
  knownIssues: z.array(z.string()).default([]),
}).strict(); // Add .strict()

// Define Progress specific metadata (documentType is now at top level)
const ProgressMetadataSchema = DocumentMetadataV2Schema; // No need to extend for documentType anymore

// Define the full Progress schema
export const ProgressJsonV2Schema = z.object({
  schema: z.literal('memory_document_v2'), // Explicitly define schema version
  documentType: z.literal('progress'), // Discriminator at top level
  metadata: ProgressMetadataSchema,     // Use the updated metadata schema
  content: ProgressContentV2Schema,      // Use the specific content schema
});

// Type exports
export type ProgressContentV2 = z.infer<typeof ProgressContentV2Schema>;
export type ProgressMetadataV2 = z.infer<typeof ProgressMetadataSchema>; // Add metadata type export
export type ProgressJsonV2 = z.infer<typeof ProgressJsonV2Schema>;
