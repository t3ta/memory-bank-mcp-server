import { z } from 'zod';
import { BaseJsonDocumentV2Schema, DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path

// Active Context document type
export const ActiveContextContentV2Schema = z.object({
  currentWork: z.string().optional(),
  recentChanges: z.array(z.string()).default([]),
  activeDecisions: z.array(z.string()).default([]),
  considerations: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
});

// Define ActiveContext specific metadata
const ActiveContextMetadataSchema = DocumentMetadataV2Schema.extend({
  documentType: z.literal('active_context'),
});

// Define the full ActiveContext schema by merging base (without metadata/content)
// with the specific metadata and content schemas.
export const ActiveContextJsonV2Schema = BaseJsonDocumentV2Schema
  .omit({ metadata: true, content: true }) // Omit base metadata and content
  .merge(z.object({ // Merge with specific metadata and content
    metadata: ActiveContextMetadataSchema,
    content: ActiveContextContentV2Schema,
  }));

// Type exports
export type ActiveContextContentV2 = z.infer<typeof ActiveContextContentV2Schema>;
export type ActiveContextMetadataV2 = z.infer<typeof ActiveContextMetadataSchema>; // Add metadata type export
export type ActiveContextJsonV2 = z.infer<typeof ActiveContextJsonV2Schema>;
