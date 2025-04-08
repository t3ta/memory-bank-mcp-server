import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
// import { mock } from 'jest-mock-extended'; // jest-mock-extended を削除
import { ReadBranchDocumentUseCase } from '../../../../../src/application/usecases/branch/ReadBranchDocumentUseCase.js'; // .js 追加
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js'; // .js 追加
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js'; // .js 追加
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js'; // .js 追加
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js'; // .js 追加
import { DomainErrors } from '../../../../../src/shared/errors/DomainError.js'; // .js 追加
import { ApplicationErrors } from '../../../../../src/shared/errors/ApplicationError.js'; // .js 追加
import { IGitService } from '../../../../../src/infrastructure/git/IGitService.js'; // .js 追加
import { IConfigProvider } from '../../../../../src/infrastructure/config/interfaces/IConfigProvider.js'; // .js 追加
import { WorkspaceConfig } from '../../../../../src/infrastructure/config/WorkspaceConfig.js'; // .js 追加
import { Tag } from '../../../../../src/domain/entities/Tag.js'; // .js 追加

// モックの作成 (jest-mock-extended を使用)
// jest-mock-extended の代わりに vi.fn() で手動モックを作成する
const mockBranchRepository: IBranchMemoryBankRepository = {
  initialize: vi.fn(),
  exists: vi.fn(),
  getDocument: vi.fn(),
  saveDocument: vi.fn(),
  deleteDocument: vi.fn(),
  // getAllDocuments: vi.fn(), // IBranchMemoryBankRepository に存在しないため削除
  // getTags: vi.fn(), // IBranchMemoryBankRepository に存在しないため削除
  // updateTags: vi.fn(), // IBranchMemoryBankRepository に存在しないため削除
  getRecentBranches: vi.fn(),
  // 不足しているメソッドを追加
  listDocuments: vi.fn(),
  findDocumentsByTags: vi.fn(),
  validateStructure: vi.fn(),
  saveTagIndex: vi.fn(),
  // readTagIndex: vi.fn(), // IBranchMemoryBankRepository に存在しないため削除
  // deleteBranch: vi.fn(), // IBranchMemoryBankRepository に存在しないため削除
  // 不足しているメソッドを追加
  getTagIndex: vi.fn(),
  findDocumentPathsByTagsUsingIndex: vi.fn(),
};
const mockGitService: IGitService = {
  getCurrentBranchName: vi.fn(),
};
const mockConfigProvider: IConfigProvider = {
  initialize: vi.fn(),
  getConfig: vi.fn(),
  getBranchMemoryPath: vi.fn(),
  getGlobalMemoryPath: vi.fn(),
  // getTemplatePath: vi.fn(), // IConfigProvider に存在しないため削除
  // getDocsRoot: vi.fn(), // IConfigProvider に存在しないため削除
  getLanguage: vi.fn(), // 不足していたメソッドを追加
};

// テスト対象の UseCase インスタンス化
const useCase = new ReadBranchDocumentUseCase(
  mockBranchRepository,
  mockGitService,
  mockConfigProvider
);

describe('ReadBranchDocumentUseCase Unit Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should read an existing document correctly', async () => {
    const branchName = 'feature/test-branch';
    const docPath = DocumentPath.create('test.json');
    const mockDocument = MemoryDocument.create({ path: docPath, content: '{"key":"value"}', tags: [Tag.create('test')], lastModified: new Date() });
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig);
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`);
    (mockBranchRepository.exists as Mock).mockResolvedValue(true);
    (mockBranchRepository.getDocument as Mock).mockResolvedValue(mockDocument);

    // 実行
    const result = await useCase.execute({ branchName, path: docPath.value });

    // 検証
    expect(result).toBeDefined();
    expect(result.document.path).toBe(docPath.value);
    // Expect the content to be the parsed object
    const expectedContentObject = JSON.parse('{"key":"value"}');
    expect(result.document.content).toEqual(expectedContentObject);
    expect(result.document.tags).toEqual(['test']);
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath);
    expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled();
  });

  it('should throw DocumentNotFound error when the document does not exist', async () => {
    const branchName = 'feature/another-branch';
    const docPath = DocumentPath.create('non-existent.json');
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig);
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`);
    (mockBranchRepository.exists as Mock).mockResolvedValue(true);
    (mockBranchRepository.getDocument as Mock).mockResolvedValue(null);

    // 実行＆検証
    // エラーオブジェクト全体ではなく、code と message で比較
    await expect(useCase.execute({ branchName, path: docPath.value }))
      .rejects.toMatchObject({
          code: DomainErrors.documentNotFound(docPath.value, { branchName }).code,
          message: DomainErrors.documentNotFound(docPath.value, { branchName }).message,
      });

    // モック呼び出し検証
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath);
  });

  it('should propagate unexpected repository errors', async () => {
    const branchName = 'feature/error-branch';
    const docPath = DocumentPath.create('error.json');
    const repositoryError = new Error('Database connection failed');
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig);
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`);
    (mockBranchRepository.exists as Mock).mockResolvedValue(true);
    (mockBranchRepository.getDocument as Mock).mockRejectedValue(repositoryError);

    // 実行＆検証
    // 実行＆検証 (toMatchObject で message のみを比較)
    await expect(useCase.execute({ branchName, path: docPath.value }))
      .rejects.toMatchObject({ message: `Execution of use case 'ReadBranchDocumentUseCase' failed` });

    // モック呼び出し検証
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath);
  });

  it('should read document from the current branch when branchName is omitted (in project mode)', async () => {
    const detectedBranchName = 'feature/detected';
    const docPath = DocumentPath.create('auto-detect.json');
    const mockDocument = MemoryDocument.create({ path: docPath, content: '{"auto":"detected"}', tags: [], lastModified: new Date() });
    const branchInfo = BranchInfo.create(detectedBranchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig);
    (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(detectedBranchName);
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${detectedBranchName}`);
    (mockBranchRepository.exists as Mock).mockResolvedValue(true);
    (mockBranchRepository.getDocument as Mock).mockResolvedValue(mockDocument);

    // 実行 (branchName を省略)
    const result = await useCase.execute({ path: docPath.value });

    // 検証
    expect(result).toBeDefined();
    // Expect the content to be the parsed object
    const expectedContentObjectDetected = JSON.parse('{"auto":"detected"}');
    expect(result.document.content).toEqual(expectedContentObjectDetected);
    expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1);
    expect(mockConfigProvider.getConfig).toHaveBeenCalledTimes(1);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath);
  });

  it('should throw an error when branch name detection fails (in project mode)', async () => {
    const docPath = DocumentPath.create('any.json');
    const gitError = new Error('Not a git repository');
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig);
    (mockGitService.getCurrentBranchName as Mock).mockRejectedValue(gitError);

    // 実行＆検証
    // エラーオブジェクト全体ではなく、code と message で比較
    const expectedError = ApplicationErrors.invalidInput('Branch name is required but could not be automatically determined. Please provide it explicitly or ensure you are in a Git repository.');
    await expect(useCase.execute({ path: docPath.value }))
      .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message });

    // モック呼び出し検証
    expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1);
    expect(mockConfigProvider.getConfig).toHaveBeenCalledTimes(1);
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });

  it('should throw an error when branchName is omitted (not in project mode)', async () => {
    const docPath = DocumentPath.create('any.json');
    const mockConfig: WorkspaceConfig = { isProjectMode: false, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig);

    // 実行＆検証
    // エラーオブジェクト全体ではなく、code と message で比較
    const expectedError = ApplicationErrors.invalidInput('Branch name is required when not running in project mode.');
    await expect(useCase.execute({ path: docPath.value }))
      .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message });

    // モック呼び出し検証
    expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled();
    expect(mockConfigProvider.getConfig).toHaveBeenCalledTimes(1);
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });

  it('should throw an error when path is not specified', async () => {
    const branchName = 'feature/test';

    // 実行＆検証 (path を undefined で渡す)
    // エラーオブジェクト全体ではなく、code と message で比較
    const expectedError = ApplicationErrors.invalidInput('Document path is required');
    await expect(useCase.execute({ branchName: branchName, path: undefined as any }))
      .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message });

    // モック呼び出し検証
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });

  it('should throw BranchNotFound error when the branch does not exist', async () => {
    const branchName = 'feature/non-existent';
    const docPath = DocumentPath.create('any.json');
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig);
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`);
    (mockBranchRepository.exists as Mock).mockResolvedValue(false);

    // 実行＆検証
    // エラーオブジェクト全体ではなく、code と message で比較
    const expectedError = DomainErrors.branchNotFound(branchName);
    await expect(useCase.execute({ branchName: branchName, path: docPath.value }))
      .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message });

    // モック呼び出し検証
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });

  it('should propagate non-Error instance errors from the repository', async () => {
    const branchName = 'feature/non-error-throw';
    const docPath = DocumentPath.create('non-error.json');
    const nonError = 'Just a string error';
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig);
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`);
    (mockBranchRepository.exists as Mock).mockResolvedValue(true);
    (mockBranchRepository.getDocument as Mock).mockRejectedValue(nonError);

    // 実行＆検証
    // エラーオブジェクト全体ではなく、code と message で比較
    const expectedError = ApplicationErrors.executionFailed('ReadBranchDocumentUseCase');
    await expect(useCase.execute({ branchName, path: docPath.value }))
      .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message });

    // モック呼び出し検証
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath);
  });
});
