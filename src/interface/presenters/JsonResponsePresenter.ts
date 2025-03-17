import { IResponsePresenter } from './interfaces/IResponsePresenter.js';
import { MCPResponse, MCPSuccessResponse, MCPErrorResponse } from './types/index.js';
import { BaseError } from '../../shared/errors/BaseError.js';
import { DomainError } from '../../shared/errors/DomainError.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';
import { InfrastructureError } from '../../shared/errors/InfrastructureError.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Presenter for JSON responses
 * Transforms application output into standardized JSON response format
 * with specific handling for JSON document operations
 */
export class JsonResponsePresenter implements IResponsePresenter {
  /**
   * Present success response
   * @param data Data to present
   * @returns Formatted success response
   */
  present<T>(data: T): MCPSuccessResponse<T> {
    // Add metadata for JSON responses
    return {
      success: true,
      data,
      meta: {
        format: 'json',
        timestamp: new Date().toISOString(),
        version: '2.0',
      },
    } as MCPSuccessResponse<T>;
  }

  /**
   * Present error response
   * @param error Error to present
   * @returns Formatted error response
   */
  presentError(error: Error): MCPErrorResponse {
    // Log the error
    logger.error(`JSON Error: ${error.message}`, error);

    // Default error response for unknown errors
    let errorResponse: MCPErrorResponse = {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined,
      },
      meta: {
        format: 'json',
        timestamp: new Date().toISOString(),
        version: '2.0',
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
        meta: {
          format: 'json',
          timestamp: new Date().toISOString(),
          version: '2.0',
        },
      };
    }

    // Special handling for different error types
    if (error instanceof DomainError) {
      // Domain errors are client errors (4xx)
      errorResponse.error.code = `JSON_DOMAIN_ERROR.${error.code}`;
      errorResponse.error.status = 400;
    } else if (error instanceof ApplicationError) {
      // Application errors could be client or server errors
      errorResponse.error.code = `JSON_APP_ERROR.${error.code}`;

      // Determine status code based on error type
      if (
        error.code === 'VALIDATION_ERROR' ||
        error.code === 'NOT_FOUND' ||
        error.code === 'INVALID_INPUT'
      ) {
        errorResponse.error.status = 400;
      } else {
        errorResponse.error.status = 500;
      }
    } else if (error instanceof InfrastructureError) {
      // Infrastructure errors are server errors (5xx)
      errorResponse.error.code = `JSON_INFRA_ERROR.${error.code}`;
      errorResponse.error.status = 500;
    }

    return errorResponse;
  }
}
