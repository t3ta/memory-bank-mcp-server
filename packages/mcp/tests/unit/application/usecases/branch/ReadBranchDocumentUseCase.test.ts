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

describe('ReadBranchDocumentUseCase', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks(); // jest -> vi
  });

  it('存在するドキュメントを正しく読み込めること', async () => {
    const branchName = 'feature/test-branch';
    const docPath = DocumentPath.create('test.json');
    const mockDocument = MemoryDocument.create({ path: docPath, content: '{"key":"value"}', tags: [Tag.create('test')], lastModified: new Date() });
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false }; // 型を WorkspaceConfig に変更

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig); // as Mock 追加
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
    (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    (mockBranchRepository.getDocument as Mock).mockResolvedValue(mockDocument); // as Mock 追加

    // 実行
    const result = await useCase.execute({ branchName, path: docPath.value });

    // 検証
    expect(result).toBeDefined();
    expect(result.document.path).toBe(docPath.value);
    expect(result.document.content).toBe('{"key":"value"}');
    expect(result.document.tags).toEqual(['test']);
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName); // safeName でチェック
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath);
    expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled(); // branchName 指定時は呼ばれない
  });

  it('ドキュメントが存在しない場合にエラー (DocumentNotFound) が発生すること', async () => {
    const branchName = 'feature/another-branch';
    const docPath = DocumentPath.create('non-existent.json');
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig); // as Mock 追加
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
    (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    (mockBranchRepository.getDocument as Mock).mockResolvedValue(null); // as Mock 追加

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

  it('リポジトリで予期せぬエラーが発生した場合にエラーが伝播すること', async () => {
    const branchName = 'feature/error-branch';
    const docPath = DocumentPath.create('error.json');
    const repositoryError = new Error('Database connection failed');
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig); // as Mock 追加
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
    (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    (mockBranchRepository.getDocument as Mock).mockRejectedValue(repositoryError); // as Mock 追加

    // 実行＆検証
    // 実行＆検証 (toMatchObject で message のみを比較)
    await expect(useCase.execute({ branchName, path: docPath.value }))
      .rejects.toMatchObject({ message: `Execution of use case 'ReadBranchDocumentUseCase' failed` });

    // モック呼び出し検証
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath);
  });

  it('branchName が省略された場合 (プロジェクトモード) に、現在のブランチからドキュメントを読み込めること', async () => {
    const detectedBranchName = 'feature/detected';
    const docPath = DocumentPath.create('auto-detect.json');
    const mockDocument = MemoryDocument.create({ path: docPath, content: '{"auto":"detected"}', tags: [], lastModified: new Date() });
    const branchInfo = BranchInfo.create(detectedBranchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig); // as Mock 追加
    (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(detectedBranchName); // as Mock 追加
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${detectedBranchName}`); // as Mock 追加
    (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    (mockBranchRepository.getDocument as Mock).mockResolvedValue(mockDocument); // as Mock 追加

    // 実行 (branchName を省略)
    const result = await useCase.execute({ path: docPath.value });

    // 検証
    expect(result).toBeDefined();
    expect(result.document.content).toBe('{"auto":"detected"}');
    expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1); // ブランチ名検出が呼ばれたか
    expect(mockConfigProvider.getConfig).toHaveBeenCalledTimes(1); // 設定が読み込まれたか
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath);
  });

  it('branchName が省略された場合 (プロジェクトモード) でブランチ名検出に失敗した場合にエラーが発生すること', async () => {
    const docPath = DocumentPath.create('any.json');
    const gitError = new Error('Not a git repository');
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig); // as Mock 追加
    (mockGitService.getCurrentBranchName as Mock).mockRejectedValue(gitError); // as Mock 追加

    // 実行＆検証
    // エラーオブジェクト全体ではなく、code と message で比較
    const expectedError = ApplicationErrors.invalidInput('Branch name is required but could not be automatically determined. Please provide it explicitly or ensure you are in a Git repository.');
    await expect(useCase.execute({ path: docPath.value }))
      .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message });

    // モック呼び出し検証
    expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1);
    expect(mockConfigProvider.getConfig).toHaveBeenCalledTimes(1);
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled(); // ドキュメント取得は呼ばれない
  });

  it('branchName が省略された場合 (非プロジェクトモード) にエラーが発生すること', async () => {
    const docPath = DocumentPath.create('any.json');
    const mockConfig: WorkspaceConfig = { isProjectMode: false, language: 'en' as const, docsRoot: '/mock/docs', verbose: false }; // プロジェクトモードOFF

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig); // as Mock 追加

    // 実行＆検証
    // エラーオブジェクト全体ではなく、code と message で比較
    const expectedError = ApplicationErrors.invalidInput('Branch name is required when not running in project mode.');
    await expect(useCase.execute({ path: docPath.value }))
      .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message });

    // モック呼び出し検証
    expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled(); // ブランチ名検出は呼ばれない
    expect(mockConfigProvider.getConfig).toHaveBeenCalledTimes(1);
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });

  it('path が指定されていない場合にエラーが発生すること', async () => {
    const branchName = 'feature/test';

    // 実行＆検証 (path を undefined で渡す)
    // エラーオブジェクト全体ではなく、code と message で比較
    const expectedError = ApplicationErrors.invalidInput('Document path is required');
    await expect(useCase.execute({ branchName: branchName, path: undefined as any }))
      .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message });

    // モック呼び出し検証
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });

  it('ブランチが存在しない場合にエラー (BranchNotFound) が発生すること', async () => {
    const branchName = 'feature/non-existent'; // `/` を含む名前に修正
    const docPath = DocumentPath.create('any.json');
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig); // as Mock 追加
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
    (mockBranchRepository.exists as Mock).mockResolvedValue(false); // as Mock 追加

    // 実行＆検証
    // エラーオブジェクト全体ではなく、code と message で比較
    const expectedError = DomainErrors.branchNotFound(branchName);
    await expect(useCase.execute({ branchName: branchName, path: docPath.value }))
      .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message });

    // モック呼び出し検証
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName); // safeName でチェックされたか
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled(); // ドキュメント取得は呼ばれない
  });

  it('リポジトリで Error インスタンスではないエラーが発生した場合にエラーが伝播すること', async () => {
    const branchName = 'feature/non-error-throw';
    const docPath = DocumentPath.create('non-error.json');
    const nonError = 'Just a string error'; // Error インスタンスではないエラー
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    (mockConfigProvider.getConfig as Mock).mockReturnValue(mockConfig); // as Mock 追加
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
    (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    (mockBranchRepository.getDocument as Mock).mockRejectedValue(nonError); // as Mock 追加

    // 実行＆検証
    // エラーオブジェクト全体ではなく、code と message で比較
    const expectedError = ApplicationErrors.executionFailed('ReadBranchDocumentUseCase');
    await expect(useCase.execute({ branchName, path: docPath.value }))
      .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message }); // ApplicationError でラップされる

    // モック呼び出し検証
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath);
  });
});
