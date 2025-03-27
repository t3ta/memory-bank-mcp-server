import { BaseError } from "../../shared/errors/BaseError.js";
import { DomainError } from "../../shared/errors/DomainError.js";
import { logger } from "../../shared/utils/logger.js";
import { MCPResponsePresenter as IMCPResponsePresenter } from "./types/MCPResponsePresenter.js";
import type { MCPResponse, MCPSuccessResponse, MCPErrorResponse } from "./types/MCPResponse.js";

/**
 * Presenter for MCP server responses
 * Transforms application output into standardized MCP response format
 */
export class MCPResponsePresenter implements IMCPResponsePresenter {
  /**
   * Present success response
   * @param data Data to present
   * @returns Formatted MCP success response
   */
  present<T>(data: T): MCPSuccessResponse<T> {
    return {
      success: true,
      data,
    };
  }

  /**
   * Present error response
   * @param error Error to present
   * @returns Formatted MCP error response
   */
  presentError(error: Error): MCPErrorResponse {
    // Log the error
    logger.error(`Error: ${error.message}`, error);

    // Default error response for unknown errors
    let errorResponse: MCPErrorResponse = {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined,
      },
    };

    // Handle known error types
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

    // Special handling for different error types
    if (error instanceof DomainError) {
      // Domain errors are client errors (4xx)
      errorResponse.error.code = `DOMAIN_ERROR.${error.code}`;
    } else if (error instanceof BaseError) {
      // Other BaseError types (unified error handling)
      errorResponse.error.code = `ERROR.${error.code}`;
    }

    return errorResponse;
  }
}
