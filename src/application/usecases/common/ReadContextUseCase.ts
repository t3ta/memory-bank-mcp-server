import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import type { IBranchMemoryBankRepository } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import type { IGlobalMemoryBankRepository } from "../../../domain/repositories/IGlobalMemoryBankRepository.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import type { RulesResult } from "./ReadRulesUseCase.js";

export type ContextRequest = {
  branch: string;
  language: string;
  includeRules?: boolean;
  includeBranchMemory?: boolean;
  includeGlobalMemory?: boolean;
  coreOnly?: boolean; // 追加: コアファイルのみを読み込むオプション
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
    const { branch, includeBranchMemory, includeGlobalMemory, coreOnly = true } = request;
    const result: ContextResult = {};

    // デバッグログを追加
    console.log(`ReadContextUseCase.execute: ${JSON.stringify(request, null, 2)}`);
      console.log(`Adding debug details: branchRepository=${this.branchRepository.constructor.name}, globalRepository=${this.globalRepository.constructor.name}`);

    try {
      // ブランチの存在確認（ブランチメモリが必要な場合のみ）
      if (includeBranchMemory) {
        console.log(`Checking branch existence: ${branch}`);
        const branchExists = await this.branchRepository.exists(branch);
        console.log(`Branch ${branch} exists: ${branchExists}`);

        if (!branchExists) {
          console.log(`Branch ${branch} not found, auto-initializing...`);
          try {
            const branchInfo = BranchInfo.create(branch);
            await this.branchRepository.initialize(branchInfo);
            console.log(`Branch ${branch} auto-initialized successfully`);
          } catch (initError) {
            console.error(`Failed to auto-initialize branch ${branch}:`, initError);
            throw new DomainError(
              DomainErrorCodes.BRANCH_INITIALIZATION_FAILED,
              `Failed to auto-initialize branch: ${branch}`
            );
          }
        }
      }

      // ブランチメモリーを読み込む
      if (includeBranchMemory) {
        console.log(`Reading branch memory for: ${branch}`);
        result.branchMemory = await this.readBranchMemory(branch);
        console.log(`Branch memory keys: ${Object.keys(result.branchMemory).join(', ')}`);
      }

      // グローバルメモリーを読み込む
      if (includeGlobalMemory) {
        console.log(`Reading global memory with coreOnly=${coreOnly}`);
        result.globalMemory = await this.readGlobalMemory(coreOnly);
        console.log(`Global memory keys: ${Object.keys(result.globalMemory || {}).join(', ')}`);
      }

      return result;
    } catch (error) {
      console.error(`ReadContextUseCase error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    console.log(`readBranchMemory paths: ${paths.map(p => p.value).join(', ')}`);

    for (const path of paths) {
      console.log(`Reading branch document: ${path.value}`);
      const document = await this.branchRepository.getDocument(branchInfo, path);
      if (document) {
        console.log(`Document found: ${path.value}`);
        result[path.value] = document.content;
      } else {
        console.log(`Document not found: ${path.value}`);
      }
    }

    return result;
  }

  /**
   * Read global memory
   * @param coreOnly Whether to read only core files
   * @returns Object with document paths as keys and content as values
   */
  private async readGlobalMemory(coreOnly: boolean = true): Promise<Record<string, string>> {
    let paths = await this.globalRepository.listDocuments();
    const result: Record<string, string> = {};
    
    // coreOnlyフラグに基づいてパスをフィルタリング
    if (coreOnly) {
      console.log('Filtering for core files only');
      paths = paths.filter(p => p.value.startsWith('core/'));
    }
    
    console.log(`readGlobalMemory paths (coreOnly=${coreOnly}): ${paths.map(p => p.value).join(', ')}`);

    for (const path of paths) {
      console.log(`Reading global document: ${path.value}`);
      const document = await this.globalRepository.getDocument(path);
      if (document) {
        console.log(`Document found: ${path.value}`);
        result[path.value] = document.content;
      } else {
        console.log(`Document not found: ${path.value}`);
      }
    }

    return result;
  }
}
