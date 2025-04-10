import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { WriteBranchDocumentUseCase } from '../../../../../src/application/usecases/branch/WriteBranchDocumentUseCase.js';
import { WriteDocumentUseCase, WriteDocumentOutput } from '../../../../../src/application/usecases/common/WriteDocumentUseCase.js';
import { ApplicationError, ApplicationErrors } from '../../../../../src/shared/errors/index.js';

// --- モックの準備 ---
// Mock for WriteDocumentUseCase
const mockWriteDocumentUseCase = {
  execute: vi.fn()
} as unknown as WriteDocumentUseCase;
// --- モックの準備ここまで ---


describe('WriteBranchDocumentUseCase Unit Tests', () => {
  let useCase: WriteBranchDocumentUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    // WriteBranchDocumentUseCase のインスタンス化
    useCase = new WriteBranchDocumentUseCase(mockWriteDocumentUseCase);
  });

  describe('execute', () => {
    it('should create a new document with content', async () => {
      const branchName = 'feature/new-doc';
      const docPath = 'newDoc.txt';
      const content = 'This is a new document.';
      const tags = ['new', 'test'];
      const documentInput = { path: docPath, content, tags };
      const lastModifiedDate = new Date().toISOString();

      // Create mock response from WriteDocumentUseCase
      const mockResponse: WriteDocumentOutput = {
        document: {
          path: docPath,
          content,
          tags,
          lastModified: lastModifiedDate
        }
      };

      // Setup the mock to return our expected response
      (mockWriteDocumentUseCase.execute as Mock).mockResolvedValue(mockResponse);

      // 実行
      const result = await useCase.execute({ branchName, document: documentInput, returnContent: true });

      // Verify WriteDocumentUseCase was called correctly with scope='branch'
      expect(mockWriteDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath,
        content,
        patches: undefined,
        tags,
        returnContent: true
      });

      // Verify the output matches the expected response
      expect(result.document.path).toBe(docPath);
      expect(result.document.content).toBe(content);
      expect(result.document.tags).toEqual(tags);
      expect(result.document.lastModified).toBe(lastModifiedDate);
    });

    it('should overwrite an existing document with content', async () => {
      const branchName = 'feature/existing-doc';
      const docPath = 'existingDoc.txt';
      const newContent = 'This is the updated content.';
      const tags = ['update', 'test'];
      const documentInput = { path: docPath, content: newContent, tags };
      const lastModifiedDate = new Date().toISOString();

      // Create mock response from WriteDocumentUseCase
      const mockResponse: WriteDocumentOutput = {
        document: {
          path: docPath,
          content: newContent,
          tags,
          lastModified: lastModifiedDate
        }
      };

      // Setup the mock to return our expected response
      (mockWriteDocumentUseCase.execute as Mock).mockResolvedValue(mockResponse);

      // 実行
      const result = await useCase.execute({ branchName, document: documentInput, returnContent: true });

      // Verify WriteDocumentUseCase was called correctly with scope='branch'
      expect(mockWriteDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath,
        content: newContent,
        patches: undefined,
        tags,
        returnContent: true
      });

      // Verify the output matches the expected response
      expect(result.document.path).toBe(docPath);
      expect(result.document.content).toBe(newContent); // 内容が更新されている
      expect(result.document.tags).toEqual(tags); // タグが更新されている
      expect(result.document.lastModified).toBe(lastModifiedDate);
    });

    it('should update an existing document with patches', async () => {
      const branchName = 'feature/patch-doc';
      const docPath = 'data.json';
      const patches = [{ op: 'replace', path: '/name', value: 'new name' }];
      const expectedPatchedContent = JSON.stringify({ name: 'new name', value: 10 }, null, 2);
      const tags = ['patch', 'json'];
      const documentInput = { path: docPath }; // content は含めない
      const lastModifiedDate = new Date().toISOString();

      // Create mock response from WriteDocumentUseCase
      const mockResponse: WriteDocumentOutput = {
        document: {
          path: docPath,
          content: expectedPatchedContent,
          tags,
          lastModified: lastModifiedDate
        }
      };

      // Setup the mock to return our expected response
      (mockWriteDocumentUseCase.execute as Mock).mockResolvedValue(mockResponse);

      // 実行
      const result = await useCase.execute({ branchName, document: documentInput, patches, returnContent: true });

      // Verify WriteDocumentUseCase was called correctly with scope='branch'
      expect(mockWriteDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath,
        content: undefined,
        patches,
        tags: undefined,
        returnContent: true
      });

      // Verify the output matches the expected response
      expect(result.document.path).toBe(docPath);
      expect(result.document.content).toBe(expectedPatchedContent); // 内容がパッチ適用されている
      expect(result.document.tags).toEqual(tags); // タグが更新されている
      expect(result.document.lastModified).toBe(lastModifiedDate);
    });

    it('should create/overwrite a document with content and tags', async () => {
      const branchName = 'feature/content-tags';
      const docPath = 'docWithTags.md';
      const newContent = '# New Title';
      const tags = ['new', 'markdown'];
      const documentInput = { path: docPath, content: newContent, tags };
      const lastModifiedDate = new Date().toISOString();

      // Create mock response from WriteDocumentUseCase
      const mockResponse: WriteDocumentOutput = {
        document: {
          path: docPath,
          content: newContent,
          tags,
          lastModified: lastModifiedDate
        }
      };

      // Setup the mock to return our expected response
      (mockWriteDocumentUseCase.execute as Mock).mockResolvedValue(mockResponse);

      // 実行
      const result = await useCase.execute({ branchName, document: documentInput, returnContent: true });

      // Verify WriteDocumentUseCase was called correctly with scope='branch'
      expect(mockWriteDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath,
        content: newContent,
        patches: undefined,
        tags,
        returnContent: true
      });

      // Verify the output matches the expected response
      expect(result.document.path).toBe(docPath);
      expect(result.document.content).toBe(newContent);
      expect(result.document.tags).toEqual(tags);
      expect(result.document.lastModified).toBe(lastModifiedDate);
    });

    it('should update a document with patches and tags', async () => {
      const branchName = 'feature/patch-tags';
      const docPath = 'patchTags.json';
      const patches = [{ op: 'replace', path: '/status', value: 'new' }];
      const tags = ['patched', 'final'];
      const documentInput = { path: docPath, tags };
      const expectedPatchedContent = JSON.stringify({ value: 1, status: 'new' }, null, 2);
      const lastModifiedDate = new Date().toISOString();

      // Create mock response from WriteDocumentUseCase
      const mockResponse: WriteDocumentOutput = {
        document: {
          path: docPath,
          content: expectedPatchedContent,
          tags,
          lastModified: lastModifiedDate
        }
      };

      // Setup the mock to return our expected response
      (mockWriteDocumentUseCase.execute as Mock).mockResolvedValue(mockResponse);

      // 実行 (patches と document.tags を両方渡す)
      const result = await useCase.execute({ branchName, document: documentInput, patches, returnContent: true });

      // Verify WriteDocumentUseCase was called correctly with scope='branch'
      expect(mockWriteDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath,
        content: undefined, // content は指定していない
        patches, // patches が渡されている
        tags, // tags が渡されている
        returnContent: true
      });

      // Verify the output matches the expected response
      expect(result.document.path).toBe(docPath);
      expect(result.document.content).toBe(expectedPatchedContent); // 内容がパッチ適用されている
      expect(result.document.tags).toEqual(tags); // タグが更新されている
      expect(result.document.lastModified).toBe(lastModifiedDate);
    });

    it('should auto-detect branch name when not specified (in project mode)', async () => {
      const detectedBranchName = 'feature/auto-detect'; // Gitから検出される想定のブランチ名
      const docPath = 'autoDetect.txt';
      const content = 'Content for auto-detected branch.';
      const tags = [];
      const documentInput = { path: docPath, content };
      const lastModifiedDate = new Date().toISOString();

      // Create mock response from WriteDocumentUseCase
      const mockResponse: WriteDocumentOutput = {
        document: {
          path: docPath,
          content,
          tags,
          lastModified: lastModifiedDate
        }
      };

      // Setup the mock to return our expected response
      (mockWriteDocumentUseCase.execute as Mock).mockResolvedValue(mockResponse);

      // 実行 (branchName を省略)
      const result = await useCase.execute({ document: documentInput, returnContent: true });

      // Verify WriteDocumentUseCase was called correctly with scope='branch'
      expect(mockWriteDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: undefined, // branchName を省略したので undefined
        path: docPath,
        content,
        patches: undefined,
        tags: undefined,
        returnContent: true
      });

      // Verify the output matches the expected response
      expect(result.document.path).toBe(docPath);
      expect(result.document.content).toBe(content);
      expect(result.document.lastModified).toBe(lastModifiedDate);
    });

    it('should throw an error when both content and patches are specified', async () => {
      const branchName = 'feature/content-and-patches';
      const docPath = 'invalid.json';
      const content = '{"key":"value"}';
      const patches = [{ op: 'add', path: '/newKey', value: 'newValue' }];
      const documentInput = { path: docPath, content }; // content を含む
      const expectedError = new ApplicationError(
        'INVALID_INPUT',
        'Cannot provide both document content and patches simultaneously'
      );

      // Setup the mock to throw an error
      (mockWriteDocumentUseCase.execute as Mock).mockRejectedValue(expectedError);

      // 実行＆検証 (content と patches を両方渡す)
      await expect(useCase.execute({ branchName, document: documentInput, patches }))
        .rejects.toMatchObject({
          code: expectedError.code,
          message: expectedError.message,
        });

      // Verify WriteDocumentUseCase was called with the correct parameters
      expect(mockWriteDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath,
        content,
        patches,
        tags: undefined,
        returnContent: undefined
      });
    });

    it('should propagate error if JSON Patch application fails', async () => {
      const branchName = 'feature/invalid-patch';
      const docPath = 'data.json';
      const patches = [{ op: 'replace', path: '/nonexistent', value: 'new value' }];
      const documentInput = { path: docPath };
      const expectedError = new ApplicationError(
        'EXECUTION_FAILED',
        'Failed to apply JSON Patch: Target path does not exist'
      );

      // Setup the mock to throw an error
      (mockWriteDocumentUseCase.execute as Mock).mockRejectedValue(expectedError);

      // 実行＆検証
      await expect(useCase.execute({ branchName, document: documentInput, patches }))
        .rejects.toMatchObject({
          code: expectedError.code,
          message: expectedError.message,
        });

      // Verify WriteDocumentUseCase was called with the correct parameters
      expect(mockWriteDocumentUseCase.execute).toHaveBeenCalledWith({
        scope: 'branch',
        branch: branchName,
        path: docPath,
        content: undefined,
        patches,
        tags: undefined,
        returnContent: undefined
      });
    });
  });
});