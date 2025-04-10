import { BranchInfo } from '../../domain/entities/BranchInfo.js';
import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository.js';
import { IBranchMemoryBankRepository } from '../../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../domain/repositories/IGlobalMemoryBankRepository.js';
import type { IGitService } from '../../infrastructure/git/IGitService.js';
import type { IConfigProvider } from '../../infrastructure/config/interfaces/IConfigProvider.js';
import { ApplicationErrors } from '../../shared/errors/ApplicationError.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Helper service that selects the appropriate repository based on scope and branch name.
 * Also handles branch name auto-detection in project mode.
 */
export class DocumentRepositorySelector {
  private readonly componentLogger = logger.withContext({ component: 'DocumentRepositorySelector' });

  /**
   * Constructor
   * @param branchRepository Branch memory bank repository
   * @param globalRepository Global memory bank repository
   * @param gitService Git service for branch detection
   * @param configProvider Configuration provider
   */
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository,
    private readonly globalRepository: IGlobalMemoryBankRepository,
    private readonly gitService: IGitService,
    private readonly configProvider: IConfigProvider
  ) {}

  /**
   * Get the appropriate repository based on scope and branch name
   * @param scope 'branch' or 'global'
   * @param branchName Optional branch name (will be auto-detected in project mode if not provided)
   * @returns Promise resolving to repository and branch info (if applicable)
   * @throws ApplicationError if scope is invalid or branch name cannot be determined
   */
  async getRepository(scope: 'branch' | 'global', branchName?: string): Promise<{
    repository: IDocumentRepository;
    branchInfo?: BranchInfo;
  }> {
    this.componentLogger.debug(`Getting repository for scope: ${scope}`, { branchName });

    if (scope === 'global') {
      return {
        repository: this.createGlobalRepositoryAdapter(),
      };
    } else if (scope === 'branch') {
      const resolvedBranchName = await this.resolveBranchName(branchName);
      const branchInfo = BranchInfo.create(resolvedBranchName);
      
      // Check if branch exists
      const exists = await this.branchRepository.exists(branchInfo.safeName);
      if (!exists) {
        this.componentLogger.info(`Branch '${branchInfo.safeName}' does not exist. Will be initialized when used.`);
      }

      return {
        repository: this.createBranchRepositoryAdapter(branchInfo),
        branchInfo,
      };
    } else {
      throw ApplicationErrors.invalidInput(`Invalid scope: ${scope}. Must be 'branch' or 'global'.`);
    }
  }

  /**
   * Create an adapter that implements IDocumentRepository for branch repository
   * @param branchInfo Branch information
   * @returns IDocumentRepository adapter
   */
  private createBranchRepositoryAdapter(branchInfo: BranchInfo): IDocumentRepository {
    return {
      getDocument: async (path) => {
        return this.branchRepository.getDocument(branchInfo, path);
      },
      saveDocument: async (document) => {
        await this.branchRepository.saveDocument(branchInfo, document);
      },
      exists: async (identifier) => {
        return this.branchRepository.exists(identifier);
      },
      initialize: async () => {
        await this.branchRepository.initialize(branchInfo);
      },
    };
  }

  /**
   * Create an adapter that implements IDocumentRepository for global repository
   * @returns IDocumentRepository adapter
   */
  private createGlobalRepositoryAdapter(): IDocumentRepository {
    return {
      getDocument: async (path) => {
        return this.globalRepository.getDocument(path);
      },
      saveDocument: async (document) => {
        await this.globalRepository.saveDocument(document);
      },
      exists: async () => {
        return true; // Global repository always exists
      },
      initialize: async () => {
        await this.globalRepository.initialize();
      },
    };
  }

  /**
   * Resolve branch name, auto-detecting from Git in project mode if not provided
   * @param branchName Optional branch name
   * @returns Promise resolving to branch name
   * @throws ApplicationError if branch name cannot be determined
   */
  private async resolveBranchName(branchName?: string): Promise<string> {
    if (branchName) {
      return branchName;
    }
    
    const config = this.configProvider.getConfig();
    if (config.isProjectMode) {
      try {
        this.componentLogger.info('Branch name not provided in project mode, attempting to detect from Git...');
        const currentBranch = await this.gitService.getCurrentBranchName();
        this.componentLogger.info(`Current branch name automatically detected: ${currentBranch}`);
        return currentBranch;
      } catch (error) {
        this.componentLogger.error('Failed to get current branch name', { error });
        throw ApplicationErrors.invalidInput(
          'Branch name is required but could not be automatically determined. Please provide it explicitly or ensure you are in a Git repository.',
          { cause: error instanceof Error ? error : undefined }
        );
      }
    }
    
    this.componentLogger.warn('Branch name omitted outside of project mode.');
    throw ApplicationErrors.invalidInput(
      'Branch name is required when not running in project mode.'
    );
  }
}
