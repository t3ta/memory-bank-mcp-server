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
  // documentType: commonValidators.nonEmptyString('documentType'), // Removed: Moved to top level for discriminated union
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
// Base schema definition focusing on common top-level fields required for discriminated union
export const BaseJsonDocumentV2Schema = z.object({
  schema: z.literal(SCHEMA_VERSION),
  documentType: commonValidators.nonEmptyString('documentType'), // Added: Discriminator at top level
  // metadata and content are now defined within each specific document type schema
  // that merges/extends this base or defines them alongside documentType.
});

// Note: The original BaseJsonDocumentV2Schema included metadata and content directly.
// This has been changed. Specific document schemas should now incorporate
// DocumentMetadataV2Schema and their specific content schema.

// Type exports for base and metadata
export type DocumentMetadataV2 = z.infer<typeof DocumentMetadataV2Schema>;
export type BaseJsonDocumentV2 = z.infer<typeof BaseJsonDocumentV2Schema>;

// Re-export from document-types is handled in v2/index.ts

// JsonDocumentV2Schema and its type export have been moved to document-union.ts
// to resolve circular dependencies.
