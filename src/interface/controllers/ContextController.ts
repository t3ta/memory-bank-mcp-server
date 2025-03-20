import { IContextController } from '../.jsinterfaces/IContextController.js';
import { ReadContextUseCase, ContextRequest, ContextResult } from '../application/usecases/common/ReadContextUseCase.js';
import { ReadRulesUseCase, RulesResult } from '../application/usecases/common/ReadRulesUseCase.js';
import { DomainError } from '../shared/errors/DomainError.js';
import { ApplicationError } from '../shared/errors/ApplicationError.js';
import { InfrastructureError } from '../shared/errors/InfrastructureError.js';

/**
 * コンテキストコントローラー
 * ルールやコンテキスト情報を取得するためのコントローラー
 */
export class ContextController implements IContextController {
  readonly _type = 'controller' as const;

  /**
   * コンストラクタ
   * @param readContextUseCase コンテキスト読み込みユースケース
   * @param readRulesUseCase ルール読み込みユースケース
   */
  constructor(
    private readonly readContextUseCase: ReadContextUseCase,
    private readonly readRulesUseCase: ReadRulesUseCase
  ) { }

  /**
   * 指定された言語のルールを読み込む
   * @param language 言語コード ('en', 'ja', 'zh')
   * @returns ルール読み込み結果
   */
  async readRules(language: string): Promise<{
    success: boolean;
    data?: RulesResult;
    error?: string;
  }> {
    try {
      const result = await this.readRulesUseCase.execute(language);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * コンテキストを読み込む
   * @param request コンテキストリクエスト
   * @returns コンテキスト読み込み結果
   */
  async readContext(request: ContextRequest): Promise<{
    success: boolean;
    data?: ContextResult;
    error?: string;
  }> {
    // 結果オブジェクト
    const contextResult: ContextResult = {};

    try {
      // サニタイズ
      const sanitizedRequest = {
        ..request,
        // デフォルト値の設定
        includeRules: request.includeRules !== undefined ? request.includeRules : false,
        includeBranchMemory: request.includeBranchMemory !== undefined ? request.includeBranchMemory : false,
        includeGlobalMemory: request.includeGlobalMemory !== undefined ? request.includeGlobalMemory : false
      };

      // 存在しないブランチをリクエストされた場合は明示的にエラーを返す
      if (sanitizedRequest.includeBranchMemory) {
        // ブランチが存在するか確認のために簡単なテスト
        try {
          // ブランチメモリだけを対象に確認
          await this.readContextUseCase.execute({
            branch: sanitizedRequest.branch,
            language: sanitizedRequest.language,
            includeRules: false,
            includeBranchMemory: true,
            includeGlobalMemory: false
          });
        } catch (error) {
          // ブランチが存在しない場合はここでエラーになる
          return this.handleError(error);
        }
      }

      // ルールを読み込む（includeRulesが指定されている場合）
      if (sanitizedRequest.includeRules) {
        try {
          contextResult.rules = await this.readRulesUseCase.execute(sanitizedRequest.language);
        } catch (error) {
          console.error(`Failed to read rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // ルールの読み込みに失敗しても、他のコンテキストは読み込む
        }
      }

      // ブランチメモリーを読み込む場合
      if (sanitizedRequest.includeBranchMemory) {
        try {
          const branchData = await this.readContextUseCase.execute({
            branch: sanitizedRequest.branch,
            language: sanitizedRequest.language,
            includeRules: false,
            includeBranchMemory: true,
            includeGlobalMemory: false
          });
          if (branchData && branchData.branchMemory) {
            contextResult.branchMemory = branchData.branchMemory;
          }
        } catch (error) {
          console.error(`Failed to read branch memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // 既にブランチの存在チェックをしているので、ここでエラーになるのは予期しない
        }
      }

      // グローバルメモリーを読み込む場合
      if (sanitizedRequest.includeGlobalMemory) {
        try {
          const globalData = await this.readContextUseCase.execute({
            branch: sanitizedRequest.branch,
            language: sanitizedRequest.language,
            includeRules: false,
            includeBranchMemory: false,
            includeGlobalMemory: true
          });
          if (globalData && globalData.globalMemory) {
            contextResult.globalMemory = globalData.globalMemory;
          }
        } catch (error) {
          console.error(`Failed to read global memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // グローバルメモリーの読み込みが失敗した場合でもエラーを返さない
        }
      }

      return {
        success: true,
        data: contextResult
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * エラーハンドリング
   * @param error エラーオブジェクト
   * @returns エラー情報を含むレスポンス
   */
  private handleError(error: any): {
    success: boolean;
    error: string;
  } {
    console.error('ContextController error:', error);

    let errorMessage: string;

    if (
      error instanceof DomainError ||
      error instanceof ApplicationError ||
      error instanceof InfrastructureError
    ) {
      errorMessage = `${error.code}: ${error.message}`;
    } else {
      errorMessage = error instanceof Error
        ? error.message
        : 'An unexpected error occurred';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}
