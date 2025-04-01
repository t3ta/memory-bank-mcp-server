import { BaseError } from "../../shared/errors/BaseError.js";
import { logger } from "../../shared/utils/logger.js";
import type { MCPErrorResponse, MCPResponse } from "./types/MCPResponse.js";

/**
 * Presenter for MCP responses
 */
export class MCPResponsePresenter {
  /**
   * Present successful response
   * @param result Result data
   * @returns MCP response object
   */
  presentSuccess<T>(result: T): MCPResponse<T> {
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Present error response
   * @param error Error object
   * @returns MCP error response object
   */
  presentError(error: Error): MCPErrorResponse {
    const errorContext: Record<string, unknown> = {
      errorName: error.name,
      errorMessage: error.message,
    };
    if (error instanceof BaseError) {
      errorContext.errorCode = error.code;
      errorContext.errorDetails = error.details;
      if (error.cause) {
        errorContext.cause = error.cause instanceof Error ? { name: error.cause.name, message: error.cause.message } : error.cause;
      }
    }
    if (process.env.NODE_ENV === 'development') {
      errorContext.stack = error.stack;
    }
    logger.error(`Error: ${error.message}`, errorContext);

    let errorResponse: MCPErrorResponse = {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined,
      },
    };

    if (error instanceof BaseError) {
      errorResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }

    return errorResponse;
  }
}
