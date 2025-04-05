import type { IGitService } from '../../../../src/infrastructure/git/IGitService';

// IGitService のモック実装を作成
const mockGitService: jest.Mocked<IGitService> = {
  getCurrentBranchName: jest.fn(),
};

describe('IGitService Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
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
