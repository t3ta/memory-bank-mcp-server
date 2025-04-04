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
    expect(mockBranchRepository.getRecentBranches).toHaveBeenCalledWith(5); // limit が渡されることを確認
  });

  // TODO: Add more test cases for edge cases and error handling
});
