/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../../../src/shared/errors/InfrastructureError.js';
import { withRetry, isRetryableError, withFileSystemRetry } from '../../../../../src/infrastructure/repositories/file-system/FileSystemRetryUtils.js';

// Logger をモック化
jest.mock('../../../../../src/shared/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FileSystemRetryUtils', () => {
  // 非同期タイマーをモック化
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isRetryableError', () => {
    it('should identify Node.js error codes as retryable', () => {
      const ebusy = new Error('File is busy');
      (ebusy as any).code = 'EBUSY';

      const etimedout = new Error('Operation timed out');
      (etimedout as any).code = 'ETIMEDOUT';

      const eacces = new Error('Permission denied');
      (eacces as any).code = 'EACCES';

      // Act & Assert
      expect(isRetryableError(ebusy)).toBe(true);
      expect(isRetryableError(etimedout)).toBe(true);
      expect(isRetryableError(eacces)).toBe(true);
    });

    it('should identify specific InfrastructureError codes as retryable', () => {
      const busyError = new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_BUSY,
        'File system is busy'
      );

      const tempError = new InfrastructureError(
        InfrastructureErrorCodes.TEMPORARY_ERROR,
        'Temporary error'
      );

      const ioError = new InfrastructureError(
        InfrastructureErrorCodes.IO_ERROR,
        'IO error'
      );

      // Act & Assert
      expect(isRetryableError(busyError)).toBe(true);
      expect(isRetryableError(tempError)).toBe(true);
      expect(isRetryableError(ioError)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const notFoundError = new InfrastructureError(
        InfrastructureErrorCodes.FILE_NOT_FOUND,
        'File not found'
      );

      const permissionError = new InfrastructureError(
        InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
        'Permission denied'
      );

      const regularError = new Error('Regular error');

      // Act & Assert
      expect(isRetryableError(notFoundError)).toBe(false);
      expect(isRetryableError(permissionError)).toBe(false);
      expect(isRetryableError(regularError)).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should return the result if the operation succeeds on first attempt', async () => {
      // Setup
      const operation = jest.fn().mockResolvedValue('success');

      // Act
      const result = await withRetry(operation);

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry the operation if it fails with a retryable error', async () => {
      // Setup
      const error = new Error('Temporary error');
      (error as any).code = 'ETIMEDOUT';

      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Act
      const resultPromise = withRetry(operation);
      
      // Fast-forward timers to resolve the delay
      jest.runAllTimers();
      
      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect maxRetries option', async () => {
      // Setup
      const error = new Error('Temporary error');
      (error as any).code = 'ETIMEDOUT';

      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Act & Assert
      // Should fail because maxRetries is 2 (allowing 3 attempts total)
      const resultPromise = withRetry(operation, { maxRetries: 2 });
      
      // Fast-forward timers to resolve all delays
      jest.runAllTimers();
      jest.runAllTimers();
      
      await expect(resultPromise).rejects.toThrow('Temporary error');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      // Setup
      const error = new Error('Temporary error');
      (error as any).code = 'ETIMEDOUT';

      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Spy on setTimeout
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      // Act
      const resultPromise = withRetry(operation, { 
        baseDelay: 100,
        backoffFactor: 2
      });
      
      // Fast-forward first delay (100ms)
      jest.advanceTimersByTime(100);
      
      // Fast-forward second delay (200ms)
      jest.advanceTimersByTime(200);
      
      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      
      // Verify setTimeout was called with expected delays
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 100);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 200);
    });

    it('should not retry if the error is not retryable', async () => {
      // Setup
      const error = new Error('Non-retryable error');

      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Act & Assert
      await expect(withRetry(operation)).rejects.toThrow('Non-retryable error');
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should honor custom error filter', async () => {
      // Setup
      const error = new Error('Custom retryable error');
      const customFilter = (err: unknown) => err instanceof Error && err.message.includes('custom');

      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Act
      const resultPromise = withRetry(operation, { retryableErrorFilter: customFilter });
      
      // Fast-forward timers
      jest.runAllTimers();
      
      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('withFileSystemRetry', () => {
    it('should wrap operations with retry logic', async () => {
      // Setup
      const operation = jest.fn().mockResolvedValue('success');

      // Act
      const result = await withFileSystemRetry('test operation', operation);

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should wrap errors in InfrastructureError', async () => {
      // Setup
      const error = new Error('Random error');
      const operation = jest.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(withFileSystemRetry('test operation', operation)).rejects.toThrow(InfrastructureError);
      await expect(withFileSystemRetry('test operation', operation)).rejects.toThrow(/File system operation 'test operation' failed/);
    });

    it('should pass through InfrastructureErrors unchanged', async () => {
      // Setup
      const error = new InfrastructureError(
        InfrastructureErrorCodes.FILE_NOT_FOUND,
        'Custom error message'
      );
      const operation = jest.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(withFileSystemRetry('test operation', operation)).rejects.toBe(error);
      await expect(withFileSystemRetry('test operation', operation)).rejects.toThrow('Custom error message');
    });

    it('should retry with custom options', async () => {
      // Setup
      const error = new Error('Temporary error');
      (error as any).code = 'EBUSY';

      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Act
      const resultPromise = withFileSystemRetry('test operation', operation, {
        maxRetries: 1,
        baseDelay: 50
      });
      
      // Fast-forward timers
      jest.advanceTimersByTime(50);
      
      const result = await resultPromise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});
