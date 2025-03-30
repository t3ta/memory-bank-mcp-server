import { BaseError } from './BaseError.js';

/**
 * Error codes for shared utilities
 */
export const SharedUtilsErrorCodes = {
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONVERSION_ERROR: 'CONVERSION_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  FORMAT_ERROR: 'FORMAT_ERROR',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
} as const;

/**
 * Type representing valid shared utils error codes
 */
export type SharedUtilsErrorCode = keyof typeof SharedUtilsErrorCodes;

/**
 * Error class for shared utilities
 */
export class SharedUtilsError extends BaseError {
  /**
   * Create a new SharedUtilsError
   *
   * @param code Error code (without prefix)
   * @param message Human-readable error message
   * @param details Additional error details
   * @param options Additional error options
   */
  constructor(
    code: SharedUtilsErrorCode,
    message: string,
    details?: Record<string, unknown>,
    options?: { cause?: Error }
  ) {
    super(`SHARED_UTILS_${code}`, message, details, options);
  }

  /**
   * Shared utils errors are typically internal/server errors
   */
  public override getHttpStatusCode(): number {
    return 500;
  }

  /**
   * Create a new SharedUtilsError with the same code but a new message
   * Useful for adding context to existing errors
   *
   * @param newMessage New error message
   * @param additionalDetails Additional details to merge with existing details
   */
  public override withMessage(newMessage: string, additionalDetails?: Record<string, unknown>): SharedUtilsError {
    const combinedDetails = {
      ...this.details,
      ...additionalDetails,
      originalMessage: this.message
    };

    const codeMatch = this.code.match(/SHARED_UTILS_(\w+)/);
    const codeWithoutPrefix = codeMatch ?
      codeMatch[1] as SharedUtilsErrorCode :
      SharedUtilsErrorCodes.UNKNOWN_ERROR;

    return new SharedUtilsError(
      codeWithoutPrefix,
      newMessage,
      combinedDetails,
      { cause: this.cause }
    );
  }
}

/**
 * Factory functions for creating standard shared utils errors
 */
export const SharedUtilsErrors = {
  /**
   * Create a validation error
   */
  validationError: (message: string, additionalDetails?: Record<string, unknown>) => {
    return new SharedUtilsError(
      'VALIDATION_ERROR',
      message,
      additionalDetails
    );
  },

  /**
   * Create a parsing error
   */
  parsingError: (message: string, cause?: Error, additionalDetails?: Record<string, unknown>) => {
    return new SharedUtilsError(
      'PARSING_ERROR',
      message,
      additionalDetails,
      { cause }
    );
  },

  /**
   * Create an invalid argument error
   */
  invalidArgument: (argumentName: string, message: string, additionalDetails?: Record<string, unknown>) => {
    return new SharedUtilsError(
      'INVALID_ARGUMENT',
      message,
      { argumentName, ...additionalDetails }
    );
  }
};
