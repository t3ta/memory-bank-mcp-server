/**
 * Schema definitions for the document index system
 * 
 * The index system provides efficient lookup for documents by:
 * - Document ID
 * - Tags
 * - Document Type
 */
import { z } from 'zod';
import { FlexibleDateSchema } from '../common.js';

// Index version identifier
export const INDEX_SCHEMA_VERSION = 'document_index_v1';

// Document reference schema (lightweight reference to a document)
export const DocumentReferenceSchema = z.object({
  id: z.string().uuid('Document ID must be a valid UUID'),
  path: z.string().min(1, 'Path cannot be empty'),
  documentType: z.string().min(1, 'Document type cannot be empty'),
  title: z.string().min(1, 'Title cannot be empty')
});

// Schema for the primary index
export const DocumentIndexSchema = z.object({
  // Index metadata
  schema: z.literal(INDEX_SCHEMA_VERSION),
  lastUpdated: FlexibleDateSchema,
  branchName: z.string().min(1, 'Branch name cannot be empty'),
  
  // ID-based index (maps document IDs to document references)
  idIndex: z.record(z.string().uuid(), DocumentReferenceSchema),
  
  // Path-based index (maps document paths to document IDs)
  pathIndex: z.record(z.string(), z.string().uuid()),
  
  // Document type index (maps document types to arrays of document IDs)
  typeIndex: z.record(z.string(), z.array(z.string().uuid())),
  
  // Tag index (maps tag values to arrays of document IDs)
  tagIndex: z.record(z.string(), z.array(z.string().uuid()))
});

// Type exports for TypeScript usage
export type DocumentReference = z.infer<typeof DocumentReferenceSchema>;
export type DocumentIndex = z.infer<typeof DocumentIndexSchema>;
