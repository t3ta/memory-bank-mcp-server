export const FILE_SYSTEM_BUSY = 'FILE_SYSTEM_BUSY';
export const TEMPORARY_ERROR = 'TEMPORARY_ERROR';
export const IO_ERROR = 'IO_ERROR';

/**
 * Utility functions for retrying file system operations
 */

import { InfrastructureError, InfrastructureErrorCodes } from "../../../shared/errors/InfrastructureError.js";
import { logger } from "../../../shared/utils/logger.js";

/**
 * Retry options
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Base delay in milliseconds between retries (will be exponentially increased)
   * @default 300
   */
  baseDelay?: number;

  /**
   * Factor to multiply delay by for each retry
   * @default 2
   */
  backoffFactor?: number;

  /**
   * Maximum delay in milliseconds
   * @default 2000
   */
  maxDelay?: number;

  /**
   * Custom error filter to determine if an error is retryable
   * @default (error) => isRetryableError(error)
   */
  retryableErrorFilter?: (error: unknown) => boolean;
}

/**
 * Determines if an error is retryable
 * @param error Error to check
 * @returns True if the error is retryable, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorCode = (error as any).code;
    if (typeof errorCode === 'string') {
      const retryableCodes = ['EBUSY', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'EAGAIN', 'EACCES', 'EIO'];
      return retryableCodes.includes(errorCode);
    }
  }

  if (error instanceof InfrastructureError) {
    return [
      FILE_SYSTEM_BUSY,
      TEMPORARY_ERROR,
      IO_ERROR
    ].includes(error.code as string);
  }

  return false;
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry options
 * @returns Promise resolving to the result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelay ?? 300;
  const backoffFactor = options.backoffFactor ?? 2;
  const maxDelay = options.maxDelay ?? 2000;
  const retryableErrorFilter = options.retryableErrorFilter ?? isRetryableError;

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      if (attempt > maxRetries || !retryableErrorFilter(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);

      logger.warn(
        `Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Wrapper for file system operations to automatically retry on retryable errors
 * @param operation Operation name for logging
 * @param fn Function to execute
 * @param options Retry options
 * @returns Promise resolving to the result of the function
 */
export async function withFileSystemRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  try {
    return await withRetry(fn, options);
  } catch (error) {
    logger.error(`File system operation '${operation}' failed after retries: ${error instanceof Error ? error.message : 'Unknown error'}`);

    if (!(error instanceof InfrastructureError)) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `File system operation '${operation}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }

    throw error;
  }
}
