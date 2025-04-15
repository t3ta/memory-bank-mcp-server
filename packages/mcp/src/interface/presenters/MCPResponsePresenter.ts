import { BaseError } from "../../shared/errors/BaseError.js";
import { logger } from "../../shared/utils/logger.js";
import type { MCPErrorResponse, MCPResponse } from "./types/MCPResponse.js";
import { convertDomainToAdapter } from "../../adapters/domain/DomainAdapter.js";
import { convertAdapterToMCPResponse } from "../../adapters/mcp/MCPProtocolAdapter.js";
import type { MCPToolResponse } from "../../types/protocol/MCPProtocolTypes.js";

/**
 * Presenter for MCP responses
 * Handles transformation of domain data to MCP protocol format
 */
export class MCPResponsePresenter {
  /**
   * Present successful response
   * @param result Result data from domain layer
   * @returns MCP response object
   */
  presentSuccess<T>(result: T): MCPResponse<T> {
    try {
      // Check if result is likely a domain model (has documentType, content, and metadata)
      if (
        result !== null &&
        typeof result === 'object' &&
        'documentType' in result &&
        'content' in result &&
        'metadata' in result
      ) {
        logger.debug('MCPResponsePresenter: Converting domain model to MCP response');

        // Convert domain model to adapter format
        const adapterResult = convertDomainToAdapter(result as any);

        // Convert adapter format to MCP protocol format
        const mcpResponse = convertAdapterToMCPResponse(adapterResult);

        // Return successful response with converted data
        return {
          success: true,
          data: mcpResponse.result as unknown as T,
        };
      }

      // For non-domain models, return as is
      logger.debug('MCPResponsePresenter: Returning non-domain result directly');
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Log conversion error but return original data
      logger.error('MCPResponsePresenter: Error converting result', {
        error,
        resultType: typeof result
      });

      return {
        success: true,
        data: result,
      };
    }
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

  /**
   * Present raw MCP protocol response
   * @param response Raw MCP protocol response
   * @returns MCP response formatted for output
   */
  presentRawResponse(response: MCPToolResponse): MCPResponse {
    logger.debug('MCPResponsePresenter: Presenting raw MCP response', {
      status: response.status,
      hasResult: !!response.result,
      hasError: !!response.error,
    });

    if (response.status === 'error') {
      return {
        success: false,
        error: {
          code: 'MCP_ERROR',
          message: response.error || 'An error occurred',
          details: response._meta,
        },
      };
    }

    return {
      success: true,
      data: response.result,
    };
  }
}
