import { GetRecentBranchesUseCase } from '../../../../../src/application/usecases/common/GetRecentBranchesUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { mock } from 'jest-mock-extended';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';

describe('GetRecentBranchesUseCase', () => {
  let useCase: GetRecentBranchesUseCase;
  let mockBranchRepository: jest.Mocked<IBranchMemoryBankRepository>;

  beforeEach(() => {
    mockBranchRepository = mock<IBranchMemoryBankRepository>();
    useCase = new GetRecentBranchesUseCase(mockBranchRepository);
  });

  it('should return a list of recent branches', async () => {
    // Arrange
    const mockRecentBranches = [
      { branchInfo: BranchInfo.create('feature/branch-1'), lastModified: new Date(), summary: { currentWork: 'Task 1', recentChanges: [] } },
      { branchInfo: BranchInfo.create('feature/branch-2'), lastModified: new Date(), summary: { currentWork: 'Task 2', recentChanges: [] } },
    ];
    mockBranchRepository.getRecentBranches.mockResolvedValue(mockRecentBranches);

    // Act
    const result = await useCase.execute({ limit: 5 });

    // Assert
    expect(result.branches).toHaveLength(2);
    expect(result.branches[0].name).toBe('feature/branch-1');
    expect(result.branches[1].name).toBe('feature/branch-2');
    expect(mockBranchRepository.getRecentBranches).toHaveBeenCalledWith(5); // limit が渡されることを確認
  });

  it('should return an empty list if no recent branches found', async () => {
    // Arrange
    mockBranchRepository.getRecentBranches.mockResolvedValue([]);

    // Act
    const result = await useCase.execute({ limit: 5 });

    // Assert
    expect(result.branches).toHaveLength(0);
    expect(mockBranchRepository.getRecentBranches).toHaveBeenCalledWith(5);
  });

  it('should use default limit (10) if limit is not provided', async () => {
    // Arrange
    mockBranchRepository.getRecentBranches.mockResolvedValue([]); // 結果は空で良い

    // Act
    await useCase.execute({}); // limit を指定しない

    // Assert
    expect(mockBranchRepository.getRecentBranches).toHaveBeenCalledWith(10); // デフォルト値10が使われるはず
  });

  it('should throw ApplicationError if limit is less than 1', async () => {
    // Act & Assert
    try {
      await useCase.execute({ limit: 0 });
      throw new Error('Expected ApplicationError for limit 0');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty('code', 'APP_ERROR.INVALID_INPUT'); // プレフィックス付きで比較
      expect((error as Error).message).toBe('Limit must be a positive number');
    }
    try {
      await useCase.execute({ limit: -1 });
      throw new Error('Expected ApplicationError for limit -1');
    } catch (error) {
       expect(error).toBeInstanceOf(Error);
       expect(error).toHaveProperty('code', 'APP_ERROR.INVALID_INPUT'); // プレフィックス付きで比較
       expect((error as Error).message).toBe('Limit must be a positive number');
    }
    expect(mockBranchRepository.getRecentBranches).not.toHaveBeenCalled();
  });

   it('should throw ApplicationError if repository throws error', async () => {
    // Arrange
    const repoError = new Error('Database connection failed');
    mockBranchRepository.getRecentBranches.mockRejectedValue(repoError);

    // Act & Assert
    try {
      await useCase.execute({ limit: 5 });
      throw new Error('Expected ApplicationError to be thrown');
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toHaveProperty('code', 'APP_ERROR.USE_CASE_EXECUTION_FAILED'); // プレフィックス付きで比較
        expect((error as Error).message).toContain('Failed to get recent branches: Database connection failed');
        // originalError のチェックも追加した方がより確実だけど、一旦省略
    }
     expect(mockBranchRepository.getRecentBranches).toHaveBeenCalledWith(5); // リポジトリは呼ばれるはず
  });
});
