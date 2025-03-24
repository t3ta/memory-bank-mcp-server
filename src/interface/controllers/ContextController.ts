import { IContextController } from './interfaces/IContextController.js';
import { ReadContextUseCase, ContextRequest, ContextResult } from '../../application/usecases/common/ReadContextUseCase.js';
import { ReadRulesUseCase, RulesResult } from '../../application/usecases/common/ReadRulesUseCase.js';
import { DomainError } from '../../shared/errors/DomainError.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { BaseError } from '../../shared/errors/BaseError.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Context Controller
 * Controller for retrieving rules and context information
 */
export class ContextController implements IContextController {
  readonly _type = 'controller' as const;

  /**
   * Constructor
   * @param readContextUseCase Use case for reading context
   * @param readRulesUseCase Use case for reading rules
   */
  constructor(
    private readonly readContextUseCase: ReadContextUseCase,
    private readonly readRulesUseCase: ReadRulesUseCase
  ) { }

  /**
   * Read rules for the specified language
   * @param language Language code ('en', 'ja', 'zh')
   * @returns Rules reading result
   */
  async readRules(language: string): Promise<{
    success: boolean;
    data?: RulesResult;
    error?: string;
  }> {
    try {
      // Debug with logger
      logger.info(`Reading rules for language: ${language}`);
      const result = await this.readRulesUseCase.execute(language);
      logger.debug(`Rules retrieved successfully for language: ${language}`);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error(`Failed to read rules for language: ${language}`, error);
      return this.handleError(error);
    }
  }

  /**
   * Read context information
   * @param request Context request
   * @returns Context reading result
   */
  async readContext(request: ContextRequest): Promise<{
    success: boolean;
    data?: ContextResult;
    error?: string;
  }> {
    // Result object
    const contextResult: ContextResult = {};

    try {
      logger.info(`Reading context for branch: ${request.branch}, language: ${request.language}`);
      
      // 全ての情報を一度に読み込む（includeオプション無視して常に全て読み込む）
      try {
        // 過去のリクエストとの互換性のために記録しておく（オプション自体は実質廃止済み）
        logger.debug('All context components are always included regardless of include options.');
          
        // 全てのコンテキスト情報を一度に取得
        logger.debug(`Requesting all context information in one call`);
        const allData = await this.readContextUseCase.execute({
          branch: request.branch,
          language: request.language
        });
        
        // ブランチメモリとグローバルメモリを設定
        contextResult.branchMemory = allData.branchMemory;
        contextResult.globalMemory = allData.globalMemory;
        logger.debug(`Context data retrieved successfully for branch: ${request.branch}`);
      } catch (error) {
        logger.error(`Failed to read context for branch ${request.branch}:`, error);
        throw error;
      }
      
      // ルールを取得（別のユースケースを使用）
      try {
        logger.debug(`Requesting rules for language: ${request.language}`);
        contextResult.rules = await this.readRulesUseCase.execute(request.language);
        logger.debug(`Rules retrieved successfully for language: ${request.language}`);
      } catch (error) {
        logger.error(`Failed to read rules for language ${request.language}:`, error);
        // ルールの読み込み失敗は致命的ではないので、その他のコンテキスト情報は返す
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
   * Error handling
   * @param error Error object
   * @returns Response containing error information
   */
  private handleError(error: any): {
    success: boolean;
    error: string;
  } {
    logger.error('ContextController error details:', error instanceof Error ? error.stack : error);

    let errorMessage: string;
    let errorCode: string = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      // Check for our custom error types that extend BaseError
      if (error instanceof DomainError ||
          error instanceof ApplicationError ||
          error instanceof InfrastructureError) {
        const baseError = error as BaseError;
        errorCode = baseError.code;
        errorMessage = `${errorCode}: ${baseError.message}`;
        
        // エラータイプに応じて適切なログレベルを使用
        if (error instanceof DomainError) {
          logger.warn(`Domain error: ${errorMessage}`);
        } else if (error instanceof ApplicationError) {
          logger.error(`Application error: ${errorMessage}`);
        } else if (error instanceof InfrastructureError) {
          logger.error(`Infrastructure error: ${errorMessage}`);
        }
      } else {
        errorMessage = error.message;
        logger.error(`Generic error: ${errorMessage}`);
      }
    } else {
      errorMessage = error instanceof Error
        ? error.message
        : 'An unexpected error occurred';
      logger.error(`Unknown error type: ${errorMessage}`);
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}
