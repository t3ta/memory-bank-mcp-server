// Unused imports removed
import { BaseError } from "../../shared/errors/BaseError.js";
import { logger } from "../../shared/utils/logger.js";
// Corrected import path for MCP types
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
      data: result, // Changed 'result' to 'data'
    };
  }

  /**
   * Present error response
   * @param error Error object
   * @returns MCP error response object
   */
  presentError(error: Error): MCPErrorResponse {
    // Log the error with context
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
    // Add stack in development for easier debugging
    if (process.env.NODE_ENV === 'development') {
      errorContext.stack = error.stack;
    }
    logger.error(`Error: ${error.message}`, errorContext);

    // Default error response for unknown errors
    let errorResponse: MCPErrorResponse = {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined,
      },
    };

    // Handle known error types with proper status mapping
    if (error instanceof BaseError) {
      errorResponse = {
        success: false,
        error: {
          code: error.code, // Use the code directly from BaseError
          message: error.message,
          details: error.details,
        },
      };
    }

    // BaseError or unknown error handled, return the response
    return errorResponse;
  }
}
