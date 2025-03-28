import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../shared/errors/ApplicationError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IUseCase } from '../../interfaces/IUseCase.js';
import type {
  ActiveContextDTO,
  CoreFilesDTO,
  ProgressDTO,
  SystemPatternsDTO,
} from '../../dtos/CoreFilesDTO.js';

interface ReadBranchCoreFilesInput {
  branchName: string;
}

interface ReadBranchCoreFilesOutput {
  files: CoreFilesDTO;
}

export class ReadBranchCoreFilesUseCase implements IUseCase<ReadBranchCoreFilesInput, ReadBranchCoreFilesOutput> {
  private readonly ACTIVE_CONTEXT_PATH = 'activeContext.json';
  private readonly PROGRESS_PATH = 'progress.json';
  private readonly SYSTEM_PATTERNS_PATH = 'systemPatterns.json';
  private readonly BRANCH_CONTEXT_PATH = 'branchContext.json';

  constructor(private readonly branchRepository?: IBranchMemoryBankRepository) {
    // Using shared logger instance
  }

  public async execute(input: ReadBranchCoreFilesInput): Promise<ReadBranchCoreFilesOutput> {
    if (!this.branchRepository) {
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        'Branch repository is not initialized'
      );
    }

    try {
      if (!input.branchName) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Branch name is required');
      }

      const branchInfo = BranchInfo.create(input.branchName);
      const coreFiles: CoreFilesDTO = {};
      const branchExists = await this.branchRepository.exists(input.branchName);

      if (!branchExists) {
        logger.info('Branch not found, attempting auto-initialization', {
          branch: input.branchName
        });

        try {
          await this.branchRepository.initialize(branchInfo);
        } catch (error) {
          logger.error('Failed to auto-initialize branch', {
            branch: input.branchName,
            error: error instanceof Error ? error.message : String(error)
          });

          throw new DomainError(
            DomainErrorCodes.BRANCH_INITIALIZATION_FAILED,
            `Failed to auto-initialize branch: ${input.branchName}`
          );
        }
      }

      // Active Context
      try {
        const doc = await this.branchRepository.getDocument(
          branchInfo,
          DocumentPath.create(this.ACTIVE_CONTEXT_PATH)
        );
        if (doc) {
          coreFiles.activeContext = JSON.parse(doc.content) as ActiveContextDTO;
        }
      } catch (error) {
        if (error instanceof DomainError || error instanceof ApplicationError) {
          throw error;
        }
        logger.debug('Document not found', {
          type: 'activeContext',
          path: this.ACTIVE_CONTEXT_PATH,
          branch: input.branchName
        });
      }

      // Progress
      try {
        const doc = await this.branchRepository.getDocument(
          branchInfo,
          DocumentPath.create(this.PROGRESS_PATH)
        );
        if (doc) {
          coreFiles.progress = JSON.parse(doc.content) as ProgressDTO;
        }
      } catch (error) {
        if (error instanceof DomainError || error instanceof ApplicationError) {
          throw error;
        }
        logger.debug('Document not found', {
          type: 'progress',
          path: this.PROGRESS_PATH,
          branch: input.branchName
        });
      }

      // Branch Context
      try {
        const doc = await this.branchRepository.getDocument(
          branchInfo,
          DocumentPath.create(this.BRANCH_CONTEXT_PATH)
        );
        if (doc) {
          // Branch context is expected to be a string, not JSON
          coreFiles.branchContext = doc.content;
        }
      } catch (error) {
        if (error instanceof DomainError || error instanceof ApplicationError) {
          throw error;
        }
        this.logger.debug('Document not found', {
          type: 'branchContext',
          path: this.BRANCH_CONTEXT_PATH,
          branch: input.branchName
        });
      }

      // System Patterns
      let systemPatternsFound = false;
      try {
        const doc = await this.branchRepository.getDocument(
          branchInfo,
          DocumentPath.create(this.SYSTEM_PATTERNS_PATH)
        );
        if (doc) {
          coreFiles.systemPatterns = JSON.parse(doc.content) as SystemPatternsDTO;
          systemPatternsFound = true;
        }
      } catch (error) {
        if (error instanceof DomainError || error instanceof ApplicationError) {
          throw error;
        }
        this.logger.debug('Document not found', {
          type: 'systemPatterns',
          path: this.SYSTEM_PATTERNS_PATH,
          branch: input.branchName
        });
      }

      // SystemPatternsが見つからなかった場合、デフォルト値を設定
      if (!systemPatternsFound) {
        coreFiles.systemPatterns = { technicalDecisions: [] };
      }

      return { files: coreFiles };

    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('Failed to read core files', {
        branch: input.branchName,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to read core files: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
