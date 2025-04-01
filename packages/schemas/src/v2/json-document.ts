/**
 * JSON Document Schema Definitions v2 - Base and Metadata
 *
 * This file defines the base schema and common metadata for v2 JSON documents.
 * Specific document type schemas are now defined in the 'document-types' directory.
 */
import { z } from 'zod';
// import { FlexibleDateSchema, TagSchema } from '../common/schemas.js'; // Removed unused import
import { commonValidators } from '../validation-helpers.js';
// Removed import of DocumentTypes to break circular dependency

// Schema version identifier
export const SCHEMA_VERSION = 'memory_document_v2';

// Common metadata for all document types
export const DocumentMetadataV2Schema = z.object({
  // Basic identification
  title: commonValidators.nonEmptyString('title'),
  documentType: commonValidators.nonEmptyString('documentType'), // Still needed here for base validation
  id: commonValidators.uuidField('id'),
  path: commonValidators.nonEmptyString('path'),

  // Classification and organization
  tags: commonValidators.tagsArray('tags'),

  // Tracking and versioning
  lastModified: commonValidators.isoDateField('lastModified'),
  createdAt: commonValidators.isoDateField('createdAt'), // Use helper here too
  version: z.number().int().positive().default(1),
});

// Base schema that all JSON documents must conform to
export const BaseJsonDocumentV2Schema = z.object({
  schema: z.literal(SCHEMA_VERSION),
  metadata: DocumentMetadataV2Schema,
  content: z.record(z.unknown()).refine((val) => Object.keys(val).length > 0, {
    message: 'Content cannot be empty',
  }),
});

// Type exports for base and metadata
export type DocumentMetadataV2 = z.infer<typeof DocumentMetadataV2Schema>;
export type BaseJsonDocumentV2 = z.infer<typeof BaseJsonDocumentV2Schema>;

// Re-export from document-types is handled in v2/index.ts

// JsonDocumentV2Schema and its type export have been moved to document-union.ts
// to resolve circular dependencies.
