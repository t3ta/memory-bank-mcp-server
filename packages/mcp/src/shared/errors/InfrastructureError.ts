import { BaseError } from './BaseError.js';

/**
 * インフラストラクチャレイヤーのエラーコード
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
  CONFIGURATION_ERROR = 'INFRASTRUCTURE_CONFIGURATION_ERROR', // Added
  INVALID_ARGUMENT = 'INFRASTRUCTURE_INVALID_ARGUMENT',     // Added
  PERSISTENCE_ERROR = 'INFRASTRUCTURE_PERSISTENCE_ERROR',     // Added
  MCP_SERVER_ERROR = 'INFRASTRUCTURE_MCP_SERVER_ERROR',       // Added
}

/**
 * インフラストラクチャレイヤーのエラー
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
}

/**
 * インフラストラクチャエラーのファクトリーメソッド
 */
export const InfrastructureErrors = {
  /**
   * ファイルが見つからない場合のエラー
   */
  fileNotFound: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_NOT_FOUND,
      message,
      details
    );
  },

  /**
   * ファイルの読み込みエラー
   */
  fileReadError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_READ_ERROR,
      message,
      details
    );
  },

  /**
   * ファイルの書き込みエラー
   */
  fileWriteError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_WRITE_ERROR,
      message,
      details
    );
  },

  /**
   * ファイルの削除エラー
   */
  fileDeleteError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_DELETE_ERROR,
      message,
      details
    );
  },

  /**
   * ファイルのパーミッションエラー
   */
  permissionDenied: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
      message,
      details
    );
  },

  /**
   * ファイルシステムの一般的なエラー
   */
  fileSystemError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
      message,
      details
    );
  },

  /**
   * ファイルが既に存在する場合のエラー
   */
  fileAlreadyExists: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.FILE_ALREADY_EXISTS,
      message,
      details
    );
  },

  /**
   * ディレクトリが見つからない場合のエラー
   */
  directoryNotFound: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.DIRECTORY_NOT_FOUND,
      message,
      details
    );
  },

  /**
   * ディレクトリの作成エラー
   */
  directoryCreateError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.DIRECTORY_CREATE_ERROR,
      message,
      details
    );
  },

  /**
   * インデックス更新エラー
   */
  indexUpdateError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.INDEX_UPDATE_ERROR,
      message,
      details
    );
  },

  /**
   * 初期化エラー
   */
  initializationError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.INITIALIZATION_ERROR,
      message,
      details
    );
  },

  /**
   * MCPサーバーの一般的なエラー
   */
  mcpServerError: (message: string, details?: OperationDetails) => {
    return new InfrastructureError(
      InfrastructureErrorCodes.MCP_SERVER_ERROR,
      message,
      details
    );
  },
};
