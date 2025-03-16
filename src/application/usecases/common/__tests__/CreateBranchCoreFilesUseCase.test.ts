import { CreateBranchCoreFilesUseCase } from '../CreateBranchCoreFilesUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../domain/repositories/IBranchMemoryBankRepository.js';
import { BranchInfo } from '../../../../domain/entities/BranchInfo.js';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../shared/errors/ApplicationError.js';
import { DomainError, DomainErrorCodes } from '../../../../shared/errors/DomainError.js';

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

describe('CreateBranchCoreFilesUseCase', () => {
  let useCase: CreateBranchCoreFilesUseCase;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create use case with mock repository
    useCase = new CreateBranchCoreFilesUseCase(mockBranchRepository);
  });

  it('should create all core files when provided with complete data', async () => {
    // Arrange
    const branchName = 'feature/test';
    const input = {
      branchName,
      files: {
        activeContext: {
          currentWork: 'Testing the feature',
          recentChanges: ['Added tests', 'Fixed bugs'],
          activeDecisions: ['Use Jest for testing'],
          considerations: ['Test coverage thresholds'],
          nextSteps: ['Implement more tests', 'Set up CI'],
        },
        progress: {
          status: 'In progress',
          workingFeatures: ['Basic functionality'],
          pendingImplementation: ['Advanced features'],
          knownIssues: ['Performance issue'],
        },
        systemPatterns: {
          technicalDecisions: [
            {
              title: 'Test Framework',
              context: 'We need to choose a test framework',
              decision: 'We will use Jest',
              consequences: ['Better integration with TypeScript', 'Good mocking capabilities'],
            },
          ],
        },
      },
    };

    // Mock repository behavior
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.saveDocument.mockResolvedValue();

    // Act
    const result = await useCase.execute(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.message).toContain('Successfully updated 3 core files');
    expect(result.updatedFiles).toHaveLength(3);
    expect(result.updatedFiles).toContain('activeContext.md');
    expect(result.updatedFiles).toContain('progress.md');
    expect(result.updatedFiles).toContain('systemPatterns.md');

    // Verify repository calls
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchName);
    expect(mockBranchRepository.saveDocument).toHaveBeenCalledTimes(3);

    // Check that each document was saved with the correct path and content
    const saveDocumentCalls = mockBranchRepository.saveDocument.mock.calls;

    // All calls should have the correct branch info
    expect(saveDocumentCalls[0][0]).toEqual(BranchInfo.create(branchName));
    expect(saveDocumentCalls[1][0]).toEqual(BranchInfo.create(branchName));
    expect(saveDocumentCalls[2][0]).toEqual(BranchInfo.create(branchName));

    // Check documents - this is more complex as we just want to verify specific properties
    // First call - activeContext
    const activeContextDoc = saveDocumentCalls[0][1] as MemoryDocument;
    expect(activeContextDoc.path.value).toBe('activeContext.md');
    expect(activeContextDoc.content).toContain('# アクティブコンテキスト');
    expect(activeContextDoc.content).toContain('Testing the feature');
    expect(activeContextDoc.content).toContain('Added tests');
    expect(activeContextDoc.content).toContain('Fixed bugs');
    expect(activeContextDoc.content).toContain('Use Jest for testing');
    expect(activeContextDoc.content).toContain('Test coverage thresholds');
    expect(activeContextDoc.content).toContain('Implement more tests');
    expect(activeContextDoc.content).toContain('Set up CI');

    // Second call - progress
    const progressDoc = saveDocumentCalls[1][1] as MemoryDocument;
    expect(progressDoc.path.value).toBe('progress.md');
    expect(progressDoc.content).toContain('# 進捗状況');
    expect(progressDoc.content).toContain('In progress');
    expect(progressDoc.content).toContain('Basic functionality');
    expect(progressDoc.content).toContain('Advanced features');
    expect(progressDoc.content).toContain('Performance issue');

    // Third call - systemPatterns
    const systemPatternsDoc = saveDocumentCalls[2][1] as MemoryDocument;
    expect(systemPatternsDoc.path.value).toBe('systemPatterns.md');
    expect(systemPatternsDoc.content).toContain('# システムパターン');
    expect(systemPatternsDoc.content).toContain('Test Framework');
    expect(systemPatternsDoc.content).toContain('We need to choose a test framework');
    expect(systemPatternsDoc.content).toContain('We will use Jest');
    expect(systemPatternsDoc.content).toContain('Better integration with TypeScript');
    expect(systemPatternsDoc.content).toContain('Good mocking capabilities');
  });

  it('should create only specified core files', async () => {
    // Arrange
    const branchName = 'feature/test';
    const input = {
      branchName,
      files: {
        activeContext: {
          currentWork: 'Testing the feature',
          recentChanges: ['Added tests'],
        },
        // No progress or systemPatterns
      },
    };

    // Mock repository behavior
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.saveDocument.mockResolvedValue();

    // Act
    const result = await useCase.execute(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.message).toContain('Successfully updated 1 core files');
    expect(result.updatedFiles).toHaveLength(1);
    expect(result.updatedFiles).toContain('activeContext.md');

    // Verify repository calls
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchName);
    expect(mockBranchRepository.saveDocument).toHaveBeenCalledTimes(1);

    // Check that the document was saved with the correct path and content
    const saveDocumentCalls = mockBranchRepository.saveDocument.mock.calls;

    // First call - activeContext
    const activeContextDoc = saveDocumentCalls[0][1] as MemoryDocument;
    expect(activeContextDoc.path.value).toBe('activeContext.md');
    expect(activeContextDoc.content).toContain('# アクティブコンテキスト');
    expect(activeContextDoc.content).toContain('Testing the feature');
    expect(activeContextDoc.content).toContain('Added tests');
  });

  it('should handle empty lists in input data', async () => {
    // Arrange
    const branchName = 'feature/test';
    const input = {
      branchName,
      files: {
        activeContext: {
          currentWork: 'Testing',
          recentChanges: [],
          activeDecisions: [],
          considerations: [],
          nextSteps: [],
        },
        progress: {
          status: 'In progress',
          workingFeatures: [],
          pendingImplementation: [],
          knownIssues: [],
        },
      },
    };

    // Mock repository behavior
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.saveDocument.mockResolvedValue();

    // Act
    const result = await useCase.execute(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.message).toContain('Successfully updated 2 core files');
    expect(result.updatedFiles).toHaveLength(2);
    expect(result.updatedFiles).toContain('activeContext.md');
    expect(result.updatedFiles).toContain('progress.md');

    // Verify repository calls
    expect(mockBranchRepository.saveDocument).toHaveBeenCalledTimes(2);
  });

  it('should throw ApplicationError if no branch name provided', async () => {
    // Arrange
    const input = {
      branchName: '',
      files: {
        activeContext: {
          currentWork: 'Testing',
        },
      },
    };

    // Act & Assert
    await expect(useCase.execute(input)).rejects.toThrow(ApplicationError);
    await expect(useCase.execute(input)).rejects.toThrow('Branch name is required');

    try {
      await useCase.execute(input);
    } catch (error) {
      expect(error instanceof ApplicationError).toBe(true);
      expect((error as ApplicationError).code).toBe(
        `APP_ERROR.${ApplicationErrorCodes.INVALID_INPUT}`
      );
    }

    // Verify repository was not called
    expect(mockBranchRepository.exists).not.toHaveBeenCalled();
    expect(mockBranchRepository.saveDocument).not.toHaveBeenCalled();
  });

  it('should throw ApplicationError if no files data provided', async () => {
    // Arrange
    const input = {
      branchName: 'feature/test',
      files: undefined as any,
    };

    // Act & Assert
    await expect(useCase.execute(input)).rejects.toThrow(ApplicationError);
    await expect(useCase.execute(input)).rejects.toThrow('Core files data is required');

    // Verify repository was not called
    expect(mockBranchRepository.exists).not.toHaveBeenCalled();
    expect(mockBranchRepository.saveDocument).not.toHaveBeenCalled();
  });

  it('should throw DomainError if branch does not exist', async () => {
    // Arrange
    const branchName = 'feature/nonexistent';
    const input = {
      branchName,
      files: {
        activeContext: {
          currentWork: 'Testing',
        },
      },
    };

    // Mock repository behavior - branch doesn't exist
    mockBranchRepository.exists.mockResolvedValue(false);

    // Act & Assert
    await expect(useCase.execute(input)).rejects.toThrow(DomainError);
    await expect(useCase.execute(input)).rejects.toThrow(`Branch "${branchName}" not found`);

    try {
      await useCase.execute(input);
    } catch (error) {
      expect(error instanceof DomainError).toBe(true);
      expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.BRANCH_NOT_FOUND}`);
    }

    // Verify repository was called to check existence but not to save
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchName);
    expect(mockBranchRepository.saveDocument).not.toHaveBeenCalled();
  });

  it('should handle repository errors', async () => {
    // Arrange
    const branchName = 'feature/test';
    const input = {
      branchName,
      files: {
        activeContext: {
          currentWork: 'Testing',
        },
      },
    };

    // Mock repository behavior - error during save
    mockBranchRepository.exists.mockResolvedValue(true);
    const repositoryError = new Error('Storage error');
    mockBranchRepository.saveDocument.mockRejectedValue(repositoryError);

    // Act & Assert
    await expect(useCase.execute(input)).rejects.toThrow(ApplicationError);
    await expect(useCase.execute(input)).rejects.toThrow(
      'Failed to create/update core files: Storage error'
    );

    try {
      await useCase.execute(input);
    } catch (error) {
      expect(error instanceof ApplicationError).toBe(true);
      expect((error as ApplicationError).code).toBe(
        `APP_ERROR.${ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED}`
      );
      expect((error as ApplicationError).details).toEqual({ originalError: repositoryError });
    }
  });

  it('should pass through domain errors from repository', async () => {
    // Arrange
    const branchName = 'feature/test';
    const input = {
      branchName,
      files: {
        activeContext: {
          currentWork: 'Testing',
        },
      },
    };

    // Mock repository behavior - domain error during repository operation
    mockBranchRepository.exists.mockResolvedValue(true);
    const domainError = new DomainError(
      DomainErrorCodes.INVALID_DOCUMENT_PATH,
      'Invalid document path'
    );
    mockBranchRepository.saveDocument.mockRejectedValue(domainError);

    // Act & Assert
    await expect(useCase.execute(input)).rejects.toBe(domainError); // Should be the exact same error instance
  });

  it('should pass through application errors from repository', async () => {
    // Arrange
    const branchName = 'feature/test';
    const input = {
      branchName,
      files: {
        activeContext: {
          currentWork: 'Testing',
        },
      },
    };

    // Mock repository behavior - application error during repository operation
    mockBranchRepository.exists.mockResolvedValue(true);
    const applicationError = new ApplicationError(
      ApplicationErrorCodes.UNKNOWN_ERROR,
      'Infrastructure error'
    );
    mockBranchRepository.saveDocument.mockRejectedValue(applicationError);

    // Act & Assert
    await expect(useCase.execute(input)).rejects.toBe(applicationError); // Should be the exact same error instance
  });
});
