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

  /**
   * Whether the server is running in project mode (docsRoot explicitly specified)
   * @addedBy Mirai
   */
  isProjectMode: boolean;
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
