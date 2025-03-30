import { z } from 'zod';
import { BaseJsonDocumentV2Schema, DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path
import { commonValidators } from '../validation-helpers.js';

// Generic document schema
export const GenericDocumentContentV2Schema = z
  .record(z.unknown())
  .refine((val) => Object.keys(val).length > 0, {
    message: 'Content cannot be empty',
  });

export const GenericDocumentJsonV2Schema = BaseJsonDocumentV2Schema.extend({
  metadata: DocumentMetadataV2Schema.extend({
    documentType: commonValidators.nonEmptyString('documentType'), // Use helper
  }),
  content: GenericDocumentContentV2Schema,
});

// Type exports
export type GenericDocumentContentV2 = z.infer<typeof GenericDocumentContentV2Schema>;
export type GenericDocumentJsonV2 = z.infer<typeof GenericDocumentJsonV2Schema>;
