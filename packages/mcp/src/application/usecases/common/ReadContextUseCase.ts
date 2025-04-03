import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
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
  branchMemory?: Record<string, string>;
  globalMemory?: Record<string, string>;
};

/**
 * Context Reading Use Case
 */
export class ReadContextUseCase {
  /**
   * Constructor
   * @param branchRepository Branch memory bank repository
   * @param globalRepository Global memory bank repository
   */
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository,
    private readonly globalRepository: IGlobalMemoryBankRepository
  ) { }

  /**
   * Read context based on specified branch and options
   * @param request Context request
   * @returns Context result
   * @throws When branch does not exist
   */
  async execute(request: ContextRequest): Promise<ContextResult> {
    const { branch } = request;
    const result: ContextResult = {};

    // Add debug log (using logger)
    logger.debug(`ReadContextUseCase.execute: ${JSON.stringify(request, null, 2)}`);
    logger.debug(`Repository details: branchRepository=${this.branchRepository.constructor.name}, globalRepository=${this.globalRepository.constructor.name}`);
    logger.debug('Entering try block in ReadContextUseCase.execute'); // Added log

    try {
      // Check branch existence
      logger.info(`Checking branch existence: ${branch}`);
      const branchExists = await this.branchRepository.exists(branch);
      logger.debug(`Branch ${branch} exists: ${branchExists}`);
      logger.debug('Finished checking branch existence'); // Added log

      if (!branchExists) {
        logger.info(`Branch ${branch} not found, attempting auto-initialization...`); // Modified log
        try {
          const branchInfo = BranchInfo.create(branch);
          logger.debug('Calling branchRepository.initialize...'); // Added log
          await this.branchRepository.initialize(branchInfo);
          logger.info(`Branch ${branch} auto-initialized successfully`);
          logger.debug('Finished branchRepository.initialize'); // Added log
        } catch (initError) {
          logger.error(`Failed to auto-initialize branch ${branch}:`, initError);
          throw new DomainError(
            DomainErrorCodes.BRANCH_INITIALIZATION_FAILED,
            `Failed to auto-initialize branch: ${branch} - ${initError instanceof Error ? initError.message : 'Unknown error'}`
          );
        }
      }

      // Read branch memory
      logger.info(`Reading branch memory for: ${branch}`);
      logger.debug('Calling readBranchMemory...'); // Added log
      result.branchMemory = await this.readBranchMemory(branch);
      logger.debug(`Branch memory keys: ${Object.keys(result.branchMemory).join(', ')}`);
      logger.debug('Finished readBranchMemory'); // Added log

      // Read global memory (core files only)
      logger.info(`Reading global memory (core files only)`);
      logger.debug('Calling readGlobalMemory...'); // Added log
      result.globalMemory = await this.readGlobalMemory();
      logger.debug(`Global memory keys: ${Object.keys(result.globalMemory || {}).join(', ')}`);
      logger.debug('Finished readGlobalMemory'); // Added log

      logger.debug('Exiting try block in ReadContextUseCase.execute successfully'); // Added log
      return result;
    } catch (error) {
      logger.error(`ReadContextUseCase error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error(`Error details: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
      throw error;
    }
  }

  /**
   * Read branch memory
   * @param branchName Branch name
   * @returns Object with document paths as keys and content as values
   */
  private async readBranchMemory(branchName: string): Promise<Record<string, string>> {
    const branchInfo = BranchInfo.create(branchName);
    logger.debug('Calling branchRepository.listDocuments...'); // Added log
    // --- みらい：ファイルシステム反映のための短い待機を追加 (テスト失敗対応) ---
    await new Promise(resolve => setTimeout(resolve, 50)); // 50ms待機
    // --- みらい：ここまで ---
    const paths = await this.branchRepository.listDocuments(branchInfo);
    logger.debug('Finished branchRepository.listDocuments'); // Added log
    // Debug log removed by Mirai
    const result: Record<string, string> = {};
    logger.debug(`Reading branch memory paths: ${paths.map(p => p.value).join(', ')}`);

    for (const path of paths) {
      logger.debug(`Reading branch document: ${path.value}`);
      try {
        logger.debug('Calling branchRepository.getDocument...'); // Added log
        const document = await this.branchRepository.getDocument(branchInfo, path);
        logger.debug('Finished branchRepository.getDocument'); // Added log
        if (document) {
          logger.debug(`Document found: ${path.value}`);
          result[path.value] = document.content;
        } else {
          logger.warn(`Document not found: ${path.value}`);
        }
      } catch (error) {
        logger.error(`Error reading branch document ${path.value}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue processing even if a single document fails
      }
    }

    return result;
  }

  /**
   * Read global memory (core files only)
   * @returns Object with document paths as keys and content as values
   */
  private async readGlobalMemory(): Promise<Record<string, string>> {
    logger.debug('Calling globalRepository.listDocuments...'); // Added log
    let paths = await this.globalRepository.listDocuments();
    logger.debug('Finished globalRepository.listDocuments'); // Added log
    const result: Record<string, string> = {};

    // Filter for core files only
    logger.debug('Filtering for core files only');
    paths = paths.filter(p => p.value.startsWith('core/'));

    logger.debug(`Reading global memory paths: ${paths.map(p => p.value).join(', ')}`);

    for (const path of paths) {
      logger.debug(`Reading global document: ${path.value}`);
      try {
        logger.debug('Calling globalRepository.getDocument...'); // Added log
        const document = await this.globalRepository.getDocument(path);
        logger.debug('Finished globalRepository.getDocument'); // Added log
        if (document) {
          logger.debug(`Document found: ${path.value}`);
          result[path.value] = document.content;
        } else {
          logger.warn(`Document not found: ${path.value}`);
        }
      } catch (error) {
        logger.error(`Error reading global document ${path.value}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue processing even if a single document fails
      }
    }

    return result;
  }
}
