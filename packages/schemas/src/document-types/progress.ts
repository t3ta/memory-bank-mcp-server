import { z } from 'zod';
import { BaseJsonDocumentV2Schema, DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path

// Progress document type
export const ProgressContentV2Schema = z.object({
  workingFeatures: z.array(z.string()).default([]),
  pendingImplementation: z.array(z.string()).default([]),
  status: z.string().optional(),
  currentState: z.string().optional(),
  knownIssues: z.array(z.string()).default([]),
});

export const ProgressJsonV2Schema = BaseJsonDocumentV2Schema.extend({
  metadata: DocumentMetadataV2Schema.extend({
    documentType: z.literal('progress'),
  }),
  content: ProgressContentV2Schema,
});

// Type exports
export type ProgressContentV2 = z.infer<typeof ProgressContentV2Schema>;
export type ProgressJsonV2 = z.infer<typeof ProgressJsonV2Schema>;
