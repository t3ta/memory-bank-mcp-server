import { WorkspaceConfig, CliOptions } from '../WorkspaceConfig';
import { Language } from '../../../shared/types/index';

/**
 * Interface for configuration provider
 */
export interface IConfigProvider {
  /**
   * Initialize configuration
   * @param options CLI options
   * @returns Promise resolving to workspace config
   */
  initialize(options?: CliOptions): Promise<WorkspaceConfig>;

  /**
   * Get current configuration
   * @returns Workspace config
   */
  getConfig(): WorkspaceConfig;

  /**
   * Get global memory bank path
   * @returns Global memory bank path
   */
  getGlobalMemoryPath(): string;

  /**
   * Get branch memory bank path
   * @param branchName Branch name
   * @returns Branch memory bank path
   */
  getBranchMemoryPath(branchName: string): string;

  /**
   * Get language setting
   * @returns Language setting
   */
  getLanguage(): Language;
}
