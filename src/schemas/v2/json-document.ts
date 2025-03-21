/**
 * JSON Document Schema Definitions v2
 *
 * This file defines the schema for the v2 JSON documents used in Memory Bank.
 * The schema is structured to provide:
 * - Clear separation between metadata and content
 * - Type safety through zod validation
 * - Extensibility for future document types
 * - Explicit versioning
 */
import { z } from 'zod';
import { FlexibleDateSchema, TagSchema } from '../common.js';

// Schema version identifier - used for migration and compatibility
export const SCHEMA_VERSION = 'memory_document_v2';

// Common metadata for all document types
export const DocumentMetadataV2Schema = z.object({
  // Basic identification
  title: z.string().min(1, 'Title cannot be empty'),
  documentType: z.string().min(1, 'Document type cannot be empty'),
  id: z.string().uuid('Document ID must be a valid UUID'),
  path: z.string().min(1, 'Path cannot be empty'),

  // Classification and organization
  tags: z.array(TagSchema).default([]),

  // Tracking and versioning
  lastModified: FlexibleDateSchema,
  createdAt: FlexibleDateSchema,
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

// Branch Context document type
export const BranchContextContentV2Schema = z.object({
  purpose: z.string().min(1, 'Purpose cannot be empty'),
  background: z.string().optional(),
  userStories: z
    .array(
      z.object({
        description: z.string(),
        completed: z.boolean().default(false),
      })
    )
    .default([]),
});

export const BranchContextJsonV2Schema = BaseJsonDocumentV2Schema.extend({
  metadata: DocumentMetadataV2Schema.extend({
    documentType: z.literal('branch_context'),
  }),
  content: BranchContextContentV2Schema,
});

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

// Progress document type
export const ProgressContentV2Schema = z.object({
  workingFeatures: z.array(z.string()).default([]),
  pendingImplementation: z.array(z.string()).default([]),
  status: z.string().optional(),
  currentState: z.string().optional(),
  knownIssues: z.array(z.string()).default([]),
});

export const ProgressJsonV2Schema = BaseJsonDocumentV2Schema.extend({
  metadata: DocumentMetadataV2Schema.extend({
    documentType: z.literal('progress'),
  }),
  content: ProgressContentV2Schema,
});

// Technical Decision schema for System Patterns
export const TechnicalDecisionContentV2Schema = z.object({
  title: z.string().min(1, 'Decision title cannot be empty'),
  context: z.string().min(1, 'Decision context cannot be empty'),
  decision: z.string().min(1, 'Decision details cannot be empty'),
  consequences: z.array(z.string()).min(1, 'At least one consequence must be provided'),
});

// System Patterns document type
export const SystemPatternsContentV2Schema = z.object({
  technicalDecisions: z.array(TechnicalDecisionContentV2Schema).default([]),
});

export const SystemPatternsJsonV2Schema = BaseJsonDocumentV2Schema.extend({
  metadata: DocumentMetadataV2Schema.extend({
    documentType: z.literal('system_patterns'),
  }),
  content: SystemPatternsContentV2Schema,
});

// Generic document schema
export const GenericDocumentContentV2Schema = z
  .record(z.unknown())
  .refine((val) => Object.keys(val).length > 0, {
    message: 'Content cannot be empty',
  });

export const GenericDocumentJsonV2Schema = BaseJsonDocumentV2Schema.extend({
  metadata: DocumentMetadataV2Schema.extend({
    documentType: z.string().min(1, 'Document type cannot be empty'),
  }),
  content: GenericDocumentContentV2Schema,
});

// Union type for discriminated union of all document types
export const JsonDocumentV2Schema = z
  .object({
    schema: z.literal(SCHEMA_VERSION),
    documentType: z.enum(['branch_context', 'active_context', 'progress', 'system_patterns']),
    title: z.string().min(1),
    id: z.string().uuid(),
    path: z.string().min(1),
    tags: z.array(TagSchema).default([]),
    lastModified: FlexibleDateSchema,
    createdAt: FlexibleDateSchema,
    version: z.number().int().positive().default(1),
  })
  .and(
    z.discriminatedUnion('documentType', [
      z.object({
        documentType: z.literal('branch_context'),
        purpose: z.string().min(1),
        background: z.string().optional(),
        userStories: z
          .array(
            z.object({
              description: z.string(),
              completed: z.boolean().default(false),
            })
          )
          .default([]),
      }),
      z.object({
        documentType: z.literal('active_context'),
        currentWork: z.string().optional(),
        recentChanges: z.array(z.string()).default([]),
        activeDecisions: z.array(z.string()).default([]),
        considerations: z.array(z.string()).default([]),
        nextSteps: z.array(z.string()).default([]),
      }),
      z.object({
        documentType: z.literal('progress'),
        workingFeatures: z.array(z.string()).default([]),
        pendingImplementation: z.array(z.string()).default([]),
        status: z.string().optional(),
        currentState: z.string().optional(),
        knownIssues: z.array(z.string()).default([]),
      }),
      z.object({
        documentType: z.literal('system_patterns'),
        technicalDecisions: z
          .array(
            z.object({
              title: z.string().min(1),
              context: z.string().min(1),
              decision: z.string().min(1),
              consequences: z.array(z.string()).min(1),
            })
          )
          .default([]),
      }),
    ])
  );

// Type exports for TypeScript usage
export type DocumentMetadataV2 = z.infer<typeof DocumentMetadataV2Schema>;
export type BaseJsonDocumentV2 = z.infer<typeof BaseJsonDocumentV2Schema>;

export type BranchContextContentV2 = z.infer<typeof BranchContextContentV2Schema>;
export type BranchContextJsonV2 = z.infer<typeof BranchContextJsonV2Schema>;

export type ActiveContextContentV2 = z.infer<typeof ActiveContextContentV2Schema>;
export type ActiveContextJsonV2 = z.infer<typeof ActiveContextJsonV2Schema>;

export type ProgressContentV2 = z.infer<typeof ProgressContentV2Schema>;
export type ProgressJsonV2 = z.infer<typeof ProgressJsonV2Schema>;

export type TechnicalDecisionContentV2 = z.infer<typeof TechnicalDecisionContentV2Schema>;
export type SystemPatternsContentV2 = z.infer<typeof SystemPatternsContentV2Schema>;
export type SystemPatternsJsonV2 = z.infer<typeof SystemPatternsJsonV2Schema>;

export type GenericDocumentContentV2 = z.infer<typeof GenericDocumentContentV2Schema>;
export type GenericDocumentJsonV2 = z.infer<typeof GenericDocumentJsonV2Schema>;

// All document types union
export type JsonDocumentV2 = z.infer<typeof JsonDocumentV2Schema>;
