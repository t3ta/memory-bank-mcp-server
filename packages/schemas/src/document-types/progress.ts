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

// Define Progress specific metadata
const ProgressMetadataSchema = DocumentMetadataV2Schema.extend({
  documentType: z.literal('progress'),
});

// Define the full Progress schema by merging base (without metadata/content)
// with the specific metadata and content schemas.
export const ProgressJsonV2Schema = BaseJsonDocumentV2Schema
  .omit({ metadata: true, content: true }) // Omit base metadata and content
  .merge(z.object({ // Merge with specific metadata and content
    metadata: ProgressMetadataSchema,
    content: ProgressContentV2Schema,
  }));

// Type exports
export type ProgressContentV2 = z.infer<typeof ProgressContentV2Schema>;
export type ProgressMetadataV2 = z.infer<typeof ProgressMetadataSchema>; // Add metadata type export
export type ProgressJsonV2 = z.infer<typeof ProgressJsonV2Schema>;
