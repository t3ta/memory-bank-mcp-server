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

// Section editing schemas
export const SectionContentSchema = z.union([
  z.string(),
  z.array(z.string())
]);

export const SectionEditSchema = z.object({
  header: z.string(),
  content: SectionContentSchema,
  append: z.boolean().optional()
});

export const DocumentSectionsSchema = z.record(SectionEditSchema);

// Memory bank update schemas
export const EditModeSchema = z.enum(['replace', 'append', 'prepend']);

export const SectionEditOptionsSchema = z.object({
  mode: EditModeSchema.optional().default('replace'),
  startLine: z.number().optional(),
  endLine: z.number().optional()
});

export const ActiveContextSchema = z.object({
  currentWork: z.string().optional(),
  recentChanges: z.array(z.string()).optional(),
  activeDecisions: z.array(z.string()).optional(),
  considerations: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
  editOptions: SectionEditOptionsSchema.optional()
});

export const ProgressSchema = z.object({
  workingFeatures: z.array(z.string()).optional(),
  pendingImplementation: z.array(z.string()).optional(),
  status: z.string().optional(),
  knownIssues: z.array(z.string()).optional(),
  editOptions: SectionEditOptionsSchema.optional()
});

export const TechnicalDecisionSchema = z.object({
  title: z.string(),
  context: z.string(),
  decision: z.string(),
  consequences: z.array(z.string())
});

export const SystemPatternsSchema = z.object({
  technicalDecisions: z.array(TechnicalDecisionSchema).optional(),
  editOptions: SectionEditOptionsSchema.optional()
});

export const CoreFilesUpdateSchema = z.object({
  branch: z.string(),
  files: z.object({
    activeContext: ActiveContextSchema.optional(),
    progress: ProgressSchema.optional(),
    systemPatterns: SystemPatternsSchema.optional()
  })
});

// Recent branches schema
export const RecentBranchSchema = z.object({
  name: z.string(),
  lastModified: z.date(),
  summary: z.object({
    currentWork: z.string().optional(),
    recentChanges: z.array(z.string()).optional()
  })
});

export const GetRecentBranchesArgsSchema = z.object({
  limit: z.number().min(1).max(100).default(10)
});

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

export const BranchContextSchema = z.object({
  content: z.string()
});

export const WriteBranchCoreFilesArgsSchema = z.object({
  branch: z.string(),
  files: z.object({
    branchContext: BranchContextSchema.optional(),
    activeContext: ActiveContextSchema.optional(),
    progress: ProgressSchema.optional(),
    systemPatterns: SystemPatternsSchema.optional()
  })
}).merge(BaseToolArgsSchema);

// Type inference helpers
export type MemoryDocument = z.infer<typeof MemoryDocumentSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type ToolContent = z.infer<typeof ToolContentSchema>;
export type ToolResponse = z.infer<typeof ToolResponseSchema>;
export type ReadMemoryBankArgs = z.infer<typeof ReadMemoryBankArgsSchema>;
export type WriteMemoryBankArgs = z.infer<typeof WriteMemoryBankArgsSchema>;
export type WriteBranchCoreFilesArgs = z.infer<typeof WriteBranchCoreFilesArgsSchema>;
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type CliOptions = z.infer<typeof CliOptionsSchema>;
export type SectionEdit = z.infer<typeof SectionEditSchema>;
export type DocumentSections = z.infer<typeof DocumentSectionsSchema>;
export type RecentBranch = z.infer<typeof RecentBranchSchema>;
export type GetRecentBranchesArgs = z.infer<typeof GetRecentBranchesArgsSchema>;
export type ActiveContext = z.infer<typeof ActiveContextSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type SystemPatterns = z.infer<typeof SystemPatternsSchema>;
export type CoreFilesUpdate = z.infer<typeof CoreFilesUpdateSchema>;
export type EditMode = z.infer<typeof EditModeSchema>;
export type SectionEditOptions = z.infer<typeof SectionEditOptionsSchema>;
export type TechnicalDecision = z.infer<typeof TechnicalDecisionSchema>;
export type BranchContext = z.infer<typeof BranchContextSchema>;
