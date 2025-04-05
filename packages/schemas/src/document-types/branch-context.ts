import { z } from 'zod';
import { DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path
import { commonValidators } from '../validation-helpers.js';

// Branch Context document type
export const BranchContextContentV2Schema = z.object({
  purpose: commonValidators.nonEmptyString('purpose'),
  background: z.string().optional(),
  userStories: z
    .array(
      z.object({
        description: z.string(),
        completed: z.boolean().default(false),
      })
    )
    .default([]),
}).strict(); // Add .strict()

// Define BranchContext specific metadata (documentType is now at top level)
const BranchContextMetadataSchema = DocumentMetadataV2Schema; // No need to extend for documentType anymore

// Define the full BranchContext schema
export const BranchContextJsonV2Schema = z.object({
  schema: z.literal('memory_document_v2'), // Explicitly define schema version
  documentType: z.literal('branch_context'), // Discriminator at top level
  metadata: BranchContextMetadataSchema,     // Use the updated metadata schema
  content: BranchContextContentV2Schema,      // Use the specific content schema
});


// Type exports
export type BranchContextContentV2 = z.infer<typeof BranchContextContentV2Schema>;
export type BranchContextMetadataV2 = z.infer<typeof BranchContextMetadataSchema>; // Add metadata type export
export type BranchContextJsonV2 = z.infer<typeof BranchContextJsonV2Schema>;
