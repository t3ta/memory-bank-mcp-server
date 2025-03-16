import { BaseError } from './BaseError.js';

/**
 * Error class for application layer
 * Used for use case execution errors and application flow errors
 */
export class ApplicationError extends BaseError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`APP_ERROR.${code}`, message, details);
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
} as const;

export type ApplicationErrorCode = keyof typeof ApplicationErrorCodes;
