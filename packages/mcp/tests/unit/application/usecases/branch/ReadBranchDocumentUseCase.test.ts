import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { ReadBranchDocumentUseCase } from '../../../../../src/application/usecases/branch/ReadBranchDocumentUseCase.js';
import { ReadDocumentUseCase, ReadDocumentOutput } from '../../../../../src/application/usecases/common/ReadDocumentUseCase.js';
import { ApplicationError, ApplicationErrors } from '../../../../../src/shared/errors/index.js';

// --- モックの準備 ---
// Mock for ReadDocumentUseCase
const mockReadDocumentUseCase = {
  execute: vi.fn()
} as unknown as ReadDocumentUseCase;
// --- モックの準備ここまで ---


describe('ReadBranchDocumentUseCase Unit Tests', () => {
  let useCase: ReadBranchDocumentUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    // ReadBranchDocumentUseCase のインスタンス化
    useCase = new ReadBranchDocumentUseCase(mockReadDocumentUseCase);
  });

  describe('execute', () => {
    it('should read an existing document correctly', async () => {
      const branchName = 'feature/test-branch';
      const docPath = 'test.json';
      const content = { key: 'value' };
      const tags = ['test'];
      const lastModifiedDate = new Date().toISOString();

      // Create mock response from ReadDocumentUseCase
      const mockResponse: ReadDocumentOutput = {
        document: {
          path: docPath,
          content,
          tags,
          lastModified: lastModifiedDate
        }
      };

      // Setup the mock to return our expected response
      (mockReadDocumentUseCase.execute as Mock).mockResolvedValue(mockResponse);

      // 実行
      const result = await useCase.execute({ branchName, path: docPath });

      // Verify ReadDocumentUseCase was called correctly with scope='branch'
      expect(mockReadDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath
      });

      // Verify the output matches the expected response
      expect(result.document.path).toBe(docPath);
      expect(result.document.content).toEqual(content);
      expect(result.document.tags).toEqual(tags);
      expect(result.document.lastModified).toBe(lastModifiedDate);
    });

    it('should throw DocumentNotFound error when the document does not exist', async () => {
      const branchName = 'feature/another-branch';
      const docPath = 'non-existent.json';
      const expectedError = new ApplicationError(
        'DOMAIN_ERROR',
        `Document not found: '${docPath}' in branch '${branchName}'`
      );

      // Setup the mock to throw an error
      (mockReadDocumentUseCase.execute as Mock).mockRejectedValue(expectedError);

      // 実行＆検証
      await expect(useCase.execute({ branchName, path: docPath }))
        .rejects.toMatchObject({
          code: expectedError.code,
          message: expectedError.message,
        });

      // Verify ReadDocumentUseCase was called with the correct parameters
      expect(mockReadDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath
      });
    });

    it('should propagate unexpected repository errors', async () => {
      const branchName = 'feature/error-branch';
      const docPath = 'error.json';
      const expectedError = new ApplicationError(
        'EXECUTION_FAILED',
        `Execution of use case 'ReadDocumentUseCase' failed`
      );

      // Setup the mock to throw an error
      (mockReadDocumentUseCase.execute as Mock).mockRejectedValue(expectedError);

      // 実行＆検証
      await expect(useCase.execute({ branchName, path: docPath }))
        .rejects.toMatchObject({
          code: expectedError.code,
          message: expectedError.message,
        });

      // Verify ReadDocumentUseCase was called with the correct parameters
      expect(mockReadDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath
      });
    });

    it('should read document from the current branch when branchName is omitted (in project mode)', async () => {
      const docPath = 'auto-detect.json';
      const content = { auto: 'detected' };
      const tags = [];
      const lastModifiedDate = new Date().toISOString();

      // Create mock response from ReadDocumentUseCase
      const mockResponse: ReadDocumentOutput = {
        document: {
          path: docPath,
          content,
          tags,
          lastModified: lastModifiedDate
        }
      };

      // Setup the mock to return our expected response
      (mockReadDocumentUseCase.execute as Mock).mockResolvedValue(mockResponse);

      // 実行 (branchName を省略)
      const result = await useCase.execute({ path: docPath });

      // Verify ReadDocumentUseCase was called correctly with scope='branch'
      expect(mockReadDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: undefined, // branchName を省略したので undefined
        path: docPath
      });

      // Verify the output matches the expected response
      expect(result.document.path).toBe(docPath);
      expect(result.document.content).toEqual(content);
      expect(result.document.lastModified).toBe(lastModifiedDate);
    });

    it('should throw an error when branch name detection fails (in project mode)', async () => {
      const docPath = 'any.json';
      const expectedError = new ApplicationError(
        'INVALID_INPUT',
        'Branch name is required but could not be automatically determined. Please provide it explicitly or ensure you are in a Git repository.'
      );

      // Setup the mock to throw an error
      (mockReadDocumentUseCase.execute as Mock).mockRejectedValue(expectedError);

      // 実行＆検証
      await expect(useCase.execute({ path: docPath }))
        .rejects.toMatchObject({
          code: expectedError.code,
          message: expectedError.message,
        });

      // Verify ReadDocumentUseCase was called with the correct parameters
      expect(mockReadDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: undefined,
        path: docPath
      });
    });

    it('should throw an error when branchName is omitted (not in project mode)', async () => {
      const docPath = 'any.json';
      const expectedError = new ApplicationError(
        'INVALID_INPUT',
        'Branch name is required when not running in project mode.'
      );

      // Setup the mock to throw an error
      (mockReadDocumentUseCase.execute as Mock).mockRejectedValue(expectedError);

      // 実行＆検証
      await expect(useCase.execute({ path: docPath }))
        .rejects.toMatchObject({
          code: expectedError.code,
          message: expectedError.message,
        });

      // Verify ReadDocumentUseCase was called with the correct parameters
      expect(mockReadDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: undefined,
        path: docPath
      });
    });

    it('should throw an error when path is not specified', async () => {
      const branchName = 'feature/test';
      const expectedError = new ApplicationError(
        'INVALID_INPUT',
        'Document path is required'
      );

      // Setup the mock to throw an error
      (mockReadDocumentUseCase.execute as Mock).mockRejectedValue(expectedError);

      // 実行＆検証
      // TypeScript エラーを避けるため any を使用
      await expect(useCase.execute({ branchName, path: undefined as any }))
        .rejects.toMatchObject({
          code: expectedError.code
          // メッセージは一致しなくてもよい
        });

      // ReadDocumentUseCase.execute が呼ばれたことを確認
      expect(mockReadDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: undefined
      });
    });

    it('should throw BranchNotFound error when the branch does not exist', async () => {
      const branchName = 'feature/non-existent';
      const docPath = 'any.json';
      const expectedError = new ApplicationError(
        'DOMAIN_ERROR',
        `Branch not found: '${branchName}'`
      );

      // Setup the mock to throw an error
      (mockReadDocumentUseCase.execute as Mock).mockRejectedValue(expectedError);

      // 実行＆検証
      await expect(useCase.execute({ branchName, path: docPath }))
        .rejects.toMatchObject({
          code: expectedError.code,
          message: expectedError.message,
        });

      // Verify ReadDocumentUseCase was called with the correct parameters
      expect(mockReadDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath
      });
    });
  });
});