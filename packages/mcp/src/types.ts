/**
 * Common Type Definitions
 *
 * This file contains shared type definitions used across the MCP package.
 * Most of these types are defined within this package as they aren't part
 * of the schemas package yet.
 */

import type { Language, ValidationResult, ValidationErrorType } from '@memory-bank/schemas';

export {
  ValidationResult,
  ValidationErrorType
};

export type ToolContent = {
  type: string;
  text: string;
  mimeType?: string;
};

export type ToolResponse = {
  content: ToolContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
};

export type ReadMemoryBankArgs = {
  path: string;
};

export type WriteMemoryBankArgs = {
  path: string;
  content: string;
  tags?: string[];
};

export type WriteBranchCoreFilesArgs = {
  branch: string;
  files: {
    branchContext?: { content: string; };
    activeContext?: ActiveContext;
    progress?: Progress;
    systemPatterns?: SystemPatterns;
  }
};

export type WorkspaceConfig = {
  workspaceRoot: string;
  memoryBankRoot: string;
  verbose: boolean;
  language: Language;
};

export type SectionEdit = {
  header: string;
  content: string | string[];
  append?: boolean;
};

export type DocumentSections = Record<string, SectionEdit>;

export type RecentBranch = {
  name: string;
  lastModified: Date;
  summary: {
    currentWork?: string;
    recentChanges?: string[];
  }
};

export type GetRecentBranchesArgs = {
  limit?: number;
};

export type ActiveContext = {
  currentWork?: string;
  recentChanges?: string[];
  activeDecisions?: string[];
  considerations?: string[];
  nextSteps?: string[];
  editOptions?: SectionEditOptions;
};

export type Progress = {
  workingFeatures?: string[];
  pendingImplementation?: string[];
  status?: string;
  knownIssues?: string[];
  editOptions?: SectionEditOptions;
};

export type SystemPatterns = {
  technicalDecisions?: TechnicalDecision[];
  editOptions?: SectionEditOptions;
};

export type CoreFilesUpdate = {
  branch: string;
  files: {
    activeContext?: ActiveContext;
    progress?: Progress;
    systemPatterns?: SystemPatterns;
  }
};

export type EditMode = 'replace' | 'append' | 'prepend';

export type SectionEditOptions = {
  mode?: EditMode;
  startLine?: number;
  endLine?: number;
};

export type TechnicalDecision = {
  title: string;
  context: string;
  decision: string;
  consequences: string[];
};

export type BranchContext = {
  content: string;
};
