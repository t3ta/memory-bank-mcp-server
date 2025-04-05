import { z } from 'zod';
import { BaseJsonDocumentV2Schema, DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path

// Active Context document type
export const ActiveContextContentV2Schema = z.object({
  currentWork: z.string().optional(),
  recentChanges: z.array(z.string()).default([]),
  activeDecisions: z.array(z.string()).default([]),
  considerations: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
}).strict(); // Add .strict() to disallow extra fields

// Define ActiveContext specific metadata (documentType is now at top level)
const ActiveContextMetadataSchema = DocumentMetadataV2Schema; // No need to extend for documentType anymore

// Define the full ActiveContext schema
export const ActiveContextJsonV2Schema = z.object({
  schema: z.literal('memory_document_v2'), // Explicitly define schema version
  documentType: z.literal('active_context'), // Discriminator at top level
  metadata: ActiveContextMetadataSchema,     // Use the updated metadata schema
  content: ActiveContextContentV2Schema,      // Use the specific content schema
});

// Type exports
export type ActiveContextContentV2 = z.infer<typeof ActiveContextContentV2Schema>;
export type ActiveContextMetadataV2 = z.infer<typeof ActiveContextMetadataSchema>; // Add metadata type export
export type ActiveContextJsonV2 = z.infer<typeof ActiveContextJsonV2Schema>;
