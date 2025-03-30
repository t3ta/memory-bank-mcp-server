import { z } from 'zod';
import { BaseJsonDocumentV2Schema, DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path
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
});

// Define BranchContext specific metadata
const BranchContextMetadataSchema = DocumentMetadataV2Schema.extend({
  documentType: z.literal('branch_context'),
});

// Define the full BranchContext schema by merging base (without metadata/content)
// with the specific metadata and content schemas.
export const BranchContextJsonV2Schema = BaseJsonDocumentV2Schema
  .omit({ metadata: true, content: true }) // Omit base metadata and content
  .merge(z.object({ // Merge with specific metadata and content
    metadata: BranchContextMetadataSchema,
    content: BranchContextContentV2Schema,
  }));


// Type exports
export type BranchContextContentV2 = z.infer<typeof BranchContextContentV2Schema>;
export type BranchContextMetadataV2 = z.infer<typeof BranchContextMetadataSchema>; // Add metadata type export
export type BranchContextJsonV2 = z.infer<typeof BranchContextJsonV2Schema>;
