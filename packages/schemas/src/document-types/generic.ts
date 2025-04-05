import { z } from 'zod';
import { BaseJsonDocumentV2Schema, DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path
import { commonValidators } from '../validation-helpers.js';

// Generic document schema
export const GenericDocumentContentV2Schema = z
  .record(z.unknown())
  .refine((val) => Object.keys(val).length > 0, {
    message: 'Content cannot be empty',
  }); // Remove .strict() as it cannot be applied after .refine() and content is generic anyway

  // Define Generic specific metadata (documentType is now at top level)
  const GenericMetadataSchema = DocumentMetadataV2Schema; // No need to extend for documentType anymore

  // Define the full Generic schema
  export const GenericDocumentJsonV2Schema = z.object({
    schema: z.literal('memory_document_v2'), // Explicitly define schema version
    // For generic documents, documentType can be any non-empty string
    documentType: commonValidators.nonEmptyString('documentType'), // Discriminator at top level (non-literal)
    metadata: GenericMetadataSchema,     // Use the updated metadata schema
    content: GenericDocumentContentV2Schema,      // Use the specific content schema
  });

  // Type exports
  export type GenericDocumentContentV2 = z.infer<typeof GenericDocumentContentV2Schema>;
  export type GenericMetadataV2 = z.infer<typeof GenericMetadataSchema>; // Add metadata type export
export type GenericDocumentJsonV2 = z.infer<typeof GenericDocumentJsonV2Schema>;
