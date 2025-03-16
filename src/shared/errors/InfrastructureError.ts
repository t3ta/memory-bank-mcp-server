import { BaseError } from './BaseError.js';

/**
 * Error class for infrastructure layer
 * Used for external system integration errors, file system errors, etc.
 */
export class InfrastructureError extends BaseError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`INFRA_ERROR.${code}`, message, details);
  }
}

/**
 * Infrastructure error code constants
 */
export const InfrastructureErrorCodes = {
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PERMISSION_ERROR: 'FILE_PERMISSION_ERROR',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  MCP_SERVER_ERROR: 'MCP_SERVER_ERROR',
  GIT_ERROR: 'GIT_ERROR',
  PERSISTENCE_ERROR: 'PERSISTENCE_ERROR',
} as const;

export type InfrastructureErrorCode = keyof typeof InfrastructureErrorCodes;
