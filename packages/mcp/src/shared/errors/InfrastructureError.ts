import { BaseError } from './BaseError.js';

/**
 * Error class for infrastructure layer
 * Used for external system integration errors, file system errors, etc.
 */
export class InfrastructureError extends BaseError {
  /**
   * Create a new InfrastructureError
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
    super(`INFRA_ERROR.${code}`, message, details, options);
  }

  /**
   * Infrastructure errors typically correspond to server errors (5xx)
   */
  public override getHttpStatusCode(): number {
    // Most infrastructure errors are server errors
    return 500;
  }

  /**
   * Create a new InfrastructureError with the same code but a new message
   * Useful for adding context to existing errors
   *
   * @param newMessage New error message
   * @param additionalDetails Additional details to merge with existing details
   */
  public override withMessage(newMessage: string, additionalDetails?: Record<string, unknown>): InfrastructureError {
    const combinedDetails = {
      ...this.details,
      ...additionalDetails,
      originalMessage: this.message
    };

    return new InfrastructureError(
      this.code.replace('INFRA_ERROR.', ''),
      newMessage,
      combinedDetails,
      { cause: this.cause }
    );
  }
}

/**
 * Infrastructure error code constants
 */
export const InfrastructureErrorCodes = {
  // File system related errors
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PERMISSION_ERROR: 'FILE_PERMISSION_ERROR',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',

  // External services related errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Configuration related errors
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',

  // Server related errors
  MCP_SERVER_ERROR: 'MCP_SERVER_ERROR',

  // Version control related errors
  GIT_ERROR: 'GIT_ERROR',

  // Data persistence related errors
  PERSISTENCE_ERROR: 'PERSISTENCE_ERROR',

  // General infrastructure errors
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
} as const;

/**
 * Type representing valid infrastructure error codes
 */
export type InfrastructureErrorCode = keyof typeof InfrastructureErrorCodes;

/**
 * Factory functions for creating standard infrastructure errors
 */
export const InfrastructureErrors = {
  /**
   * Create a file not found error
   */
  fileNotFound: (filePath: string, additionalDetails?: Record<string, unknown>) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_NOT_FOUND,
      `File not found: ${filePath}`,
      { filePath, ...additionalDetails }
    );
  },

  /**
   * Create a file read error
   */
  fileReadError: (filePath: string, cause?: Error, additionalDetails?: Record<string, unknown>) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_READ_ERROR,
      `Failed to read file: ${filePath}`,
      { filePath, ...additionalDetails },
      { cause }
    );
  },

  /**
   * Create a file write error
   */
  fileWriteError: (filePath: string, cause?: Error, additionalDetails?: Record<string, unknown>) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_WRITE_ERROR,
      `Failed to write file: ${filePath}`,
      { filePath, ...additionalDetails },
      { cause }
    );
  },

  /**
   * Create a file permission error
   */
  permissionDenied: (filePath: string, operation?: string, additionalDetails?: Record<string, unknown>) => {
    const message = operation
      ? `Permission denied for operation '${operation}' on file: ${filePath}`
      : `Permission denied for file: ${filePath}`;
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
      message,
      { filePath, operation, ...additionalDetails }
    );
  },

  /**
   * Create a generic file system error
   */
  fileSystemError: (message: string, cause?: Error, additionalDetails?: Record<string, unknown>) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
      message,
      additionalDetails,
      { cause }
    );
  },

  /**
   * Create a persistence error
   */
  persistenceError: (message: string, cause?: Error, additionalDetails?: Record<string, unknown>) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.PERSISTENCE_ERROR,
      message,
      additionalDetails,
      { cause }
    );
  }
};
