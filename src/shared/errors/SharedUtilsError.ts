import { BaseError } from '../.jsBaseError.js';

/**
 * Error codes for shared utilities
 */
export enum SharedUtilsErrorCodes {
  UNKNOWN_ERROR = 'SHARED_UTILS_UNKNOWN_ERROR',
  VALIDATION_ERROR = 'SHARED_UTILS_VALIDATION_ERROR',
  CONVERSION_ERROR = 'SHARED_UTILS_CONVERSION_ERROR',
  PARSING_ERROR = 'SHARED_UTILS_PARSING_ERROR',
}

/**
 * Error class for shared utilities
 */
export class SharedUtilsError extends BaseError {
  constructor(
    code: SharedUtilsErrorCodes,
    message: string,
    metadata: Record<string, unknown> = {}
  ) {
    super(code, message, metadata);
    this.name = 'SharedUtilsError';
  }
}
