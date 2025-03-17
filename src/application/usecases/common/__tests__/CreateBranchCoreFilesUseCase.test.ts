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
  saveTagIndex: jest.fn(),
  getTagIndex: jest.fn(),
  findDocumentPathsByTagsUsingIndex: jest.fn(),
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
    expect(result.updatedFiles).toContain('activeContext.json');
    expect(result.updatedFiles).toContain('progress.json');
    expect(result.updatedFiles).toContain('systemPatterns.json');

    // Verify repository calls
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchName);
    expect(mockBranchRepository.saveDocument).toHaveBeenCalledTimes(3);

    // Check that each document was saved with the correct path and content
    const saveDocumentCalls = mockBranchRepository.saveDocument.mock.calls;

    // All calls should have the correct branch info
    expect(saveDocumentCalls[0][0]).toEqual(BranchInfo.create(branchName));
    expect(saveDocumentCalls[1][0]).toEqual(BranchInfo.create(branchName));
    expect(saveDocumentCalls[2][0]).toEqual(BranchInfo.create(branchName));

    // Check documents - verify JSON structure and content
    // First call - activeContext
    const activeContextDoc = saveDocumentCalls[0][1] as MemoryDocument;
    expect(activeContextDoc.path.value).toBe('activeContext.json');

    // Parse JSON content
    const activeContextJson = JSON.parse(activeContextDoc.content);
    expect(activeContextJson.schema).toBe('memory_document_v2');
    expect(activeContextJson.metadata.title).toBe('アクティブコンテキスト');
    expect(activeContextJson.metadata.documentType).toBe('active_context');
    expect(activeContextJson.metadata.path).toBe('activeContext.json');
    expect(activeContextJson.metadata.tags).toContain('core');
    expect(activeContextJson.metadata.tags).toContain('active-context');

    // Check content
    expect(activeContextJson.content.currentWork).toBe('Testing the feature');
    expect(activeContextJson.content.recentChanges).toHaveLength(2);
    expect(activeContextJson.content.recentChanges[0].description).toBe('Added tests');
    expect(activeContextJson.content.recentChanges[1].description).toBe('Fixed bugs');
    expect(activeContextJson.content.activeDecisions).toHaveLength(1);
    expect(activeContextJson.content.activeDecisions[0].description).toBe('Use Jest for testing');
    expect(activeContextJson.content.considerations).toHaveLength(1);
    expect(activeContextJson.content.considerations[0].description).toBe('Test coverage thresholds');
    expect(activeContextJson.content.nextSteps).toHaveLength(2);
    expect(activeContextJson.content.nextSteps[0].description).toBe('Implement more tests');
    expect(activeContextJson.content.nextSteps[1].description).toBe('Set up CI');

    // Second call - progress
    const progressDoc = saveDocumentCalls[1][1] as MemoryDocument;
    expect(progressDoc.path.value).toBe('progress.json');

    // Parse JSON content
    const progressJson = JSON.parse(progressDoc.content);
    expect(progressJson.schema).toBe('memory_document_v2');
    expect(progressJson.metadata.title).toBe('進捗状況');
    expect(progressJson.metadata.documentType).toBe('progress');
    expect(progressJson.metadata.path).toBe('progress.json');
    expect(progressJson.metadata.tags).toContain('core');
    expect(progressJson.metadata.tags).toContain('progress');

    // Check content
    expect(progressJson.content.status).toBe('In progress');
    expect(progressJson.content.workingFeatures).toHaveLength(1);
    expect(progressJson.content.workingFeatures[0].description).toBe('Basic functionality');
    expect(progressJson.content.pendingImplementation).toHaveLength(1);
    expect(progressJson.content.pendingImplementation[0].description).toBe('Advanced features');
    expect(progressJson.content.knownIssues).toHaveLength(1);
    expect(progressJson.content.knownIssues[0].description).toBe('Performance issue');

    // Third call - systemPatterns
    const systemPatternsDoc = saveDocumentCalls[2][1] as MemoryDocument;
    expect(systemPatternsDoc.path.value).toBe('systemPatterns.json');

    // Parse JSON content
    const systemPatternsJson = JSON.parse(systemPatternsDoc.content);
    expect(systemPatternsJson.schema).toBe('memory_document_v2');
    expect(systemPatternsJson.metadata.title).toBe('システムパターン');
    expect(systemPatternsJson.metadata.documentType).toBe('system_patterns');
    expect(systemPatternsJson.metadata.path).toBe('systemPatterns.json');
    expect(systemPatternsJson.metadata.tags).toContain('core');
    expect(systemPatternsJson.metadata.tags).toContain('system-patterns');

    // Check content
    expect(systemPatternsJson.content.technicalDecisions).toHaveLength(1);
    expect(systemPatternsJson.content.technicalDecisions[0].title).toBe('Test Framework');
    expect(systemPatternsJson.content.technicalDecisions[0].context).toBe('We need to choose a test framework');
    expect(systemPatternsJson.content.technicalDecisions[0].decision).toBe('We will use Jest');
    expect(systemPatternsJson.content.technicalDecisions[0].consequences.positive).toContain('Better integration with TypeScript');
    expect(systemPatternsJson.content.technicalDecisions[0].consequences.positive).toContain('Good mocking capabilities');
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
    expect(result.updatedFiles).toContain('activeContext.json');

    // Verify repository calls
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchName);
    expect(mockBranchRepository.saveDocument).toHaveBeenCalledTimes(1);

    // Check that the document was saved with the correct path and content
    const saveDocumentCalls = mockBranchRepository.saveDocument.mock.calls;

    // First call - activeContext
    const activeContextDoc = saveDocumentCalls[0][1] as MemoryDocument;
    expect(activeContextDoc.path.value).toBe('activeContext.json');

    // Parse JSON content
    const activeContextJson = JSON.parse(activeContextDoc.content);
    expect(activeContextJson.schema).toBe('memory_document_v2');
    expect(activeContextJson.metadata.title).toBe('アクティブコンテキスト');
    expect(activeContextJson.content.currentWork).toBe('Testing the feature');
    expect(activeContextJson.content.recentChanges).toHaveLength(1);
    expect(activeContextJson.content.recentChanges[0].description).toBe('Added tests');
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
    expect(result.updatedFiles).toContain('activeContext.json');
    expect(result.updatedFiles).toContain('progress.json');

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
