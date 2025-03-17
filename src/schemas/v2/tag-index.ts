/**
 * Tag Index Schema Definitions
 *
 * This file defines the schema for the JSON-based tag index used in Memory Bank.
 * The schema is structured to provide:
 * - Efficient mapping between tags and documents
 * - Support for branch-specific and global indexes
 * - Type safety through zod validation
 */

import { z } from 'zod';
import { TagSchema, FlexibleDateSchema } from '../common.js';
import { SCHEMA_VERSION } from './json-document.js';

// Schema version identifier
export const TAG_INDEX_VERSION = 'tag_index_v1';

// Document reference within tag index
export const DocumentReferenceSchema = z.object({
  // Document identifier
  id: z.string().uuid('Document ID must be a valid UUID'),

  // Document path for quick lookup
  path: z.string().min(1, 'Path cannot be empty'),

  // Document title for display purposes
  title: z.string().min(1, 'Title cannot be empty'),

  // Last modified timestamp
  lastModified: FlexibleDateSchema,
});

// Tag entry mapping a tag to document references
export const TagEntrySchema = z.object({
  // The tag value
  tag: TagSchema,

  // List of documents containing this tag
  documents: z.array(DocumentReferenceSchema),
});

// Base schema for a tag index
export const BaseTagIndexSchema = z.object({
  // Schema version
  schema: z.literal(TAG_INDEX_VERSION),

  // Metadata
  metadata: z.object({
    // Type of index (branch or global)
    indexType: z.enum(['branch', 'global']),

    // Branch name (only for branch indexes)
    branchName: z.string().optional(),

    // Last updated timestamp
    lastUpdated: FlexibleDateSchema,

    // Number of documents indexed
    documentCount: z.number().int().nonnegative(),

    // Number of unique tags
    tagCount: z.number().int().nonnegative(),
  }),

  // Index data - mapping of tags to documents
  index: z.array(TagEntrySchema),
});

// Branch-specific tag index schema
export const BranchTagIndexSchema = BaseTagIndexSchema.extend({
  metadata: z.object({
    indexType: z.literal('branch'),
    branchName: z.string().min(1, 'Branch name cannot be empty'),
    lastUpdated: FlexibleDateSchema,
    documentCount: z.number().int().nonnegative(),
    tagCount: z.number().int().nonnegative(),
  }),
});

// Global tag index schema
export const GlobalTagIndexSchema = BaseTagIndexSchema.extend({
  metadata: z.object({
    indexType: z.literal('global'),
    lastUpdated: FlexibleDateSchema,
    documentCount: z.number().int().nonnegative(),
    tagCount: z.number().int().nonnegative(),
  }),
});

// Type exports for TypeScript usage
export type DocumentReference = z.infer<typeof DocumentReferenceSchema>;
export type TagEntry = z.infer<typeof TagEntrySchema>;
export type BaseTagIndex = z.infer<typeof BaseTagIndexSchema>;
export type BranchTagIndex = z.infer<typeof BranchTagIndexSchema>;
export type GlobalTagIndex = z.infer<typeof GlobalTagIndexSchema>;
