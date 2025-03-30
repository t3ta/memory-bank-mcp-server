/**
 * JSON Document Schema Definitions v2 - Base and Metadata
 *
 * This file defines the base schema and common metadata for v2 JSON documents.
 * Specific document type schemas are now defined in the 'document-types' directory.
 */
import { z } from 'zod';
// import { FlexibleDateSchema, TagSchema } from '../common/schemas.js'; // Removed unused import
import { commonValidators } from '../validation-helpers.js';
import * as DocumentTypes from '../document-types/index.js'; // Import all document types

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

// Union type for discriminated union of all document types
// We need to define the union options explicitly here to ensure
// the discriminator 'documentType' is at the top level for zod.
export const JsonDocumentV2Schema = z.discriminatedUnion('documentType', [
  // Branch Context
  z.object({
    schema: z.literal(SCHEMA_VERSION),
    metadata: DocumentTypes.BranchContextJsonV2Schema.shape.metadata,
    content: DocumentTypes.BranchContextJsonV2Schema.shape.content,
    documentType: z.literal('branch_context'), // Discriminator at top level
  }),
  // Active Context
  z.object({
    schema: z.literal(SCHEMA_VERSION),
    metadata: DocumentTypes.ActiveContextJsonV2Schema.shape.metadata,
    content: DocumentTypes.ActiveContextJsonV2Schema.shape.content,
    documentType: z.literal('active_context'), // Discriminator at top level
  }),
  // Progress
  z.object({
    schema: z.literal(SCHEMA_VERSION),
    metadata: DocumentTypes.ProgressJsonV2Schema.shape.metadata,
    content: DocumentTypes.ProgressJsonV2Schema.shape.content,
    documentType: z.literal('progress'), // Discriminator at top level
  }),
  // System Patterns
  z.object({
    schema: z.literal(SCHEMA_VERSION),
    metadata: DocumentTypes.SystemPatternsJsonV2Schema.shape.metadata,
    content: DocumentTypes.SystemPatternsJsonV2Schema.shape.content,
    documentType: z.literal('system_patterns'), // Discriminator at top level
  }),
  // Generic Document (Needs careful handling as documentType is string)
  // For discriminated union, we might need a more specific type or handle it differently.
  // Let's keep the base structure for now, but this might need refinement.
  // z.object({
  //   schema: z.literal(SCHEMA_VERSION),
  //   metadata: DocumentTypes.GenericDocumentJsonV2Schema.shape.metadata,
  //   content: DocumentTypes.GenericDocumentJsonV2Schema.shape.content,
  //   documentType: z.string(), // Generic type might not fit well here
  // }),
  // NOTE: GenericDocumentJsonV2Schema is excluded for now as its documentType isn't a literal,
  // which is required for discriminatedUnion. Consider alternative validation if needed.
]);

// Type exports for base and metadata
export type DocumentMetadataV2 = z.infer<typeof DocumentMetadataV2Schema>;
export type BaseJsonDocumentV2 = z.infer<typeof BaseJsonDocumentV2Schema>;

// Re-export all types from document-types for convenience
export * from '../document-types/index.js';

// Export the combined union type
export type JsonDocumentV2 = z.infer<typeof JsonDocumentV2Schema>;
