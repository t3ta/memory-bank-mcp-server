import { z } from 'zod';
import { FlexibleDateSchema, TagSchema } from './common';

// Base metadata for all document types
export const DocumentMetadataSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  documentType: z.string().min(1, 'Document type cannot be empty'),
  path: z.string().min(1, 'Path cannot be empty'),
  tags: z.array(TagSchema).default([]),
  lastModified: FlexibleDateSchema,
});

// Base schema for all JSON documents
export const BaseJsonDocumentSchema = z.object({
  schema: z.literal('memory_document_v1'),
  metadata: DocumentMetadataSchema,
  content: z.record(z.unknown()),
});

// Branch Context document type
export const BranchContextContentSchema = z.object({
  purpose: z.string(),
  createdAt: FlexibleDateSchema,
  userStories: z
    .array(
      z.object({
        description: z.string(),
        completed: z.boolean().default(false),
      })
    )
    .default([]),
});

export const BranchContextJsonSchema = BaseJsonDocumentSchema.extend({
  metadata: DocumentMetadataSchema.extend({
    documentType: z.literal('branch_context'),
  }),
  content: BranchContextContentSchema,
});

// Active Context document type
export const ActiveContextContentSchema = z.object({
  currentWork: z.string().optional(),
  recentChanges: z.array(z.string()).default([]),
  activeDecisions: z.array(z.string()).default([]),
  considerations: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
});

export const ActiveContextJsonSchema = BaseJsonDocumentSchema.extend({
  metadata: DocumentMetadataSchema.extend({
    documentType: z.literal('active_context'),
  }),
  content: ActiveContextContentSchema,
});

// Progress document type
export const ProgressContentSchema = z.object({
  workingFeatures: z.array(z.string()).default([]),
  pendingImplementation: z.array(z.string()).default([]),
  status: z.string().optional(),
  knownIssues: z.array(z.string()).default([]),
});

export const ProgressJsonSchema = BaseJsonDocumentSchema.extend({
  metadata: DocumentMetadataSchema.extend({
    documentType: z.literal('progress'),
  }),
  content: ProgressContentSchema,
});

// Technical Decision schema for System Patterns
export const TechnicalDecisionContentSchema = z.object({
  title: z.string(),
  context: z.string(),
  decision: z.string(),
  consequences: z.array(z.string()),
});

// System Patterns document type
export const SystemPatternsContentSchema = z.object({
  technicalDecisions: z.array(TechnicalDecisionContentSchema).default([]),
});

export const SystemPatternsJsonSchema = BaseJsonDocumentSchema.extend({
  metadata: DocumentMetadataSchema.extend({
    documentType: z.literal('system_patterns'),
  }),
  content: SystemPatternsContentSchema,
});

// Union type for all document types
export const JsonDocumentSchema = z.discriminatedUnion('documentType', [
  BaseJsonDocumentSchema.extend({
    documentType: z.literal('branch_context'),
    content: BranchContextContentSchema,
  }),
  BaseJsonDocumentSchema.extend({
    documentType: z.literal('active_context'),
    content: ActiveContextContentSchema,
  }),
  BaseJsonDocumentSchema.extend({
    documentType: z.literal('progress'),
    content: ProgressContentSchema,
  }),
  BaseJsonDocumentSchema.extend({
    documentType: z.literal('system_patterns'),
    content: SystemPatternsContentSchema,
  }),
]);

// Type exports
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type BaseJsonDocument = z.infer<typeof BaseJsonDocumentSchema>;
export type BranchContextContent = z.infer<typeof BranchContextContentSchema>;
export type BranchContextJson = z.infer<typeof BranchContextJsonSchema>;
export type ActiveContextContent = z.infer<typeof ActiveContextContentSchema>;
export type ActiveContextJson = z.infer<typeof ActiveContextJsonSchema>;
export type ProgressContent = z.infer<typeof ProgressContentSchema>;
export type ProgressJson = z.infer<typeof ProgressJsonSchema>;
export type TechnicalDecisionContent = z.infer<typeof TechnicalDecisionContentSchema>;
export type SystemPatternsContent = z.infer<typeof SystemPatternsContentSchema>;
export type SystemPatternsJson = z.infer<typeof SystemPatternsJsonSchema>;
export type JsonDocument = z.infer<typeof JsonDocumentSchema>;
