import { IUseCase } from '../../interfaces/IUseCase';
import { PullRequestDTO } from '../../dtos/PullRequestDTO';

/**
 * Input for the CreatePullRequest use case
 */
export interface CreatePullRequestInput {
  /**
   * Branch name
   */
  branch: string;
  
  /**
   * Optional custom PR title
   */
  title?: string;
  
  /**
   * Optional base branch to merge into
   */
  baseBranch?: string;
  
  /**
   * Language for PR content (en or ja)
   */
  language?: string;
}

/**
 * Output for the CreatePullRequest use case
 */
export interface CreatePullRequestOutput {
  /**
   * Pull request information
   */
  pullRequest: PullRequestDTO;
}

/**
 * Create pull request use case interface
 */
export interface ICreatePullRequestUseCase 
  extends IUseCase<CreatePullRequestInput, CreatePullRequestOutput> {}
