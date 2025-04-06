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

export interface ReadBranchCoreFilesOutput {
  files: CoreFilesDTO;
}

export class ReadBranchCoreFilesUseCase implements IUseCase<ReadBranchCoreFilesInput, ReadBranchCoreFilesOutput> {
  private readonly ACTIVE_CONTEXT_PATH = 'activeContext.json';
  private readonly PROGRESS_PATH = 'progress.json';
  private readonly SYSTEM_PATTERNS_PATH = 'systemPatterns.json';
  private readonly BRANCH_CONTEXT_PATH = 'branchContext.json';

  constructor(private readonly branchRepository?: IBranchMemoryBankRepository) {
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
          // logger.error('Failed to auto-initialize branch', { // みらい... テストログ抑制
          //   branch: input.branchName,
          //   error: error instanceof Error ? error.message : String(error)
          // });

          throw new DomainError(
            DomainErrorCodes.BRANCH_INITIALIZATION_FAILED,
            `Failed to auto-initialize branch: ${input.branchName}`
          );
        }
      }

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
          throw error; // Known errors are re-thrown
        }
        // Unexpected errors are wrapped and thrown as ApplicationError
        // logger.error('Unexpected error reading activeContext', { path: this.ACTIVE_CONTEXT_PATH, branch: input.branchName, error }); // みらい... テストログ抑制
        throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to read activeContext: ${(error as Error).message}`, { originalError: error });
      }

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
          throw error; // Known errors are re-thrown
        }
        // Unexpected errors are wrapped and thrown as ApplicationError
        // logger.error('Unexpected error reading progress', { path: this.PROGRESS_PATH, branch: input.branchName, error }); // みらい... テストログ抑制
        throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to read progress: ${(error as Error).message}`, { originalError: error });
      }

      try {
        const doc = await this.branchRepository.getDocument(
          branchInfo,
          DocumentPath.create(this.BRANCH_CONTEXT_PATH)
        );
        if (doc) {
          coreFiles.branchContext = doc.content;
        }
      } catch (error) {
        if (error instanceof DomainError || error instanceof ApplicationError) {
          throw error; // Known errors are re-thrown
        }
        // Unexpected errors are wrapped and thrown as ApplicationError
        // logger.error('Unexpected error reading branchContext', { path: this.BRANCH_CONTEXT_PATH, branch: input.branchName, error }); // みらい... テストログ抑制
        throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to read branchContext: ${(error as Error).message}`, { originalError: error });
      }

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
          throw error; // Known errors are re-thrown
        }
        // Unexpected errors are wrapped and thrown as ApplicationError
        // logger.error('Unexpected error reading systemPatterns', { path: this.SYSTEM_PATTERNS_PATH, branch: input.branchName, error }); // みらい... テストログ抑制
        throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to read systemPatterns: ${(error as Error).message}`, { originalError: error });
      }

      // Set default value if SystemPatterns was not found
      if (!systemPatternsFound) {
        coreFiles.systemPatterns = { technicalDecisions: [] };
      }

      return { files: coreFiles };

    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // logger.error('Failed to read core files', { // みらい... テストログ抑制
      //   branch: input.branchName,
      //   error: error instanceof Error ? error.message : String(error)
      // });

      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to read core files: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
