import type { Language } from "../../schemas/v2/i18n-schema.js";


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
