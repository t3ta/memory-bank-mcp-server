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

export const ActiveContextJsonV2Schema = BaseJsonDocumentV2Schema.extend({
  metadata: DocumentMetadataV2Schema.extend({
    documentType: z.literal('active_context'),
  }),
  content: ActiveContextContentV2Schema,
});

// Type exports
export type ActiveContextContentV2 = z.infer<typeof ActiveContextContentV2Schema>;
export type ActiveContextJsonV2 = z.infer<typeof ActiveContextJsonV2Schema>;
