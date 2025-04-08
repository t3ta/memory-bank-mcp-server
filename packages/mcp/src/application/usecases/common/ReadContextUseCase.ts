import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import type { IBranchMemoryBankRepository } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import type { IGlobalMemoryBankRepository } from "../../../domain/repositories/IGlobalMemoryBankRepository.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import { ApplicationError, ApplicationErrors } from "../../../shared/errors/ApplicationError.js"; // Import ApplicationError class and ApplicationErrors factory
import { logger } from "../../../shared/utils/logger.js";
import type { RulesResult } from "./ReadRulesUseCase.js";
// --- Add dependencies for auto-detection ---
import type { IGitService } from "../../../infrastructure/git/IGitService.js";
import type { IConfigProvider } from "../../../infrastructure/config/interfaces/IConfigProvider.js";
// --- End added dependencies ---

export type ContextRequest = {
  branch?: string; // Make branch optional in the request type
  language: string;
};

export type ContextResult = {
  rules?: RulesResult;
  branchMemory: {
    coreFiles: {
      'branchContext.json': object;
      'activeContext.json': object;
      'progress.json': object;
      'systemPatterns.json': object;
    };
    availableFiles: string[];
  };
  globalMemory: {
    coreFiles: Record<string, object>;
    availableFiles: string[];
  };
};

/**
 * Context Reading Use Case
 */
export class ReadContextUseCase {
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository,
    private readonly globalRepository: IGlobalMemoryBankRepository,
    // --- Add dependencies to constructor ---
    private readonly gitService: IGitService,
    private readonly configProvider: IConfigProvider
    // --- End added dependencies ---
  ) { }

  async execute(request: ContextRequest): Promise<ContextResult> {
    let branchNameToUse = request.branch;
    // const { language } = request; // language は現在未使用のためコメントアウト (将来的に使う可能性は残す)

    // --- Branch Auto-Detection Logic ---
    if (!branchNameToUse) {
      const config = this.configProvider.getConfig();
      if (config.isProjectMode) {
        logger.info('[ReadContextUseCase] Branch name omitted in project mode, detecting...');
        try {
          branchNameToUse = await this.gitService.getCurrentBranchName();
          logger.info(`[ReadContextUseCase] Detected branch: ${branchNameToUse}`);
        } catch (gitError) {
          logger.error('[ReadContextUseCase] Failed to detect branch', { gitError });
          throw ApplicationErrors.executionFailed(
            'Branch name is required but could not be automatically determined. Please provide it explicitly or ensure you are in a Git repository.',
            gitError instanceof Error ? gitError : undefined
          );
        }
      } else {
        // Not in project mode, branch is required
        logger.warn('[ReadContextUseCase] Branch name omitted outside project mode.');
        throw ApplicationErrors.invalidInput('Branch name is required when not running in project mode.');
      }
    }
    // --- End Branch Auto-Detection Logic ---

    // --- Validate final branch name ---
    if (!branchNameToUse || typeof branchNameToUse !== 'string' || branchNameToUse.trim() === '') {
       // This case should ideally not be reached if auto-detection or initial validation works, but as a safeguard:
       throw ApplicationErrors.invalidInput('Invalid branch name determined.');
    }
    // --- End Validation ---

    const branch = branchNameToUse; // Use the determined name
    const result: ContextResult = {
      branchMemory: {
        coreFiles: {
          'branchContext.json': {},
          'activeContext.json': {},
          'progress.json': {},
          'systemPatterns.json': {}
        },
        availableFiles: []
      },
      globalMemory: {
        coreFiles: {},
        availableFiles: []
      }
    };

    try {
      // Check branch existence
      const branchExists = await this.branchRepository.exists(branch);
      if (!branchExists) {
        try {
          const branchInfo = BranchInfo.create(branch);
          await this.branchRepository.initialize(branchInfo);
          logger.info(`[ReadContextUseCase] Auto-initialized branch: ${branch}`);
        } catch (initError) {
          logger.error(`[ReadContextUseCase] Failed to auto-initialize branch: ${branch}`, { initError });
          throw new DomainError(
            DomainErrorCodes.BRANCH_INITIALIZATION_FAILED,
            `Failed to auto-initialize branch: ${branch}`
          );
        }
      }

      // Read branch memory
      const branchInfo = BranchInfo.create(branch);
      const branchPaths = await this.branchRepository.listDocuments(branchInfo);
      result.branchMemory.availableFiles = branchPaths.map(p => p.value);

      // Read core branch files
      const coreBranchFiles = ['branchContext.json', 'activeContext.json', 'progress.json', 'systemPatterns.json'];
      for (const file of coreBranchFiles) {
        const path = DocumentPath.create(file);
        try {
          const doc = await this.branchRepository.getDocument(branchInfo, path);
          if (doc) {
            result.branchMemory.coreFiles[file as keyof typeof result.branchMemory.coreFiles] =
              JSON.parse(doc.content);
          }
        } catch (error) {
          // Log error but continue, as some core files might be optional or missing initially
          logger.warn(`[ReadContextUseCase] Error reading core branch file ${file}: ${error}`);
        }
      }

      // Read global memory
      const globalPaths = await this.globalRepository.listDocuments();
      result.globalMemory.availableFiles = globalPaths.map(p => p.value);

      const coreGlobalPaths = globalPaths.filter(p => p.value.startsWith('core/'));
      for (const path of coreGlobalPaths) {
        try {
          const doc = await this.globalRepository.getDocument(path);
          if (doc) {
            result.globalMemory.coreFiles[path.value] = JSON.parse(doc.content);
          }
        } catch (error) {
          logger.warn(`[ReadContextUseCase] Error reading core global file ${path.value}: ${error}`);
        }
      }

      return result;
    } catch (error) {
      logger.error(`ReadContextUseCase error: ${error}`);
      // Re-throw application or domain errors directly, wrap others
      if (error instanceof DomainError || error instanceof ApplicationError) { // Use ApplicationError class here
          throw error;
      }
      throw ApplicationErrors.executionFailed(`Unexpected error in ReadContextUseCase: ${(error as Error).message}`, error instanceof Error ? error : undefined);
    }
  }
}
