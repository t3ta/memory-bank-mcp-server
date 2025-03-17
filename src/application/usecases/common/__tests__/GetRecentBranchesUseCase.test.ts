import { GetRecentBranchesUseCase } from '../GetRecentBranchesUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../domain/repositories/IBranchMemoryBankRepository.js';
import { BranchInfo } from '../../../../domain/entities/BranchInfo.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../shared/errors/ApplicationError.js';

// Mock repository
const mockBranchRepository: jest.Mocked<IBranchMemoryBankRepository> = {
  exists: jest.fn(),
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  getRecentBranches: jest.fn(),
  validateStructure: jest.fn(),
};

describe('GetRecentBranchesUseCase', () => {
  let useCase: GetRecentBranchesUseCase;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create use case with mock repository
    useCase = new GetRecentBranchesUseCase(mockBranchRepository);
  });

  it('should get recent branches with default limit', async () => {
    // Arrange
    const mockBranches = [
      {
        branchInfo: BranchInfo.create('feature/login'),
        lastModified: new Date('2023-01-02T00:00:00.000Z'),
        summary: {
          currentWork: 'Implementing login feature',
          recentChanges: ['Added authentication', 'Fixed validation'],
        },
      },
      {
        branchInfo: BranchInfo.create('fix/auth-bug'),
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
        summary: {
          currentWork: 'Fixing auth bug',
          recentChanges: ['Identified issue', 'Started fixing'],
        },
      },
    ];

    mockBranchRepository.getRecentBranches.mockResolvedValue(mockBranches);

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result).toBeDefined();
    expect(result.branches).toHaveLength(2);
    expect(result.total).toBe(2);

    // Verify first branch data is correctly transformed
    expect(result.branches[0].name).toBe('feature/login');
    expect(result.branches[0].lastModified).toBe('2023-01-02T00:00:00.000Z');
    expect(result.branches[0].summary.currentWork).toBe('Implementing login feature');
    expect(result.branches[0].summary.recentChanges).toEqual([
      'Added authentication',
      'Fixed validation',
    ]);

    // Verify second branch data is correctly transformed
    expect(result.branches[1].name).toBe('fix/auth-bug');
    expect(result.branches[1].lastModified).toBe('2023-01-01T00:00:00.000Z');
    expect(result.branches[1].summary.currentWork).toBe('Fixing auth bug');
    expect(result.branches[1].summary.recentChanges).toEqual([
      'Identified issue',
      'Started fixing',
    ]);

    // Verify repository called with default limit
    expect(mockBranchRepository.getRecentBranches).toHaveBeenCalledWith(10);
  });

  it('should get recent branches with custom limit', async () => {
    // Arrange
    mockBranchRepository.getRecentBranches.mockResolvedValue([
      {
        branchInfo: BranchInfo.create('feature/login'),
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
        summary: {
          currentWork: 'Implementing login feature',
          recentChanges: [],
        },
      },
    ]);

    // Act
    const result = await useCase.execute({ limit: 5 });

    // Assert
    expect(result).toBeDefined();

    // Verify repository called with custom limit
    expect(mockBranchRepository.getRecentBranches).toHaveBeenCalledWith(5);
  });

  it('should handle empty result from repository', async () => {
    // Arrange
    mockBranchRepository.getRecentBranches.mockResolvedValue([]);

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result).toBeDefined();
    expect(result.branches).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should throw ApplicationError when limit is less than 1', async () => {
    // Act & Assert
    await expect(useCase.execute({ limit: 0 })).rejects.toThrow(ApplicationError);
    await expect(useCase.execute({ limit: 0 })).rejects.toThrow('Limit must be a positive number');

    try {
      await useCase.execute({ limit: -5 });
      fail('Should have thrown an error');
    } catch (error) {
      expect(error instanceof ApplicationError).toBe(true);
      expect((error as ApplicationError).code).toBe(
        `APP_ERROR.${ApplicationErrorCodes.INVALID_INPUT}`
      );
    }

    // Verify repository was not called
    expect(mockBranchRepository.getRecentBranches).not.toHaveBeenCalled();
  });

  it('should wrap repository errors as ApplicationError', async () => {
    // Arrange
    const repositoryError = new Error('Database connection failed');
    mockBranchRepository.getRecentBranches.mockRejectedValue(repositoryError);

    // Act & Assert
    await expect(useCase.execute({})).rejects.toThrow(ApplicationError);
    await expect(useCase.execute({})).rejects.toThrow(
      'Failed to get recent branches: Database connection failed'
    );

    try {
      await useCase.execute({});
      fail('Should have thrown an error');
    } catch (error) {
      expect(error instanceof ApplicationError).toBe(true);
      expect((error as ApplicationError).code).toBe(
        `APP_ERROR.${ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED}`
      );
      expect((error as ApplicationError).details).toEqual({ originalError: repositoryError });
    }
  });

  it('should pass through application errors without wrapping', async () => {
    // Arrange
    const applicationError = new ApplicationError(
      ApplicationErrorCodes.INVALID_STATE,
      'Invalid application state'
    );
    mockBranchRepository.getRecentBranches.mockRejectedValue(applicationError);

    // Act & Assert
    await expect(useCase.execute({})).rejects.toBe(applicationError); // Should be the exact same error instance
  });
});
