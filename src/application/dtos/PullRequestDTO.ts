/**
 * Pull Request data transfer object
 */
export interface PullRequestDTO {
  /**
   * PR title
   */
  title: string;

  /**
   * Base branch to merge into
   */
  baseBranch: string;

  /**
   * Array of labels to apply to the PR
   */
  labels: string[];

  /**
   * PR content
   */
  content: string;

  /**
   * Filepath where the pull request file is saved
   */
  filePath?: string;
}
