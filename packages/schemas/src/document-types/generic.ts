import { z } from 'zod';
import { BaseJsonDocumentV2Schema, DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path
import { commonValidators } from '../validation-helpers.js';

// Generic document schema
export const GenericDocumentContentV2Schema = z
  .record(z.unknown())
  .refine((val) => Object.keys(val).length > 0, {
    message: 'Content cannot be empty',
  });

  // Define Generic specific metadata
  const GenericMetadataSchema = DocumentMetadataV2Schema.extend({
    // For generic documents, documentType can be any non-empty string
    documentType: commonValidators.nonEmptyString('documentType'),
  });

  // Define the full Generic schema by merging base (without metadata/content)
  // with the specific metadata and content schemas.
  export const GenericDocumentJsonV2Schema = BaseJsonDocumentV2Schema
    .omit({ metadata: true, content: true }) // Omit base metadata and content
    .merge(z.object({ // Merge with specific metadata and content
      metadata: GenericMetadataSchema,
      content: GenericDocumentContentV2Schema,
    }));

  // Type exports
  export type GenericDocumentContentV2 = z.infer<typeof GenericDocumentContentV2Schema>;
  export type GenericMetadataV2 = z.infer<typeof GenericMetadataSchema>; // Add metadata type export
export type GenericDocumentJsonV2 = z.infer<typeof GenericDocumentJsonV2Schema>;
