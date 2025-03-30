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

export const BranchContextJsonV2Schema = BaseJsonDocumentV2Schema.extend({
  metadata: DocumentMetadataV2Schema.extend({
    documentType: z.literal('branch_context'),
  }),
  content: BranchContextContentV2Schema,
});

// Type exports
export type BranchContextContentV2 = z.infer<typeof BranchContextContentV2Schema>;
export type BranchContextJsonV2 = z.infer<typeof BranchContextJsonV2Schema>;
