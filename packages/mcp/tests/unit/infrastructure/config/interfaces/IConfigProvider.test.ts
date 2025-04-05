import type { IConfigProvider } from '../../../../../src/infrastructure/config/interfaces/IConfigProvider';
import type { WorkspaceConfig, CliOptions } from '../../../../../src/infrastructure/config/WorkspaceConfig';
import type { Language } from '@memory-bank/schemas';

// IConfigProvider のモック実装を作成
const mockConfigProvider: jest.Mocked<IConfigProvider> = {
  initialize: jest.fn(),
  getConfig: jest.fn(),
  getGlobalMemoryPath: jest.fn(),
  getBranchMemoryPath: jest.fn(),
  getLanguage: jest.fn(),
};

describe('IConfigProvider Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
  });

  it('should define the initialize method', async () => {
    // CliOptions は docsRoot を持つ
    const options: CliOptions = { docsRoot: '/path/to/docs' };
    // WorkspaceConfig は docsRoot, verbose, language, isProjectMode を持つ
    const expectedConfig: WorkspaceConfig = {
      docsRoot: '/path/to/docs',
      verbose: false,
      language: 'en',
      isProjectMode: true,
      // workspace プロパティは WorkspaceConfig にないので削除
    };
    mockConfigProvider.initialize.mockResolvedValue(expectedConfig);

    const config = await mockConfigProvider.initialize(options);
    expect(mockConfigProvider.initialize).toHaveBeenCalledWith(options);
    expect(config).toEqual(expectedConfig);
  });
// describe ブロックはまだ閉じない


  // getConfig のテストケースを describe ブロック内に移動
  it('should define the getConfig method', () => {
    // WorkspaceConfig は docsRoot, verbose, language, isProjectMode を持つ
    const expectedConfig: WorkspaceConfig = {
      docsRoot: '/path/to/docs',
      verbose: false,
      language: 'en',
      isProjectMode: true,
    }; // ここで expectedConfig を閉じる
    mockConfigProvider.getConfig.mockReturnValue(expectedConfig);

    const config = mockConfigProvider.getConfig();
    expect(mockConfigProvider.getConfig).toHaveBeenCalled();
    expect(config).toEqual(expectedConfig);
  });
// 他の it ブロックも describe 内にあることを確認 (この diff では変更不要)

  it('should define the getGlobalMemoryPath method', () => {
    const expectedPath = '/path/to/docs/global-memory-bank';
    mockConfigProvider.getGlobalMemoryPath.mockReturnValue(expectedPath);

    const path = mockConfigProvider.getGlobalMemoryPath();
    expect(mockConfigProvider.getGlobalMemoryPath).toHaveBeenCalled();
    expect(path).toBe(expectedPath);
  });

  it('should define the getBranchMemoryPath method', () => {
    const branchName = 'feature/new-stuff';
    const expectedPath = `/path/to/docs/branch-memory-bank/${branchName}`;
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(expectedPath);

    const path = mockConfigProvider.getBranchMemoryPath(branchName);
    expect(mockConfigProvider.getBranchMemoryPath).toHaveBeenCalledWith(branchName);
    expect(path).toBe(expectedPath);
  });

  it('should define the getLanguage method', () => {
    const expectedLang: Language = 'ja';
    mockConfigProvider.getLanguage.mockReturnValue(expectedLang);

    const lang = mockConfigProvider.getLanguage();
    expect(mockConfigProvider.getLanguage).toHaveBeenCalled();
    expect(lang).toBe(expectedLang);
  });
});
