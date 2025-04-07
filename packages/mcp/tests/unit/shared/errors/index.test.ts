import { vi } from 'vitest'; // vi をインポート
import {
  // BaseError, // 未使用なので削除
  ApplicationError, ApplicationErrorCodes, // 未使用の ApplicationErrors を削除
  DomainError, DomainErrorCodes, // 未使用の DomainErrors を削除
  InfrastructureError, InfrastructureErrorCodes, // 未使用の InfrastructureErrors を削除
  // SharedUtilsError, // 未使用なので削除
  ErrorUtils
} from '../../../../src/shared/errors/index.js'; // .js 拡張子を追加
import { logger } from '../../../../src/shared/utils/logger.js'; // .js 拡張子を追加

// jest.mock を削除し、spyOn を使う方式に変更

describe('ErrorUtils Unit Tests', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>; // より正確な型推論を使うか、シンプルに型指定を削除

  beforeEach(() => {
    // Clear logger.error call history and mock implementation before each test
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore spy after each test
    errorSpy.mockRestore();
  });

  // Tests for wrapAsync
  describe('wrapAsync', () => {
    it('should resolve successfully if the promise resolves', async () => {
      const promise = Promise.resolve('success');
      await expect(ErrorUtils.wrapAsync(promise)).resolves.toBe('success');
    });
    it('should re-throw BaseError instances', async () => {
      const baseError = new DomainError(DomainErrorCodes.INVALID_DOCUMENT_FORMAT, 'Test BaseError'); // エラーコード修正
      const promise = Promise.reject(baseError);
      await expect(ErrorUtils.wrapAsync(promise)).rejects.toThrow(baseError);
      // Check that logger.error was not called (BaseError is not wrapped)
      expect(errorSpy).not.toHaveBeenCalled();
    });
    it('should map unknown errors using the errorMapper if provided', async () => {
      const originalError = new Error('Original error');
      const mappedError = new ApplicationError(ApplicationErrorCodes.UNKNOWN_ERROR, 'Mapped error'); // エラーコード修正
      const errorMapper = vi.fn().mockReturnValue(mappedError); // jest -> vi
      const promise = Promise.reject(originalError);

      await expect(ErrorUtils.wrapAsync(promise, errorMapper)).rejects.toThrow(mappedError);
      expect(errorMapper).toHaveBeenCalledWith(originalError);
      // logger.error should be called
      expect(errorSpy).toHaveBeenCalledWith('Error caught in wrapAsync', { error: originalError });
    });
    it('should wrap standard Errors in InfrastructureError if no mapper is provided', async () => {
      const originalError = new Error('Standard error');
      const promise = Promise.reject(originalError);

      await expect(ErrorUtils.wrapAsync(promise)).rejects.toThrow(InfrastructureError);
      // Corrected expectation: remove prefix from code, check message, cause is in details
      await expect(ErrorUtils.wrapAsync(promise)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.MCP_SERVER_ERROR,
        message: originalError.message,
        details: expect.objectContaining({ cause: originalError }),
      });
      // logger.error should be called
      expect(errorSpy).toHaveBeenCalledWith('Error caught in wrapAsync', { error: originalError });
    });
    it('should wrap non-Error throws in InfrastructureError if no mapper is provided', async () => {
      const originalError = 'Just a string error';
      const promise = Promise.reject(originalError);

      await expect(ErrorUtils.wrapAsync(promise)).rejects.toThrow(InfrastructureError);
      // Corrected expectation: remove prefix from code, check message
      await expect(ErrorUtils.wrapAsync(promise)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.MCP_SERVER_ERROR,
        message: 'An unknown error occurred',
        details: { originalError: String(originalError) }, // cause is not included
      });
      // logger.error should be called
      expect(errorSpy).toHaveBeenCalledWith('Error caught in wrapAsync', { error: originalError });
    });
  });

  // Tests for isErrorOfType
  describe('isErrorOfType', () => {
    it('should return true for BaseError instances with matching name', () => {
      const domainError = new DomainError(DomainErrorCodes.INVALID_DOCUMENT_FORMAT, 'Test');
      expect(ErrorUtils.isErrorOfType(domainError, 'DomainError')).toBe(true);

      const appError = new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Test');
      expect(ErrorUtils.isErrorOfType(appError, 'ApplicationError')).toBe(true);
    });
    it('should return true for standard Error instances with matching constructor name', () => {
      const standardError = new Error('Test');
      expect(ErrorUtils.isErrorOfType(standardError, 'Error')).toBe(true);

      const typeError = new TypeError('Test');
      expect(ErrorUtils.isErrorOfType(typeError, 'TypeError')).toBe(true);
    });
    it('should return false for non-Error types', () => {
      expect(ErrorUtils.isErrorOfType('not an error', 'string')).toBe(false);
      expect(ErrorUtils.isErrorOfType(null, 'null')).toBe(false);
      expect(ErrorUtils.isErrorOfType(undefined, 'undefined')).toBe(false);
      expect(ErrorUtils.isErrorOfType({ message: 'error like' }, 'object')).toBe(false);
    });
    it('should return false for errors with non-matching names', () => {
      const domainError = new DomainError(DomainErrorCodes.INVALID_DOCUMENT_FORMAT, 'Test');
      expect(ErrorUtils.isErrorOfType(domainError, 'ApplicationError')).toBe(false); // BaseError だが名前が違う

      const standardError = new Error('Test');
      expect(ErrorUtils.isErrorOfType(standardError, 'TypeError')).toBe(false);
    });
    it('should handle BaseError subclasses correctly', () => {
      const domainError = new DomainError(DomainErrorCodes.INVALID_DOCUMENT_FORMAT, 'Test');
      // DomainError is a subclass of BaseError, so this should be true
      expect(ErrorUtils.isErrorOfType(domainError, 'BaseError')).toBe(true);

      const appError = new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Test');
      // ApplicationError is also a subclass of BaseError, so this should be true
      expect(ErrorUtils.isErrorOfType(appError, 'BaseError')).toBe(true);
    });
  });

  // Tests for getErrorCode
  describe('getErrorCode', () => {
    it('should return the code for BaseError instances', () => {
      const domainError = new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Test');
      expect(ErrorUtils.getErrorCode(domainError)).toBe(`DOMAIN_ERROR.${DomainErrorCodes.INVALID_TAG_FORMAT}`);

      const appError = new ApplicationError(ApplicationErrorCodes.NOT_FOUND, 'Test');
      expect(ErrorUtils.getErrorCode(appError)).toBe(`APP_ERROR.${ApplicationErrorCodes.NOT_FOUND}`);
    });
    it('should return a generated code for standard Error instances', () => {
      const standardError = new Error('Test');
      expect(ErrorUtils.getErrorCode(standardError)).toBe('GENERAL_ERROR.ERROR');

      const typeError = new TypeError('Test');
      expect(ErrorUtils.getErrorCode(typeError)).toBe('GENERAL_ERROR.TYPEERROR');
    });
    it('should return UNKNOWN_ERROR for non-Error types', () => {
      expect(ErrorUtils.getErrorCode('not an error')).toBe('UNKNOWN_ERROR');
      expect(ErrorUtils.getErrorCode(null)).toBe('UNKNOWN_ERROR');
      expect(ErrorUtils.getErrorCode(undefined)).toBe('UNKNOWN_ERROR');
      expect(ErrorUtils.getErrorCode({ message: 'error like' })).toBe('UNKNOWN_ERROR');
    });
  });

  // Tests for formatForLogging
  describe('formatForLogging', () => {
    it('should call toJSON for BaseError instances', () => {
      const baseError = new DomainError(DomainErrorCodes.REPOSITORY_ERROR, 'DB Error', { table: 'users' });
      const jsonSpy = vi.spyOn(baseError, 'toJSON'); // jest -> vi
      const result = ErrorUtils.formatForLogging(baseError);

      expect(jsonSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(baseError.toJSON());
      jsonSpy.mockRestore();
    });
    it('should format standard Errors correctly', () => {
      const standardError = new Error('Standard Test Error');
      // vi.spyOn() を使って Date.toISOString をモック化し、固定値を返すようにする
      const mockDate = new Date('2025-04-05T12:10:15.000Z');
      const toISOStringSpy = vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate.toISOString()); // jest -> vi

      const result = ErrorUtils.formatForLogging(standardError);

      expect(result).toHaveProperty('name', 'Error');
      expect(result).toHaveProperty('message', 'Standard Test Error');
      expect(result).toHaveProperty('stack', expect.any(String)); // Just check that stack trace exists
      expect(result).toHaveProperty('timestamp', mockDate.toISOString());

      toISOStringSpy.mockRestore();
    });
    it('should format non-Error types (string) correctly', () => {
      const nonError = 'Just a string';
      const mockDate = new Date('2025-04-05T12:10:23.000Z');
      const toISOStringSpy = vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate.toISOString()); // jest -> vi

      const result = ErrorUtils.formatForLogging(nonError);

      expect(result).toEqual({
        error: String(nonError),
        timestamp: mockDate.toISOString(),
      });
      toISOStringSpy.mockRestore();
    });

    it('should format non-Error types (null) correctly', () => {
      const mockDate = new Date('2025-04-05T12:10:24.000Z');
      const toISOStringSpy = vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate.toISOString()); // jest -> vi

      const nullResult = ErrorUtils.formatForLogging(null);
      expect(nullResult).toEqual({
        error: 'null',
        timestamp: mockDate.toISOString(),
      });
      toISOStringSpy.mockRestore();
    });
  });
});
