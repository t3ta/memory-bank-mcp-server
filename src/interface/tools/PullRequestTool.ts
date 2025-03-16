import { IPullRequestTool } from './IPullRequestTool.js';
import { ICreatePullRequestUseCase } from '../../application/usecases/pr/ICreatePullRequestUseCase.js';
import { PullRequestDTO } from '../../application/dtos/PullRequestDTO.js';

/**
 * Implementation of the pull request tool
 */
export class PullRequestTool implements IPullRequestTool {
  constructor(private readonly createPullRequestUseCase: ICreatePullRequestUseCase) {}

  /**
   * Creates a pull request based on branch memory bank information
   */
  async createPullRequest(
    branch: string,
    title?: string,
    baseBranch?: string,
    language: string = 'ja',
    skipPatterns: boolean = false
  ): Promise<PullRequestDTO> {
    // Execute use case
    const result = await this.createPullRequestUseCase.execute({
      branch,
      title,
      baseBranch,
      language,
      skipPatterns,
    });

    return result.pullRequest;
  }
}
