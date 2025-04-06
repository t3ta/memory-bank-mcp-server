import type { ContextRequest, ContextResult, RulesResult } from "../../application/usecases/types.js";
import { ReadContextUseCase } from "../../application/usecases/common/ReadContextUseCase.js";
import { ReadRulesUseCase } from "../../application/usecases/common/ReadRulesUseCase.js";
import { ApplicationError } from "../../shared/errors/ApplicationError.js";
import { DomainError } from "../../shared/errors/DomainError.js";
import { InfrastructureError } from "../../shared/errors/InfrastructureError.js";
import { logger } from "../../shared/utils/logger.js";
import type { IContextController } from "./interfaces/IContextController.js";

/**
 * Context Controller
 * Controller for retrieving rules and context information
 */
export class ContextController implements IContextController {
  readonly _type = "controller" as const;

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
    const contextResult: ContextResult = {};

    try {
      logger.info(`Reading context for branch: ${request.branch}, language: ${request.language}`);

      // Read all information at once (ignore include options, always read everything)
      try {
        // Log for compatibility with past requests (options themselves are effectively deprecated)
        logger.debug('All context components are always included regardless of include options.');

        // Get all context information in one call
        logger.debug(`Requesting all context information in one call`);
        const allData = await this.readContextUseCase.execute({
          branch: request.branch,
          language: request.language
        });

        // Set branch and global memory
        contextResult.branchMemory = allData.branchMemory;
        contextResult.globalMemory = allData.globalMemory;
        logger.debug(`Context data retrieved successfully for branch: ${request.branch}`);
      } catch (error) {
        logger.error(`Failed to read context for branch ${request.branch}:`, error);
        throw error;
      }

      // Get rules (using a separate use case)
      try {
        // console.error(`[CONSOLE_ERROR_MIRAILOG] Requesting rules for language: ${request.language}`); // みらい... デバッグログ削除
        // logger.debug(`Requesting rules for language: ${request.language}`);
        const rulesResult = await this.readRulesUseCase.execute(request.language);
        // console.error('[CONSOLE_ERROR_MIRAILOG] Result from readRulesUseCase.execute:', { rulesResult: rulesResult ? { ...rulesResult, content: rulesResult.content.substring(0, 100) + '...' } : 'null' }); // みらい... デバッグログ削除
        // logger.debug('Result from readRulesUseCase.execute:', { rulesResult });
        contextResult.rules = rulesResult;
        // logger.debug(`Rules assigned to contextResult for language: ${request.language}`);
        // console.error(`[CONSOLE_ERROR_MIRAILOG] Rules assigned to contextResult for language: ${request.language}`); // みらい... デバッグログ削除
      } catch (error) {
        // console.error(`[CONSOLE_ERROR_MIRAILOG] Failed to read rules for language ${request.language}:`, error); // みらい... デバッグログ削除
        // logger.error(`Failed to read rules for language ${request.language}:`, error);
        // Failure to read rules is not fatal, return other context information // ★★★ エラーを握りつぶすように戻す ★★★
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
      if (
        error instanceof DomainError ||
        error instanceof ApplicationError ||
        error instanceof InfrastructureError
      ) {
        errorCode = error.code;
        errorMessage = `${errorCode}: ${error.message}`;

        // Use appropriate log level based on error type
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
      errorMessage = 'An unexpected error occurred';
      logger.error(`Unknown error type: ${errorMessage}`);
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}
