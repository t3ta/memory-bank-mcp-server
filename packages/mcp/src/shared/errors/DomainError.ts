import { BaseError } from './BaseError.js';

/**
 * Error class for domain layer
 * Used for business rule violations and domain validation errors
 */
export class DomainError extends BaseError {
  /**
   * Create a new DomainError
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
    super(`DOMAIN_ERROR.${code}`, message, details, options);
  }

  /**
   * Domain errors typically correspond to client errors (4xx)
   * Override if specific error codes should have different status codes
   */
  public override getHttpStatusCode(): number {
    // Most domain errors are client errors (Bad Request)
    return 400;
  }

  /**
   * Create a new DomainError with the same code but a new message
   * Useful for adding context to existing errors
   *
   * @param newMessage New error message
   * @param additionalDetails Additional details to merge with existing details
   */
  public override withMessage(newMessage: string, additionalDetails?: Record<string, unknown>): DomainError {
    const combinedDetails = {
      ...this.details,
      ...additionalDetails,
      originalMessage: this.message
    };

    return new DomainError(
      this.code.replace('DOMAIN_ERROR.', ''),
      newMessage,
      combinedDetails,
      { cause: this.cause }
    );
  }
}

/**
 * Domain error code constants
 */
export const DomainErrorCodes = {
  // Document related errors
  INVALID_DOCUMENT_PATH: 'INVALID_DOCUMENT_PATH',
  INVALID_DOCUMENT_ID: 'INVALID_DOCUMENT_ID',
  INVALID_DOCUMENT_FORMAT: 'INVALID_DOCUMENT_FORMAT',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DOCUMENT_ALREADY_EXISTS: 'DOCUMENT_ALREADY_EXISTS',

  // Tag related errors
  INVALID_TAG_FORMAT: 'INVALID_TAG_FORMAT',
  INVALID_TAG: 'INVALID_TAG',

  // Branch related errors
  INVALID_BRANCH_NAME: 'INVALID_BRANCH_NAME',
  BRANCH_NOT_FOUND: 'BRANCH_NOT_FOUND',
  BRANCH_ALREADY_EXISTS: 'BRANCH_ALREADY_EXISTS',
  BRANCH_INITIALIZATION_FAILED: 'BRANCH_INITIALIZATION_FAILED',

  // General domain errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  REPOSITORY_ERROR: 'REPOSITORY_ERROR',
  JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR',

  // JSON Patch related errors
  INVALID_JSON_PATH: 'INVALID_JSON_PATH',
  INVALID_JSON_PATCH_OPERATION: 'INVALID_JSON_PATCH_OPERATION',
  JSON_PATCH_FAILED: 'JSON_PATCH_FAILED',
  PATH_NOT_FOUND: 'PATH_NOT_FOUND',
  TEST_FAILED: 'TEST_FAILED',
} as const;

/**
 * Type representing valid domain error codes
 */
export type DomainErrorCode = keyof typeof DomainErrorCodes;

/**
 * Factory functions for creating standard domain errors
 */
export const DomainErrors = {
  /**
   * Create a document not found error
   */
  documentNotFound: (documentId: string, additionalDetails?: Record<string, unknown>) => {
    return new DomainError(
      DomainErrorCodes.DOCUMENT_NOT_FOUND,
      `Document with ID ${documentId} was not found`,
      { documentId, ...additionalDetails }
    );
  },

  /**
   * Create a branch not found error
   */
  branchNotFound: (branchName: string, additionalDetails?: Record<string, unknown>) => {
    return new DomainError(
      DomainErrorCodes.BRANCH_NOT_FOUND,
      `Branch '${branchName}' was not found`,
      { branchName, ...additionalDetails }
    );
  },

  /**
   * Create a validation error
   */
  validationError: (message: string, additionalDetails?: Record<string, unknown>) => {
    return new DomainError(
      DomainErrorCodes.VALIDATION_ERROR,
      message,
      additionalDetails
    );
  },

  /**
   * Create an invalid tag format error
   */
  invalidTagFormat: (tag: string, additionalDetails?: Record<string, unknown>) => {
    return new DomainError(
      DomainErrorCodes.INVALID_TAG_FORMAT,
      `Invalid tag format: '${tag}'. Tags must contain only lowercase letters, numbers, and hyphens.`,
      { tag, ...additionalDetails }
    );
  },

  /**
   * Create a feature not available error
   */
  featureNotAvailable: (featureName: string, additionalDetails?: Record<string, unknown>) => {
    return new DomainError(
      'FEATURE_NOT_AVAILABLE', // Assuming FEATURE_NOT_AVAILABLE is a valid code or needs to be added
      `Feature '${featureName}' is not available in this configuration`,
      { featureName, ...additionalDetails }
    );
  }
};
