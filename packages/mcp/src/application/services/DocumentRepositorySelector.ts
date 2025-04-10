import { BranchInfo } from '../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../domain/entities/MemoryDocument.js';
import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository.js';
import { IBranchMemoryBankRepository } from '../../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../domain/repositories/IGlobalMemoryBankRepository.js';
import { ApplicationErrors } from '../../shared/errors/ApplicationError.js';
import { BranchResolverService } from './BranchResolverService.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Service responsible for selecting the appropriate repository based on scope.
 * Provides a common interface for document operations regardless of whether
 * they target branch or global memory banks.
 */
export class DocumentRepositorySelector {
  private readonly componentLogger = logger.withContext({ component: 'DocumentRepositorySelector' });

  /**
   * Constructor
   * @param branchRepository Repository for branch memory bank operations
   * @param globalRepository Repository for global memory bank operations
   * @param branchResolver Service for resolving branch names
   */
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository,
    private readonly globalRepository: IGlobalMemoryBankRepository,
    private readonly branchResolver: BranchResolverService
  ) {}

  /**
   * Returns the appropriate repository based on scope and branch name
   * @param scope 'branch' or 'global'
   * @param branchName Optional branch name (required for branch scope in non-project mode)
   * @returns Repository adapter and branch info (for branch scope)
   * @throws ApplicationError if scope is invalid
   */
  async getRepository(scope: 'branch' | 'global', branchName?: string): Promise<{
    repository: IDocumentRepository;
    branchInfo?: BranchInfo;
  }> {
    this.componentLogger.debug('Getting repository', { scope, branchName });

    if (scope === 'branch') {
      // Resolve and validate branch name
      const resolvedBranchName = await this.branchResolver.resolveBranchName(branchName);
      this.componentLogger.info(`Using branch: ${resolvedBranchName}`);
      
      const branchInfo = BranchInfo.create(resolvedBranchName);

      // Create adapter for branch repository
      const repository: IDocumentRepository = {
        getDocument: async (path: DocumentPath) => {
          this.componentLogger.debug('Branch repository getDocument', { branch: branchInfo.name, path: path.value });
          return this.branchRepository.getDocument(branchInfo, path);
        },
        saveDocument: async (doc: MemoryDocument) => {
          this.componentLogger.debug('Branch repository saveDocument', { branch: branchInfo.name, path: doc.path.value });
          await this.branchRepository.saveDocument(branchInfo, doc);
        }
      };

      return { repository, branchInfo };
    } else if (scope === 'global') {
      this.componentLogger.info('Using global repository');
      
      // Create adapter for global repository
      const repository: IDocumentRepository = {
        getDocument: async (path: DocumentPath) => {
          this.componentLogger.debug('Global repository getDocument', { path: path.value });
          return this.globalRepository.getDocument(path);
        },
        saveDocument: async (doc: MemoryDocument) => {
          this.componentLogger.debug('Global repository saveDocument', { path: doc.path.value });
          await this.globalRepository.saveDocument(doc);
          // Global repositories need tag index update after document save
          await this.globalRepository.updateTagsIndex();
        }
      };

      return { repository };
    } else {
      // This should never happen with TypeScript's type safety,
      // but including for runtime safety
      this.componentLogger.error('Invalid scope provided', { scope });
      throw ApplicationErrors.invalidInput(`Invalid scope: ${scope}. Must be 'branch' or 'global'.`);
    }
  }
}
