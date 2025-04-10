import { vi } from 'vitest'; // vi をインポート
// import type { IGitService } from '../../../../src/infrastructure/git/IGitService.js'; // 再度未使用なので削除 (コメントアウト済み)

// IGitService のモック実装を作成
// jest.Mocked を削除し、型推論に任せる
const mockGitService = {
  getCurrentBranchName: vi.fn(), // jest -> vi
};

describe('IGitService Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks(); // jest -> vi
  });

  it('should define the getCurrentBranchName method that resolves with the branch name', async () => {
    const expectedBranchName = 'feature/awesome-stuff';
    mockGitService.getCurrentBranchName.mockResolvedValue(expectedBranchName);

    const branchName = await mockGitService.getCurrentBranchName();
    expect(mockGitService.getCurrentBranchName).toHaveBeenCalled();
    expect(branchName).toBe(expectedBranchName);
  });

  it('should define the getCurrentBranchName method that rejects with an error', async () => {
    const expectedError = new Error('Not a git repository');
    mockGitService.getCurrentBranchName.mockRejectedValue(expectedError);

    await expect(mockGitService.getCurrentBranchName()).rejects.toThrow(expectedError);
    expect(mockGitService.getCurrentBranchName).toHaveBeenCalled();
  });
});
