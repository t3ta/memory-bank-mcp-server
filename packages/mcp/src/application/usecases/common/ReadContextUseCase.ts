import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import type { IBranchMemoryBankRepository } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import type { IGlobalMemoryBankRepository } from "../../../domain/repositories/IGlobalMemoryBankRepository.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import { logger } from "../../../shared/utils/logger.js";
import type { RulesResult } from "./ReadRulesUseCase.js";

export type ContextRequest = {
  branch: string;
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
    private readonly globalRepository: IGlobalMemoryBankRepository
  ) { }

  async execute(request: ContextRequest): Promise<ContextResult> {
    const { branch } = request;
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
        } catch (initError) {
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
          logger.error(`Error reading ${file}: ${error}`);
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
          logger.error(`Error reading ${path.value}: ${error}`);
        }
      }

      return result;
    } catch (error) {
      logger.error(`ReadContextUseCase error: ${error}`);
      throw error;
    }
  }
}
