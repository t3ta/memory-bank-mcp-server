/**
 * Mock for FileSystemRetryUtils
 */
export const withFileSystemRetry = <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
  return fn();
};

export const isRetryableError = (error: unknown): boolean => {
  return false;
};

export const FILE_SYSTEM_BUSY = 'FILE_SYSTEM_BUSY';
export const TEMPORARY_ERROR = 'TEMPORARY_ERROR';
export const IO_ERROR = 'IO_ERROR';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  backoffFactor?: number;
  maxDelay?: number;
  retryableErrorFilter?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return fn();
}
