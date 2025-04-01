import type { Language } from "@memory-bank/schemas";



/**
 * Workspace configuration
 */
export interface WorkspaceConfig {
  /**
   * Memory bank root directory
   */
  docsRoot: string;

  /**
   * Verbose logging flag
   */
  verbose: boolean;

  /**
   * Language setting
   */
  language: Language;
}

/**
 * Command line options
 */
export interface CliOptions {
  /**
   * Memory bank root directory
   */
  docsRoot?: string;

  /**
   * Verbose logging flag
   */
  verbose?: boolean;

  /**
   * Language setting
   */
  language?: Language;
}
