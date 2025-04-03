/**
 * Interface for Git related services
 */
export interface IGitService {
  /**
   * Gets the current Git branch name.
   * @returns Promise resolving to the current branch name.
   * @throws Error if the current branch name cannot be determined (e.g., not in a Git repository).
   */
  getCurrentBranchName(): Promise<string>;
}
