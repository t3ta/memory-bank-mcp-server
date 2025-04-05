import {
  BaseError,
  ApplicationError, ApplicationErrorCodes, ApplicationErrors,
  DomainError, DomainErrorCodes, DomainErrors,
  InfrastructureError, InfrastructureErrorCodes, InfrastructureErrors,
  SharedUtilsError, SharedUtilsErrorCodes, SharedUtilsErrors,
  ErrorUtils
} from '../../../../src/shared/errors/index';
import { logger } from '../../../../src/shared/utils/logger';

// jest.mock を削除し、spyOn を使う方式に変更

describe('ErrorUtils', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    // 各テスト前に logger.error の呼び出し履歴をクリアし、実装を空にする
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // 各テスト後にスパイをリストア
    errorSpy.mockRestore();
  });

  // wrapAsync のテスト
  describe('wrapAsync', () => {
    it('should resolve successfully if the promise resolves', async () => {
      const promise = Promise.resolve('success');
      await expect(ErrorUtils.wrapAsync(promise)).resolves.toBe('success');
    });
    it('should re-throw BaseError instances', async () => {
      const baseError = new DomainError(DomainErrorCodes.INVALID_DOCUMENT_FORMAT, 'Test BaseError'); // エラーコード修正
      const promise = Promise.reject(baseError);
      await expect(ErrorUtils.wrapAsync(promise)).rejects.toThrow(baseError);
      // logger.error が呼ばれないことも確認（BaseError はラップしないため）
      expect(errorSpy).not.toHaveBeenCalled(); // spy をチェック
    });
    it('should map unknown errors using the errorMapper if provided', async () => {
      const originalError = new Error('Original error');
      const mappedError = new ApplicationError(ApplicationErrorCodes.UNKNOWN_ERROR, 'Mapped error'); // エラーコード修正
      const errorMapper = jest.fn().mockReturnValue(mappedError);
      const promise = Promise.reject(originalError);

      await expect(ErrorUtils.wrapAsync(promise, errorMapper)).rejects.toThrow(mappedError);
      expect(errorMapper).toHaveBeenCalledWith(originalError);
      // logger.error は呼ばれるはず
      expect(errorSpy).toHaveBeenCalledWith('Error caught in wrapAsync', { error: originalError }); // spy をチェック
    });
    it('should wrap standard Errors in InfrastructureError if no mapper is provided', async () => {
      const originalError = new Error('Standard error');
      const promise = Promise.reject(originalError);

      await expect(ErrorUtils.wrapAsync(promise)).rejects.toThrow(InfrastructureError);
      // 期待値を修正: code からプレフィックスを削除し、message を確認、cause は details の中
      await expect(ErrorUtils.wrapAsync(promise)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.MCP_SERVER_ERROR,
        message: originalError.message,
        details: expect.objectContaining({ cause: originalError }),
      });
      // logger.error は呼ばれるはず
      expect(errorSpy).toHaveBeenCalledWith('Error caught in wrapAsync', { error: originalError }); // spy をチェック
    });
    it('should wrap non-Error throws in InfrastructureError if no mapper is provided', async () => {
      const originalError = 'Just a string error';
      const promise = Promise.reject(originalError);

      await expect(ErrorUtils.wrapAsync(promise)).rejects.toThrow(InfrastructureError);
      // 期待値を修正: code からプレフィックスを削除し、message を確認
      await expect(ErrorUtils.wrapAsync(promise)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.MCP_SERVER_ERROR,
        message: 'An unknown error occurred',
        details: { originalError: String(originalError) }, // cause は含まれない
      });
      // logger.error は呼ばれるはず
      expect(errorSpy).toHaveBeenCalledWith('Error caught in wrapAsync', { error: originalError }); // spy をチェック
    });
  });

  // isErrorOfType のテスト
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
      expect(ErrorUtils.isErrorOfType(standardError, 'TypeError')).toBe(false); // 標準エラーだが名前が違う
    });
    it('should handle BaseError subclasses correctly', () => {
      const domainError = new DomainError(DomainErrorCodes.INVALID_DOCUMENT_FORMAT, 'Test');
      // DomainError は BaseError のサブクラスなので true になるはず
      expect(ErrorUtils.isErrorOfType(domainError, 'BaseError')).toBe(true);

      const appError = new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Test');
      // ApplicationError も BaseError のサブクラスなので true になるはず
      expect(ErrorUtils.isErrorOfType(appError, 'BaseError')).toBe(true);
    });
  });

  // getErrorCode のテスト
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

  // formatForLogging のテスト
  describe('formatForLogging', () => {
    it('should call toJSON for BaseError instances', () => {
      const baseError = new DomainError(DomainErrorCodes.REPOSITORY_ERROR, 'DB Error', { table: 'users' });
      const jsonSpy = jest.spyOn(baseError, 'toJSON');
      const result = ErrorUtils.formatForLogging(baseError);

      expect(jsonSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(baseError.toJSON());
      jsonSpy.mockRestore(); // スパイを元に戻す
    });
    it('should format standard Errors correctly', () => {
      const standardError = new Error('Standard Test Error');
      // jest.fn() を使って Date.toISOString をモック化し、固定値を返すようにする
      const mockDate = new Date('2025-04-05T12:10:15.000Z');
      const toISOStringSpy = jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate.toISOString());

      const result = ErrorUtils.formatForLogging(standardError);

      expect(result).toHaveProperty('name', 'Error');
      expect(result).toHaveProperty('message', 'Standard Test Error');
      expect(result).toHaveProperty('stack', expect.any(String)); // スタックトレースは存在することだけ確認
      expect(result).toHaveProperty('timestamp', mockDate.toISOString());

      toISOStringSpy.mockRestore(); // モックを元に戻す
    });
    it('should format non-Error types (string) correctly', () => {
      const nonError = 'Just a string';
      const mockDate = new Date('2025-04-05T12:10:23.000Z');
      const toISOStringSpy = jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate.toISOString());

      const result = ErrorUtils.formatForLogging(nonError);

      expect(result).toEqual({
        error: String(nonError),
        timestamp: mockDate.toISOString(),
      });
      toISOStringSpy.mockRestore();
    });

    it('should format non-Error types (null) correctly', () => {
      const mockDate = new Date('2025-04-05T12:10:24.000Z');
      const toISOStringSpy = jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate.toISOString());

      const nullResult = ErrorUtils.formatForLogging(null);
      expect(nullResult).toEqual({
        error: 'null',
        timestamp: mockDate.toISOString(),
      });
      toISOStringSpy.mockRestore();
    });
  });
});
