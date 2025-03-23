import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import type { IBranchMemoryBankRepository } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import type { IGlobalMemoryBankRepository } from "../../../domain/repositories/IGlobalMemoryBankRepository.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import { logger } from "../../../shared/utils/logger.js";
import type { RulesResult } from "./ReadRulesUseCase.js";

export type ContextRequest = {
  branch: string;
  language: string;
  // これらのオプションは廃止予定だが、後方互換性のために残す
  includeRules?: boolean;
  includeBranchMemory?: boolean;
  includeGlobalMemory?: boolean;
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

    // デバッグログを追加（logger使用）
    logger.debug(`ReadContextUseCase.execute: ${JSON.stringify(request, null, 2)}`);
    logger.debug(`Repository details: branchRepository=${this.branchRepository.constructor.name}, globalRepository=${this.globalRepository.constructor.name}`);

    try {
      // ブランチの存在確認 - 常に実行（includeオプション無視）
      logger.info(`Checking branch existence: ${branch}`);
      const branchExists = await this.branchRepository.exists(branch);
      logger.debug(`Branch ${branch} exists: ${branchExists}`);

      if (!branchExists) {
        logger.info(`Branch ${branch} not found, auto-initializing...`);
        try {
          const branchInfo = BranchInfo.create(branch);
          await this.branchRepository.initialize(branchInfo);
          logger.info(`Branch ${branch} auto-initialized successfully`);
        } catch (initError) {
          logger.error(`Failed to auto-initialize branch ${branch}:`, initError);
          throw new DomainError(
            DomainErrorCodes.BRANCH_INITIALIZATION_FAILED,
            `Failed to auto-initialize branch: ${branch} - ${initError instanceof Error ? initError.message : 'Unknown error'}`
          );
        }
      }

      // ブランチメモリーを読み込む - 常に実行（includeオプション無視）
      logger.info(`Reading branch memory for: ${branch}`);
      result.branchMemory = await this.readBranchMemory(branch);
      logger.debug(`Branch memory keys: ${Object.keys(result.branchMemory).join(', ')}`);

      // グローバルメモリーを読み込む - 常に実行（includeオプション無視）
      logger.info(`Reading global memory`);
      result.globalMemory = await this.readGlobalMemory();
      logger.debug(`Global memory keys: ${Object.keys(result.globalMemory || {}).join(', ')}`);
      
      // ログでincludeオプションが無視されたことを通知
      if (request.includeRules === false || request.includeBranchMemory === false || request.includeGlobalMemory === false) {
        logger.warn('Include options are deprecated and ignored. All context components are always included.');
      }

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
    const paths = await this.branchRepository.listDocuments(branchInfo);
    const result: Record<string, string> = {};

    logger.debug(`Reading branch memory paths: ${paths.map(p => p.value).join(', ')}`);

    for (const path of paths) {
      logger.debug(`Reading branch document: ${path.value}`);
      try {
        const document = await this.branchRepository.getDocument(branchInfo, path);
        if (document) {
          logger.debug(`Document found: ${path.value}`);
          result[path.value] = document.content;
        } else {
          logger.warn(`Document not found: ${path.value}`);
        }
      } catch (error) {
        logger.error(`Error reading branch document ${path.value}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // エラーは投げずに処理を続行（単一ドキュメントの失敗が全体の失敗につながらないように）
      }
    }

    return result;
  }

  /**
   * Read global memory
   * @returns Object with document paths as keys and content as values
   */
  private async readGlobalMemory(): Promise<Record<string, string>> {
    const paths = await this.globalRepository.listDocuments();
    const result: Record<string, string> = {};

    logger.debug(`Reading global memory paths: ${paths.map(p => p.value).join(', ')}`);

    for (const path of paths) {
      logger.debug(`Reading global document: ${path.value}`);
      try {
        const document = await this.globalRepository.getDocument(path);
        if (document) {
          logger.debug(`Document found: ${path.value}`);
          result[path.value] = document.content;
        } else {
          logger.warn(`Document not found: ${path.value}`);
        }
      } catch (error) {
        logger.error(`Error reading global document ${path.value}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // エラーは投げずに処理を続行（単一ドキュメントの失敗が全体の失敗につながらないように）
      }
    }

    return result;
  }
}
