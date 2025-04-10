import { BranchInfo } from '../../domain/entities/BranchInfo.js';
import type { IGitService } from '../../infrastructure/git/IGitService.js';
import type { IConfigProvider } from '../../infrastructure/config/interfaces/IConfigProvider.js';
import { ApplicationErrors } from '../../shared/errors/ApplicationError.js';
import { DomainError } from '../../shared/errors/DomainError.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Service responsible for resolving branch names, including auto-detection in project mode.
 */
export class BranchResolverService {
  private readonly componentLogger = logger.withContext({ component: 'BranchResolverService' });

  /**
   * Constructor
   * @param gitService Git service for branch detection
   * @param configProvider Configuration provider for mode detection
   */
  constructor(
    private readonly gitService: IGitService,
    private readonly configProvider: IConfigProvider
  ) {}

  /**
   * Resolves and validates a branch name, auto-detecting if necessary.
   * @param providedBranchName Optional branch name
   * @returns Validated branch name
   * @throws ApplicationError If branch name resolution fails
   */
  async resolveBranchName(providedBranchName?: string): Promise<string> {
    this.componentLogger.debug('Resolving branch name', { providedBranchName });

    // 空の文字列の場合、BranchInfo.createの検証エラーにする
    if (providedBranchName === '') {
      throw new DomainError(
        'DOMAIN_ERROR.INVALID_BRANCH_NAME',
        'Branch name cannot be empty'
      );
    }

    // プロジェクトモードでブランチ名が未指定の場合は自動検出を試みる
    if (!providedBranchName) {
      const config = this.configProvider.getConfig();
      
      if (config.isProjectMode) {
        this.componentLogger.info('Branch name not provided in project mode, attempting to detect current branch...');
        try {
          const currentBranch = await this.gitService.getCurrentBranchName();
          this.componentLogger.info(`Current branch name automatically detected: ${currentBranch}`);
          return currentBranch;
        } catch (error) {
          this.componentLogger.error('Failed to get current branch name', { error });
          throw ApplicationErrors.executionFailed(
            'Branch name is required but could not be automatically determined. Please provide it explicitly or ensure you are in a Git repository.',
            error instanceof Error ? error : undefined
          );
        }
      } else {
        this.componentLogger.warn('Branch name omitted outside of project mode.');
        throw ApplicationErrors.invalidInput('Branch name is required when not running in project mode.');
      }
    }

    // Validate branch name using BranchInfo domain entity
    try {
      const branchInfo = BranchInfo.create(providedBranchName);
      return branchInfo.name;
    } catch (error) {
      this.componentLogger.error('Invalid branch name provided', { providedBranchName, error });
      
      // Re-throw DomainError directly to preserve type, otherwise wrap in ApplicationError
      if (error instanceof DomainError) {
        throw error;
      }
      
      throw ApplicationErrors.invalidInput(
        `Invalid branch name: ${providedBranchName}. ${error instanceof Error ? error.message : 'Unknown error.'}`,
        { originalError: error }
      );
    }
  }
}
