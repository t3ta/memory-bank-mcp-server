import { BaseError } from './BaseError.js';

/**
 * Error codes for the infrastructure layer
 */
export enum InfrastructureErrorCodes {
  FILE_NOT_FOUND = 'INFRASTRUCTURE_FILE_NOT_FOUND',
  FILE_READ_ERROR = 'INFRASTRUCTURE_FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'INFRASTRUCTURE_FILE_WRITE_ERROR',
  FILE_DELETE_ERROR = 'INFRASTRUCTURE_FILE_DELETE_ERROR',
  FILE_PERMISSION_ERROR = 'INFRASTRUCTURE_FILE_PERMISSION_ERROR',
  FILE_SYSTEM_ERROR = 'INFRASTRUCTURE_FILE_SYSTEM_ERROR',
  FILE_ALREADY_EXISTS = 'INFRASTRUCTURE_FILE_ALREADY_EXISTS',
  DIRECTORY_NOT_FOUND = 'INFRASTRUCTURE_DIRECTORY_NOT_FOUND',
  DIRECTORY_CREATE_ERROR = 'INFRASTRUCTURE_DIRECTORY_CREATE_ERROR',
  INDEX_UPDATE_ERROR = 'INFRASTRUCTURE_INDEX_UPDATE_ERROR',
  INITIALIZATION_ERROR = 'INFRASTRUCTURE_INITIALIZATION_ERROR',
  CONFIGURATION_ERROR = 'INFRASTRUCTURE_CONFIGURATION_ERROR',
  INVALID_ARGUMENT = 'INFRASTRUCTURE_INVALID_ARGUMENT',
  PERSISTENCE_ERROR = 'INFRASTRUCTURE_PERSISTENCE_ERROR',
  MCP_SERVER_ERROR = 'INFRASTRUCTURE_MCP_SERVER_ERROR',
  INVALID_FILE_CONTENT = 'INFRASTRUCTURE_INVALID_FILE_CONTENT', // Added
  GIT_COMMAND_FAILED = 'INFRASTRUCTURE_GIT_COMMAND_FAILED',
}

/**
 * Error for the infrastructure layer
 */
export class InfrastructureError extends BaseError {
  constructor(code: InfrastructureErrorCodes, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }

  override withMessage(newMessage: string): InfrastructureError {
    return new InfrastructureError(this.code as InfrastructureErrorCodes, newMessage, this.details);
  }

  override getHttpStatusCode(): number {
    switch (this.code) {
      case InfrastructureErrorCodes.FILE_NOT_FOUND:
      case InfrastructureErrorCodes.DIRECTORY_NOT_FOUND:
        return 404;
      case InfrastructureErrorCodes.FILE_PERMISSION_ERROR:
        return 403;
      case InfrastructureErrorCodes.FILE_ALREADY_EXISTS:
        return 409;
      default:
        return 500;
    }
  }
}

interface OperationDetails extends Record<string, unknown> {
  operation?: string;
  branchName?: string;
  path?: string;
  cause?: Error | undefined; // Changed type from string to Error | undefined
  command?: string;
  reason?: string;
}

/**
 * Factory methods for infrastructure errors
 */
export const InfrastructureErrors = {
  /**
   * Error for when a file is not found
   */
  fileNotFound: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_NOT_FOUND,
      message,
      details
    );
  },

  /**
   * Error for file read errors
   */
  fileReadError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_READ_ERROR,
      message,
      details
    );
  },

  /**
   * Error for file write errors
   */
  fileWriteError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_WRITE_ERROR,
      message,
      details
    );
  },

  /**
   * Error for file delete errors
   */
  fileDeleteError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_DELETE_ERROR,
      message,
      details
    );
  },

  /**
   * Error for file permission errors
   */
  permissionDenied: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
      message,
      details
    );
  },

  /**
   * General file system error
   */
  fileSystemError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
      message,
      details
    );
  },

  /**
   * Error for when a file already exists
   */
  fileAlreadyExists: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_ALREADY_EXISTS,
      message,
      details
    );
  },

  /**
   * Error for when a directory is not found
   */
  directoryNotFound: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.DIRECTORY_NOT_FOUND,
      message,
      details
    );
  },

  /**
   * Error for directory creation errors
   */
  directoryCreateError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.DIRECTORY_CREATE_ERROR,
      message,
      details
    );
  },

  /**
   * Error for index update errors
   */
  indexUpdateError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.INDEX_UPDATE_ERROR,
      message,
      details
    );
  },

  /**
   * Error for initialization errors
   */
  initializationError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.INITIALIZATION_ERROR,
      message,
      details
    );
  },

  /**
   * General MCP server error
   */
  mcpServerError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.MCP_SERVER_ERROR,
      message,
      details
    );
  },

  /**
   * Error for invalid file content
   */
  invalidFileContent: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.INVALID_FILE_CONTENT,
      message,
      details
    );
  },

  /**
   * Error for Git command failures
   * @param command The Git command that failed
   * @param reason A description of why it failed (e.g., stderr output)
   * @param cause The underlying error object, if any
   */
  gitCommandFailed: (command: string, reason: string, cause?: Error) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.GIT_COMMAND_FAILED,
      `Git command failed: '${command}'. Reason: ${reason}`,
      { command, reason, cause }
    );
  },
};
