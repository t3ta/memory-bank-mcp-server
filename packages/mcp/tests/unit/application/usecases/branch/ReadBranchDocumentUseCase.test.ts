import { mock } from 'jest-mock-extended'; // jest-mock-extended をインポート
import { ReadBranchDocumentUseCase } from '../../../../../src/application/usecases/branch/ReadBranchDocumentUseCase';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument';
import { DomainErrors } from '../../../../../src/shared/errors/DomainError';
import { ApplicationErrors } from '../../../../../src/shared/errors/ApplicationError';
import { IGitService } from '../../../../../src/infrastructure/git/IGitService';
import { IConfigProvider } from '../../../../../src/infrastructure/config/interfaces/IConfigProvider';
import { WorkspaceConfig } from '../../../../../src/infrastructure/config/WorkspaceConfig'; // Config -> WorkspaceConfig に変更
import { Tag } from '../../../../../src/domain/entities/Tag';

// モックの作成 (jest-mock-extended を使用)
const mockBranchRepository = mock<IBranchMemoryBankRepository>();

const mockGitService = mock<IGitService>();

const mockConfigProvider = mock<IConfigProvider>();

// テスト対象の UseCase インスタンス化
const useCase = new ReadBranchDocumentUseCase(
  mockBranchRepository,
  mockGitService,
  mockConfigProvider
);

describe('ReadBranchDocumentUseCase', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
  });

  it('存在するドキュメントを正しく読み込めること', async () => {
    const branchName = 'feature/test-branch';
    const docPath = DocumentPath.create('test.json');
    const mockDocument = MemoryDocument.create({ path: docPath, content: '{"key":"value"}', tags: [Tag.create('test')], lastModified: new Date() });
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false }; // 型を WorkspaceConfig に変更

    // モックの設定
    mockConfigProvider.getConfig.mockReturnValue(mockConfig);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`); // パスを返すように設定
    mockBranchRepository.exists.mockResolvedValue(true); // ブランチが存在する
    mockBranchRepository.getDocument.mockResolvedValue(mockDocument);

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
    mockConfigProvider.getConfig.mockReturnValue(mockConfig);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
    mockBranchRepository.exists.mockResolvedValue(true); // ブランチは存在する
    mockBranchRepository.getDocument.mockResolvedValue(null); // ドキュメントが存在しない

    // 実行＆検証
    await expect(useCase.execute({ branchName, path: docPath.value }))
      .rejects.toThrow(DomainErrors.documentNotFound(docPath.value, { branchName }));

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
    mockConfigProvider.getConfig.mockReturnValue(mockConfig);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
    mockBranchRepository.exists.mockResolvedValue(true); // ブランチは存在する
    mockBranchRepository.getDocument.mockRejectedValue(repositoryError); // getDocument でエラー発生

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
    mockConfigProvider.getConfig.mockReturnValue(mockConfig); // プロジェクトモードON
    mockGitService.getCurrentBranchName.mockResolvedValue(detectedBranchName); // ブランチ名検出成功
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${detectedBranchName}`);
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.getDocument.mockResolvedValue(mockDocument);

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
    mockConfigProvider.getConfig.mockReturnValue(mockConfig); // プロジェクトモードON
    mockGitService.getCurrentBranchName.mockRejectedValue(gitError); // ブランチ名検出失敗

    // 実行＆検証
    await expect(useCase.execute({ path: docPath.value }))
      .rejects.toThrow(ApplicationErrors.invalidInput('Branch name is required but could not be automatically determined. Please provide it explicitly or ensure you are in a Git repository.'));

    // モック呼び出し検証
    expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1);
    expect(mockConfigProvider.getConfig).toHaveBeenCalledTimes(1);
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled(); // ドキュメント取得は呼ばれない
  });

  it('branchName が省略された場合 (非プロジェクトモード) にエラーが発生すること', async () => {
    const docPath = DocumentPath.create('any.json');
    const mockConfig: WorkspaceConfig = { isProjectMode: false, language: 'en' as const, docsRoot: '/mock/docs', verbose: false }; // プロジェクトモードOFF

    // モックの設定
    mockConfigProvider.getConfig.mockReturnValue(mockConfig); // プロジェクトモードOFF

    // 実行＆検証
    await expect(useCase.execute({ path: docPath.value }))
      .rejects.toThrow(ApplicationErrors.invalidInput('Branch name is required when not running in project mode.'));

    // モック呼び出し検証
    expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled(); // ブランチ名検出は呼ばれない
    expect(mockConfigProvider.getConfig).toHaveBeenCalledTimes(1);
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });

  it('path が指定されていない場合にエラーが発生すること', async () => {
    const branchName = 'feature/test';

    // 実行＆検証 (path を undefined で渡す)
    await expect(useCase.execute({ branchName: branchName, path: undefined as any }))
      .rejects.toThrow(ApplicationErrors.invalidInput('Document path is required'));

    // モック呼び出し検証
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });

  it('ブランチが存在しない場合にエラー (BranchNotFound) が発生すること', async () => {
    const branchName = 'feature/non-existent'; // `/` を含む名前に修正
    const docPath = DocumentPath.create('any.json');
    const branchInfo = BranchInfo.create(branchName);
    const mockConfig: WorkspaceConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false };

    // モックの設定
    mockConfigProvider.getConfig.mockReturnValue(mockConfig);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
    mockBranchRepository.exists.mockResolvedValue(false); // ブランチが存在しないように設定

    // 実行＆検証
    await expect(useCase.execute({ branchName: branchName, path: docPath.value }))
      .rejects.toThrow(DomainErrors.branchNotFound(branchName));

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
    mockConfigProvider.getConfig.mockReturnValue(mockConfig);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.getDocument.mockRejectedValue(nonError); // getDocument で非 Error を reject

    // 実行＆検証
    await expect(useCase.execute({ branchName, path: docPath.value }))
      .rejects.toThrow(ApplicationErrors.executionFailed('ReadBranchDocumentUseCase')); // ApplicationError でラップされる

    // モック呼び出し検証
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath);
  });
});
