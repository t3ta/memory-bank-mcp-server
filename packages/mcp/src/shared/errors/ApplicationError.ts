import { BaseError } from './BaseError.js';

/**
 * Error class for application layer
 * Used for use case execution errors and application flow errors
 */
export class ApplicationError extends BaseError {
  /**
   * Create a new ApplicationError
   *
   * @param code Error code (without prefix)
   * @param message Human-readable error message
   * @param details Additional error details
   * @param options Additional error options
   */
  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
    options?: { cause?: Error }
  ) {
    super(`APP_ERROR.${code}`, message, details, options);
  }

  /**
   * Application errors may be either client or server errors
   * depending on the specific error code
   */
  public override getHttpStatusCode(): number {
    const codeWithoutPrefix = this.code.replace('APP_ERROR.', '');

    // Map specific error codes to HTTP status codes
    switch (codeWithoutPrefix) {
      case ApplicationErrorCodes.INVALID_INPUT:
        return 400; // Bad Request
      case ApplicationErrorCodes.UNAUTHORIZED:
        return 401; // Unauthorized
      case ApplicationErrorCodes.FORBIDDEN:
        return 403; // Forbidden
      case ApplicationErrorCodes.NOT_FOUND:
        return 404; // Not Found
      case ApplicationErrorCodes.CONFLICT:
        return 409; // Conflict
      default:
        return 500; // Internal Server Error
    }
  }

  /**
   * Create a new ApplicationError with the same code but a new message
   * Useful for adding context to existing errors
   *
   * @param newMessage New error message
   * @param additionalDetails Additional details to merge with existing details
   */
  // Removed 'override' as BaseError.withMessage is now abstract
  public withMessage(newMessage: string, additionalDetails?: Record<string, unknown>): ApplicationError {
    const combinedDetails = {
      ...this.details,
      ...additionalDetails,
      originalMessage: this.message
    };

    return new ApplicationError(
      this.code.replace('APP_ERROR.', ''),
      newMessage,
      combinedDetails,
      { cause: this.cause }
    );
  }
}

/**
 * Application error code constants
 */
export const ApplicationErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  USE_CASE_EXECUTION_FAILED: 'USE_CASE_EXECUTION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_STATE: 'INVALID_STATE',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
} as const;

/**
 * Type representing valid application error codes
 */
export type ApplicationErrorCode = keyof typeof ApplicationErrorCodes;

/**
 * Factory functions for creating standard application errors
 */
export const ApplicationErrors = {
  /**
   * Create an invalid input error
   */
  invalidInput: (message: string, additionalDetails?: Record<string, unknown>) => {
    return new ApplicationError(
      ApplicationErrorCodes.INVALID_INPUT,
      message,
      additionalDetails
    );
  },

  /**
   * Create a not found error
   */
  notFound: (resource: string, id: string, additionalDetails?: Record<string, unknown>) => {
    return new ApplicationError(
      ApplicationErrorCodes.NOT_FOUND,
      `${resource} with id ${id} was not found`,
      { resourceType: resource, resourceId: id, ...additionalDetails }
    );
  },

  /**
   * Create an unauthorized error
   */
  unauthorized: (message: string, additionalDetails?: Record<string, unknown>) => {
    return new ApplicationError(
      ApplicationErrorCodes.UNAUTHORIZED,
      message,
      additionalDetails
    );
  },

  /**
   * Create an execution failed error
   */
  executionFailed: (useCaseName: string, cause?: Error, additionalDetails?: Record<string, unknown>) => {
    return new ApplicationError(
      ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
      `Execution of use case '${useCaseName}' failed`,
      { useCaseName, ...additionalDetails },
      { cause }
    );
  },

  /**
   * Create an unexpected controller error
   */
  unexpectedControllerError: (controllerName: string, cause?: Error, additionalDetails?: Record<string, unknown>) => {
    return new ApplicationError(
      'UNEXPECTED_CONTROLLER_ERROR', // Assuming UNEXPECTED_CONTROLLER_ERROR is a valid code or needs to be added
      `An unexpected error occurred in controller '${controllerName}'`,
      { controllerName, ...additionalDetails },
      { cause }
    );
  }
};
