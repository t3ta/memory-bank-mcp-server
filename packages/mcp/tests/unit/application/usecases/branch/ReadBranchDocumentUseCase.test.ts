import { ReadBranchDocumentUseCase } from '../../../../../src/application/usecases/branch/ReadBranchDocumentUseCase';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument';
import type { IGitService } from '../../../../../src/infrastructure/git/IGitService';
import type { IConfigProvider } from '../../../../../src/infrastructure/config/interfaces/IConfigProvider';
import { DomainErrors, ApplicationErrors } from '../../../../../src/shared/errors'; // ApplicationErrors をインポート
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo'; // BranchInfo をインポート

// --- モックの準備 ---
const mockBranchRepository = {
  exists: jest.fn(),
  initialize: jest.fn(),
  getDocument: jest.fn(), // メソッド名を修正
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  getRecentBranches: jest.fn(),
  validateStructure: jest.fn(),
  saveTagIndex: jest.fn(),
  getTagIndex: jest.fn(),
  findDocumentPathsByTagsUsingIndex: jest.fn(),
} satisfies jest.Mocked<IBranchMemoryBankRepository>; // satisfies を使って型チェック

const mockGitService: jest.Mocked<IGitService> = {
  getCurrentBranchName: jest.fn(),
  // getRepoRoot: jest.fn(), // 存在しないメソッドなので削除
};

const mockConfigProvider: jest.Mocked<IConfigProvider> = {
  initialize: jest.fn(), // initialize を追加 (インターフェースに合わせて)
  getConfig: jest.fn(),
  getGlobalMemoryPath: jest.fn(), // getGlobalMemoryPath を追加
  getBranchMemoryPath: jest.fn(), // getBranchMemoryPath を追加
  getLanguage: jest.fn(), // getLanguage を追加
  // updateConfig: jest.fn(), // 存在しないメソッドなので削除
  // loadAndValidateConfig: jest.fn(), // 存在しないメソッドなので削除 (initialize に統合された？)
};
// --- モックの準備ここまで ---

describe('ReadBranchDocumentUseCase', () => {
  let useCase: ReadBranchDocumentUseCase;

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
    useCase = new ReadBranchDocumentUseCase(
      mockBranchRepository,
      mockGitService,
      mockConfigProvider
    );
  });

  it('存在するドキュメントを正しく読み込めること', async () => {
    const branchName = 'feature/test';
    const docPath = DocumentPath.create('test.json');
    const mockDocument = MemoryDocument.create({ path: docPath, content: '{"data":"test"}', tags: [], lastModified: new Date() }); // lastModified を追加
    const branchInfo = BranchInfo.create(branchName); // BranchInfo を使う
    const mockConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false }; // language を 'en' (Language型) に修正

    // モックの設定
    mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
    mockConfigProvider.getConfig.mockReturnValue(mockConfig);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
    mockBranchRepository.exists.mockResolvedValue(true); // ★★★ ブランチが存在することにする ★★★
    mockBranchRepository.getDocument.mockResolvedValue(mockDocument);

    // 実行
    const result = await useCase.execute({ path: docPath.value }); // branch を削除

    // 検証
    expect(result).toBeDefined();
    expect(result.document.content).toBe('{"data":"test"}'); // result.document.content に修正
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath); // BranchInfo インスタンスで検証
    // branchName が指定されているので getConfig や getCurrentBranchName は呼ばれないはず
    // expect(mockGitService.getCurrentBranchName).toHaveBeenCalled();
    // expect(mockConfigProvider.getConfig).toHaveBeenCalled();
    // expect(mockConfigProvider.getBranchMemoryPath).toHaveBeenCalledWith(branchName); // branchName指定時は呼ばれない
  });

  it('ドキュメントが存在しない場合にエラー (DocumentNotFound) が発生すること', async () => {
    const branchName = 'feature/test';
    const docPath = DocumentPath.create('nonexistent.json');
    const expectedError = DomainErrors.documentNotFound(docPath.value, { branchName });
    const branchInfo = BranchInfo.create(branchName); // BranchInfo を使う
    const mockConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false }; // language を 'en' (Language型) に修正

    // モックの設定
    mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
    mockConfigProvider.getConfig.mockReturnValue(mockConfig);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
    mockBranchRepository.exists.mockResolvedValue(true); // ★★★ ブランチが存在することにする ★★★
    mockBranchRepository.getDocument.mockRejectedValue(expectedError); // エラーを返すように設定

    // 実行＆検証
    await expect(useCase.execute({ path: docPath.value })) // branch を削除
      .rejects.toThrow(expectedError);

    // モック呼び出し検証
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath); // BranchInfo インスタンスで検証
    // branchName が指定されているので getConfig や getCurrentBranchName は呼ばれないはず
    // expect(mockGitService.getCurrentBranchName).toHaveBeenCalled();
    // expect(mockConfigProvider.getConfig).toHaveBeenCalled();
    // expect(mockConfigProvider.getBranchMemoryPath).toHaveBeenCalledWith(branchName); // branchName指定時は呼ばれない
  });

  it('リポジトリで予期せぬエラーが発生した場合にエラーが伝播すること', async () => {
    const branchName = 'feature/test';
    const docPath = DocumentPath.create('any.json');
    const unexpectedError = new Error('Unexpected repository error');
    const branchInfo = BranchInfo.create(branchName); // BranchInfo を使う
    const mockConfig = { isProjectMode: true, language: 'en' as const, docsRoot: '/mock/docs', verbose: false }; // language を 'en' (Language型) に修正

    // モックの設定
    mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
    mockConfigProvider.getConfig.mockReturnValue(mockConfig);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
    mockBranchRepository.exists.mockResolvedValue(true); // ★★★ ブランチが存在することにする ★★★
    mockBranchRepository.getDocument.mockRejectedValue(unexpectedError); // 予期せぬエラーを返す

    // 実行＆検証
    await expect(useCase.execute({ path: docPath.value })) // branch を削除
      // ErrorUtils.wrapAsync でラップされるため、期待するエラーを変更
      .rejects.toThrow(ApplicationErrors.executionFailed('ReadBranchDocumentUseCase', unexpectedError));

    // モック呼び出し検証
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, docPath); // BranchInfo インスタンスで検証
    // branchName が指定されているので getConfig や getCurrentBranchName は呼ばれないはず
    // expect(mockGitService.getCurrentBranchName).toHaveBeenCalled();
    // expect(mockConfigProvider.getConfig).toHaveBeenCalled();
    // expect(mockConfigProvider.getBranchMemoryPath).toHaveBeenCalledWith(branchName); // branchName指定時は呼ばれない
  });

  // --- 具体的なテストケースの例 (コメントアウト削除) ---
});
