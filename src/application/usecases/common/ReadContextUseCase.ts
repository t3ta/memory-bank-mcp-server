import { IBranchMemoryBankRepository } from '../../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../domain/repositories/IGlobalMemoryBankRepository.js';
import { BranchInfo } from '../domain/entities/BranchInfo.js';
import { DomainError, DomainErrorCodes } from '../shared/errors/DomainError.js';
import { RulesResult } from '../.jsReadRulesUseCase.js';

export type ContextRequest = {
  branch: string;
  language: string;
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
 * コンテキスト読み込みユースケース
 */
export class ReadContextUseCase {
  /**
   * コンストラクタ
   * @param branchRepository ブランチメモリーバンクリポジトリ
   * @param globalRepository グローバルメモリーバンクリポジトリ
   */
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository,
    private readonly globalRepository: IGlobalMemoryBankRepository
  ) { }

  /**
   * 指定されたブランチとオプションに基づいてコンテキストを読み込む
   * @param request コンテキストリクエスト
   * @returns コンテキスト結果
   * @throws ブランチが存在しない場合
   */
  async execute(request: ContextRequest): Promise<ContextResult> {
    const { branch, includeBranchMemory, includeGlobalMemory } = request;
    const result: ContextResult = {};

    // デバッグログを追加
    console.log(`ReadContextUseCase.execute: ${JSON.stringify(request)}`);

    try {
      // ブランチの存在確認（ブランチメモリが必要な場合のみ）
      if (includeBranchMemory) {
        console.log(`Checking branch existence: ${branch}`);
        const branchExists = await this.branchRepository.exists(branch);
        console.log(`Branch ${branch} exists: ${branchExists}`);

        if (!branchExists) {
          throw new DomainError(
            DomainErrorCodes.BRANCH_NOT_FOUND,
            `Branch not found: ${branch}`
          );
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
        console.log(`Reading global memory`);
        result.globalMemory = await this.readGlobalMemory();
        console.log(`Global memory keys: ${Object.keys(result.globalMemory || {}).join(', ')}`);
      }

      return result;
    } catch (error) {
      console.error(`ReadContextUseCase error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * ブランチメモリーを読み込む
   * @param branchName ブランチ名
   * @returns ドキュメントパスをキー、内容を値とするオブジェクト
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
   * グローバルメモリーを読み込む
   * @returns ドキュメントパスをキー、内容を値とするオブジェクト
   */
  private async readGlobalMemory(): Promise<Record<string, string>> {
    const paths = await this.globalRepository.listDocuments();
    const result: Record<string, string> = {};

    console.log(`readGlobalMemory paths: ${paths.map(p => p.value).join(', ')}`);

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
