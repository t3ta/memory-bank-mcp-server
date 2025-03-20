import { IContextController } from './interfaces/IContextController.js';
import { ReadContextUseCase, ContextRequest, ContextResult } from '../../application/usecases/common/ReadContextUseCase.js';
import { ReadRulesUseCase, RulesResult } from '../../application/usecases/common/ReadRulesUseCase.js';
import { DomainError } from '../../shared/errors/DomainError.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { BaseError } from '../../shared/errors/BaseError.js';

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
      // Debug
      console.log('Reading rules for language:', language);
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
      // Sanitize
      const sanitizedRequest = {
        ...request,
        // Set default values
        includeRules: request.includeRules !== undefined ? request.includeRules : false,
        includeBranchMemory: request.includeBranchMemory !== undefined ? request.includeBranchMemory : false,
        includeGlobalMemory: request.includeGlobalMemory !== undefined ? request.includeGlobalMemory : false
      };

      // Return an explicit error if a non-existent branch is requested
      if (sanitizedRequest.includeBranchMemory) {
        // Simple test to check if the branch exists
        try {
          // Check only against branch memory
          await this.readContextUseCase.execute({
            branch: sanitizedRequest.branch,
            language: sanitizedRequest.language,
            includeRules: false,
            includeBranchMemory: true,
            includeGlobalMemory: false
          });
        } catch (error) {
          // Error occurs here if the branch doesn't exist
          return this.handleError(error);
        }
      }

      // Load rules (if includeRules is specified)
      if (sanitizedRequest.includeRules) {
        try {
          contextResult.rules = await this.readRulesUseCase.execute(sanitizedRequest.language);
        } catch (error) {
          console.error(`Failed to read rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue loading other contexts even if rules loading fails
        }
      }

      // Load branch memory if requested
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
          // Unexpected error since we've already checked branch existence
        }
      }

      // Load global memory if requested
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
          // Don't return an error even if global memory loading fails
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
   * Error handling
   * @param error Error object
   * @returns Response containing error information
   */
  private handleError(error: any): {
    success: boolean;
    error: string;
  } {
    console.error('ContextController error DETAILS:', error instanceof Error ? error.stack : error);

    let errorMessage: string;

    if (error instanceof Error) {
      // Check for our custom error types that extend BaseError
      if (error instanceof DomainError ||
          error instanceof ApplicationError ||
          error instanceof InfrastructureError) {
        const baseError = error as BaseError;
        errorMessage = `${baseError.code}: ${baseError.message}`;
      } else {
        errorMessage = error.message;
      }
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
