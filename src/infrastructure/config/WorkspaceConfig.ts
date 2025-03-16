import { Language } from '../../shared/types/index.js';

/**
 * Workspace configuration
 */
export interface WorkspaceConfig {
  /**
   * Workspace root directory
   */
  workspaceRoot: string;

  /**
   * Memory bank root directory
   */
  memoryBankRoot: string;

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
   * Workspace root directory
   */
  workspace?: string;

  /**
   * Memory bank root directory
   */
  memoryRoot?: string;

  /**
   * Verbose logging flag
   */
  verbose?: boolean;

  /**
   * Language setting
   */
  language?: Language;
}
