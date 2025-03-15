import { McpError, ErrorCode } from '../types.js';

export enum MemoryBankErrorCode {
  // Document related errors (range: -33000 to -33099)
  DocumentNotFound = -33000,
  DocumentValidationFailed = -33001,
  RequiredFieldMissing = -33002,
  InvalidDocumentFormat = -33003,

  // Path related errors (range: -33100 to -33199)
  InvalidPath = -33100,
  PathNotFound = -33101,
  InvalidBranchName = -33102,

  // Tag related errors (range: -33200 to -33299)
  InvalidTagFormat = -33200,
  TagNotFound = -33201,

  // File system related errors (range: -33300 to -33399)
  FileSystemError = -33300,
  FileReadError = -33301,
  FileWriteError = -33302,
  FilePermissionError = -33303,
}

export class MemoryBankError extends Error implements McpError {
  constructor(
    public code: number,
    public message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MemoryBankError';
  }

  static documentNotFound(path: string): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.DocumentNotFound,
      `Document not found at path: ${path}`,
      { path }
    );
  }

  static documentValidationFailed(
    path: string,
    reason: string
  ): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.DocumentValidationFailed,
      `Document validation failed for ${path}: ${reason}`,
      { path, reason }
    );
  }

  static requiredFieldMissing(
    field: string,
    context: string
  ): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.RequiredFieldMissing,
      `Required field '${field}' is missing in ${context}`,
      { field, context }
    );
  }

  static invalidDocumentFormat(
    path: string,
    reason: string
  ): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.InvalidDocumentFormat,
      `Invalid document format at ${path}: ${reason}`,
      { path, reason }
    );
  }

  static invalidPath(path: string, reason: string): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.InvalidPath,
      `Invalid path: ${path} (${reason})`,
      { path, reason }
    );
  }

  static pathNotFound(path: string): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.PathNotFound,
      `Path not found: ${path}`,
      { path }
    );
  }

  static invalidBranchName(branch: string): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.InvalidBranchName,
      `Invalid branch name: ${branch} (must start with 'feature/' or 'fix/')`,
      { branch }
    );
  }

  static invalidTagFormat(tag: string): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.InvalidTagFormat,
      `Invalid tag format: ${tag} (must start with '#' and contain only alphanumeric characters)`,
      { tag }
    );
  }

  static tagNotFound(tag: string): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.TagNotFound,
      `Tag not found: ${tag}`,
      { tag }
    );
  }

  static fileSystemError(
    operation: string,
    path: string,
    error: Error
  ): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.FileSystemError,
      `File system error during ${operation} at ${path}: ${error.message}`,
      { operation, path, originalError: error.message }
    );
  }

  static fileReadError(path: string, error: Error): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.FileReadError,
      `Failed to read file at ${path}: ${error.message}`,
      { path, originalError: error.message }
    );
  }

  static fileWriteError(path: string, error: Error): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.FileWriteError,
      `Failed to write file at ${path}: ${error.message}`,
      { path, originalError: error.message }
    );
  }

  static filePermissionError(path: string): MemoryBankError {
    return new MemoryBankError(
      MemoryBankErrorCode.FilePermissionError,
      `Permission denied for file operation at ${path}`,
      { path }
    );
  }

  toJSON(): McpError {
    return {
      code: this.code,
      message: this.message,
    };
  }
}
