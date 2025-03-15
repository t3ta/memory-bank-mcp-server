import { z } from 'zod';
import { ValidationErrorType } from '../models/types.js';

// Basic schemas
export const TagSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Tag must contain only lowercase letters, numbers, and hyphens');

export const PathSchema = z
  .string()
  .min(1, 'Path cannot be empty')
  .refine(path => !path.includes('..'), 'Path cannot contain ".."')
  .refine(path => path.startsWith('/') || !path.startsWith('.'), 'Path must be absolute or relative without leading "."');

export const BranchNameSchema = z
  .string()
  .min(1, 'Branch name cannot be empty')
  .refine(
    name => name.startsWith('feature/') || name.startsWith('fix/'),
    'Branch name must start with "feature/" or "fix/"'
  );

export const LanguageSchema = z.enum(['en', 'ja']);

// Workspace configuration schemas
export const WorkspaceConfigSchema = z.object({
  workspaceRoot: PathSchema,
  memoryBankRoot: PathSchema,
  verbose: z.boolean(),
  language: LanguageSchema
});

export const CliOptionsSchema = z.object({
  workspace: PathSchema.optional(),
  memoryRoot: PathSchema.optional(),
  verbose: z.boolean().optional(),
  language: LanguageSchema.optional()
});

// Memory Document schema
export const MemoryDocumentSchema = z.object({
  path: PathSchema,
  content: z.string(),
  tags: z.array(TagSchema),
  lastModified: z.date()
});

// Validation schemas
export const ValidationErrorSchema = z.object({
  type: z.nativeEnum(ValidationErrorType),
  message: z.string(),
  path: z.string().optional(),
  details: z.record(z.unknown()).optional()
});

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  missingFiles: z.array(z.string()),
  errors: z.array(ValidationErrorSchema)
});

// Tool content and response schemas
export const ToolContentSchema = z.object({
  type: z.string(),
  text: z.string(),
  mimeType: z.string().optional()
});

export const ToolResponseSchema = z.object({
  content: z.array(ToolContentSchema),
  isError: z.boolean().optional(),
  _meta: z.record(z.unknown()).optional()
}).passthrough();

// Tool arguments schemas
export const BaseToolArgsSchema = z.object({}).passthrough();

export const ReadMemoryBankArgsSchema = z.object({
  path: PathSchema
}).merge(BaseToolArgsSchema);

export const WriteMemoryBankArgsSchema = z.object({
  path: PathSchema,
  content: z.string(),
  tags: z.array(TagSchema).optional()
}).merge(BaseToolArgsSchema);

// Branch memory bank specific schemas
export const UpdateActiveContextArgsSchema = z.object({
  currentWork: z.string().optional(),
  recentChanges: z.array(z.string()).optional(),
  activeDecisions: z.array(z.string()).optional(),
  considerations: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional()
}).merge(BaseToolArgsSchema);

export const UpdateProgressArgsSchema = z.object({
  workingFeatures: z.array(z.string()).optional(),
  pendingImplementation: z.array(z.string()).optional(),
  status: z.string().optional(),
  knownIssues: z.array(z.string()).optional()
}).merge(BaseToolArgsSchema);

export const AddTechnicalDecisionArgsSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  context: z.string().min(1, 'Context is required'),
  decision: z.string().min(1, 'Decision is required'),
  consequences: z.array(z.string()).min(1, 'At least one consequence is required')
}).merge(BaseToolArgsSchema);

export const SearchByTagsArgsSchema = z.object({
  tags: z.array(TagSchema).min(1, 'At least one tag is required')
}).merge(BaseToolArgsSchema);

// Type inference helpers
export type MemoryDocument = z.infer<typeof MemoryDocumentSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type ToolContent = z.infer<typeof ToolContentSchema>;
export type ToolResponse = z.infer<typeof ToolResponseSchema>;
export type ReadMemoryBankArgs = z.infer<typeof ReadMemoryBankArgsSchema>;
export type WriteMemoryBankArgs = z.infer<typeof WriteMemoryBankArgsSchema>;
export type UpdateActiveContextArgs = z.infer<typeof UpdateActiveContextArgsSchema>;
export type UpdateProgressArgs = z.infer<typeof UpdateProgressArgsSchema>;
export type AddTechnicalDecisionArgs = z.infer<typeof AddTechnicalDecisionArgsSchema>;
export type SearchByTagsArgs = z.infer<typeof SearchByTagsArgsSchema>;
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type CliOptions = z.infer<typeof CliOptionsSchema>;
