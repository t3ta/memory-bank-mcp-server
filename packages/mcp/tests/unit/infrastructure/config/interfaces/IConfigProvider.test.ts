import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import type { IConfigProvider } from '../../../../../src/infrastructure/config/interfaces/IConfigProvider.js'; // .js 追加
import type { WorkspaceConfig, CliOptions } from '../../../../../src/infrastructure/config/WorkspaceConfig.js'; // .js 追加
import type { Language } from '@memory-bank/schemas';

// IConfigProvider のモック実装を作成
// jest.Mocked を削除し、手動モックの型を指定
const mockConfigProvider: IConfigProvider = {
  initialize: vi.fn(), // jest -> vi
  getConfig: vi.fn(), // jest -> vi
  getGlobalMemoryPath: vi.fn(), // jest -> vi
  getBranchMemoryPath: vi.fn(), // jest -> vi
  getLanguage: vi.fn(), // jest -> vi
};

describe('IConfigProvider Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks(); // jest -> vi
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
    (mockConfigProvider.initialize as Mock).mockResolvedValue(expectedConfig); // as Mock 追加

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
    (mockConfigProvider.getConfig as Mock).mockReturnValue(expectedConfig); // as Mock 追加

    const config = mockConfigProvider.getConfig();
    expect(mockConfigProvider.getConfig).toHaveBeenCalled();
    expect(config).toEqual(expectedConfig);
  });
// 他の it ブロックも describe 内にあることを確認 (この diff では変更不要)

  it('should define the getGlobalMemoryPath method', () => {
    const expectedPath = '/path/to/docs/global-memory-bank';
    (mockConfigProvider.getGlobalMemoryPath as Mock).mockReturnValue(expectedPath); // as Mock 追加

    const path = mockConfigProvider.getGlobalMemoryPath();
    expect(mockConfigProvider.getGlobalMemoryPath).toHaveBeenCalled();
    expect(path).toBe(expectedPath);
  });

  it('should define the getBranchMemoryPath method', () => {
    const branchName = 'feature/new-stuff';
    const expectedPath = `/path/to/docs/branch-memory-bank/${branchName}`;
    (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(expectedPath); // as Mock 追加

    const path = mockConfigProvider.getBranchMemoryPath(branchName);
    expect(mockConfigProvider.getBranchMemoryPath).toHaveBeenCalledWith(branchName);
    expect(path).toBe(expectedPath);
  });

  it('should define the getLanguage method', () => {
    const expectedLang: Language = 'ja';
    (mockConfigProvider.getLanguage as Mock).mockReturnValue(expectedLang); // as Mock 追加

    const lang = mockConfigProvider.getLanguage();
    expect(mockConfigProvider.getLanguage).toHaveBeenCalled();
    expect(lang).toBe(expectedLang);
  });
});
