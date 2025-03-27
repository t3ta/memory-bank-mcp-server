import type { Language } from "../../schemas/v2/i18n-schema.js";
export { Language } from "../../schemas/v2/i18n-schema.js";

/**
 * Core files required for branch memory bank
 */
export const BRANCH_CORE_FILES = [
  'branchContext.md',
  'activeContext.md',
  'systemPatterns.md',
  'progress.md',
] as const;

/**
 * Core files required for global memory bank
 */
export const GLOBAL_CORE_FILES = [
  'architecture.md',
  'coding-standards.md',
  'domain-models.md',
  'glossary.md',
  'tech-stack.md',
  'user-guide.md',
] as const;

/**
 * Configuration options for setting up the memory bank
 */
export interface WorkspaceConfig {
  workspaceRoot: string;
  docsRoot: string;
  verbose: boolean;
  language: Language;
}

/**
 * Server options for the server
 */
export interface ServerOptions {
  workspace?: string;
  docsRoot?: string;
  verbose?: boolean;
  language?: Language;
}

/**
 * Result of validating a memory bank structure
 */
export interface ValidationResult {
  isValid: boolean;
  missingFiles: string[];
  errors: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}

/**
 * Types of validation errors
 *
 * Note: This enum is used in the ValidationError interface
 */
export enum ValidationErrorType {
  _MISSING_FILE = 'MISSING_FILE',
  _INVALID_CONTENT = 'INVALID_CONTENT',
  _INVALID_TAGS = 'INVALID_TAGS',
  _INVALID_PATH = 'INVALID_PATH',
  _INVALID_STRUCTURE = 'INVALID_STRUCTURE',
}

/**
 * Response content type for MCP tools
 */
export interface ToolContent {
  type: string;
  text: string;
  mimeType?: string;
}

/**
 * Response structure for MCP tools
 */
export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Generic use case interface
 */
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

/**
 * Interface for section editing options
 */
export interface SectionEditOptions {
  mode: 'replace' | 'append' | 'prepend';
  startLine?: number;
  endLine?: number;
}

/**
 * Interface for document section
 */
export interface DocumentSection {
  header: string;
  content: string | string[];
  append?: boolean;
}

/**
 * Interface for document sections object
 */
export interface DocumentSections {
  [key: string]: DocumentSection;
}
