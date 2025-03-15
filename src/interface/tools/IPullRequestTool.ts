import { PullRequestDTO } from '../../application/dtos/PullRequestDTO.js';

/**
 * Pull request tool interface
 */
export interface IPullRequestTool {
  /**
   * Creates a pull request based on branch memory bank information
   * 
   * @param branch Branch name
   * @param title Custom PR title (optional)
   * @param baseBranch Target branch for the PR (optional)
   * @param language Language for PR (en or ja)
   * @returns PullRequest information
   */
  createPullRequest(
    branch: string,
    title?: string,
    baseBranch?: string,
    language?: string
  ): Promise<PullRequestDTO>;
}
