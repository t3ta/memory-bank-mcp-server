import { BaseError } from './BaseError.js';

/**
 * Error class for domain layer
 * Used for business rule violations and domain validation errors
 */
export class DomainError extends BaseError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`DOMAIN_ERROR.${code}`, message, details);
  }
}

/**
 * Domain error code constants
 */
export const DomainErrorCodes = {
  INVALID_DOCUMENT_PATH: 'INVALID_DOCUMENT_PATH',
  INVALID_DOCUMENT_ID: 'INVALID_DOCUMENT_ID',
  INVALID_TAG_FORMAT: 'INVALID_TAG_FORMAT',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DOCUMENT_ALREADY_EXISTS: 'DOCUMENT_ALREADY_EXISTS',
  INVALID_BRANCH_NAME: 'INVALID_BRANCH_NAME',
  BRANCH_NOT_FOUND: 'BRANCH_NOT_FOUND',
  BRANCH_ALREADY_EXISTS: 'BRANCH_ALREADY_EXISTS',
  BRANCH_INITIALIZATION_FAILED: 'BRANCH_INITIALIZATION_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  INVALID_TAG: 'INVALID_TAG',
  REPOSITORY_ERROR: 'REPOSITORY_ERROR',
} as const;

export type DomainErrorCode = keyof typeof DomainErrorCodes;
