import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SearchDocumentsByTagsUseCase } from '../../../../../src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../../src/shared/errors/ApplicationError';
import { DomainError, DomainErrorCodes } from '../../../../../src/shared/errors/DomainError';
import { createTestDocument, createTestBranch, createTestTags } from '../../../../../tests/helpers/test-data';

/**
 * Unit tests for SearchDocumentsByTagsUseCase
 * 
 * These tests verify that the SearchDocumentsByTagsUseCase correctly implements:
 * - Searching for documents by tags in global memory bank
 * - Searching for documents by tags in specific branch memory banks
 * - Filtering documents that match all provided tags when requested
 * - Input validation for tags and branch names
 * - Proper error handling for invalid inputs and non-existent branches
 * - Proper transformation of domain entities to DTOs
 * 
 * The test uses mocked repositories to isolate the use case behavior.
 */

// Mock repositories
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

const mockGlobalRepository: jest.Mocked<IGlobalMemoryBankRepository> = {
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  updateTagsIndex: jest.fn(),
  saveTagIndex: jest.fn(),
  getTagIndex: jest.fn(),
  findDocumentPathsByTagsUsingIndex: jest.fn(),
  validateStructure: jest.fn(),
};

describe('SearchDocumentsByTagsUseCase', () => {
  let useCase: SearchDocumentsByTagsUseCase;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create use case with mock repositories
    useCase = new SearchDocumentsByTagsUseCase(mockGlobalRepository, mockBranchRepository);
  });
  it('should search documents in global memory bank', async () => {
    // Arrange
    const searchTags = ['architecture', 'design'];
    const tagObjects = createTestTags(searchTags);

    // Create test documents
    const documents = [
      createTestDocument('doc1.md', ['architecture', 'pattern']),
      createTestDocument('doc2.md', ['design', 'ui']),
      createTestDocument('doc3.md', ['architecture', 'design']),
    ];

    // Mock repository behavior
    mockGlobalRepository.findDocumentsByTags.mockResolvedValue(documents);

    // Act
    const result = await useCase.execute({ tags: searchTags });

    // Assert
    expect(result).toBeDefined();
    expect(result.documents).toHaveLength(3);
    expect(result.searchInfo.count).toBe(3);
    expect(result.searchInfo.searchedTags).toEqual(searchTags);
    expect(result.searchInfo.matchedAllTags).toBe(false);
    expect(result.searchInfo.searchLocation).toBe('global');

    // Verify repository calls
    expect(mockGlobalRepository.findDocumentsByTags).toHaveBeenCalledTimes(1);

    // Verify branch repository was not called
    expect(mockBranchRepository.exists).not.toHaveBeenCalled();
    expect(mockBranchRepository.findDocumentsByTags).not.toHaveBeenCalled();
  });

  it('should search documents in branch memory bank', async () => {
    // Arrange
    const searchTags = ['feature', 'todo'];
    const branchName = 'feature/login';
    const branchInfo = createTestBranch(branchName);

    // Create test documents
    const documents = [
      createTestDocument('doc1.md', ['feature', 'todo']),
      createTestDocument('doc2.md', ['feature', 'done']),
    ];

    // Mock repository behavior
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.findDocumentsByTags.mockResolvedValue(documents);

    // Act
    const result = await useCase.execute({ tags: searchTags, branchName });

    // Assert
    expect(result).toBeDefined();
    expect(result.documents).toHaveLength(2);
    expect(result.searchInfo.count).toBe(2);
    expect(result.searchInfo.searchedTags).toEqual(searchTags);
    expect(result.searchInfo.matchedAllTags).toBe(false);
    expect(result.searchInfo.searchLocation).toBe(branchName);

    // Verify repository calls
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchName);
    expect(mockBranchRepository.findDocumentsByTags).toHaveBeenCalledTimes(1);

    // Verify global repository was not called
    expect(mockGlobalRepository.findDocumentsByTags).not.toHaveBeenCalled();
  });

  it('should filter documents by all tags when matchAllTags is true', async () => {
    // Arrange
    const searchTags = ['architecture', 'design'];

    // Create test documents - only one has both tags
    const documents = [
      createTestDocument('doc1.md', ['architecture', 'pattern']),
      createTestDocument('doc2.md', ['design', 'ui']),
      createTestDocument('doc3.md', ['architecture', 'design']),
    ];

    // Mock repository behavior
    mockGlobalRepository.findDocumentsByTags.mockResolvedValue(documents);

    // Act
    const result = await useCase.execute({ tags: searchTags, matchAllTags: true });

    // Assert
    expect(result).toBeDefined();
    expect(result.documents).toHaveLength(1); // Only one document has both tags
    expect(result.documents[0].path).toBe('doc3.md');
    expect(result.searchInfo.count).toBe(1);
    expect(result.searchInfo.matchedAllTags).toBe(true);
  });

  it('should return correct DTOs with all expected properties', async () => {
    // Arrange
    const searchTags = ['documentation'];

    // Create test document with title
    const document = createTestDocument(
      'architecture.md',
      ['documentation', 'architecture'],
      '# Architecture Document\n\nThis is the architecture documentation.'
    );

    // Mock repository behavior
    mockGlobalRepository.findDocumentsByTags.mockResolvedValue([document]);

    // Act
    const result = await useCase.execute({ tags: searchTags });

    // Assert
    expect(result).toBeDefined();
    expect(result.documents).toHaveLength(1);

    // Check DTO properties
    const dto = result.documents[0];
    expect(dto.path).toBe('architecture.md');
    expect(dto.content).toBe('# Architecture Document\n\nThis is the architecture documentation.');
    expect(dto.tags).toEqual(['documentation', 'architecture']);
    expect(dto.lastModified).toBe('2023-01-01T00:00:00.000Z');
  });

  it('should throw ApplicationError if no tags provided', async () => {
    // Arrange
    const input = { tags: [] };

    // Act & Assert
    await expect(useCase.execute(input)).rejects.toThrow(ApplicationError);
    await expect(useCase.execute(input)).rejects.toThrow(
      'At least one tag must be provided for search'
    );

    try {
      await useCase.execute(input);
    } catch (error) {
      expect(error instanceof ApplicationError).toBe(true);
      expect((error as ApplicationError).code).toBe(
        `APP_ERROR.${ApplicationErrorCodes.INVALID_INPUT}`
      );
    }

    // Verify repositories were not called
    expect(mockGlobalRepository.findDocumentsByTags).not.toHaveBeenCalled();
    expect(mockBranchRepository.findDocumentsByTags).not.toHaveBeenCalled();
  });

  it('should throw DomainError if branch does not exist', async () => {
    // Arrange
    const searchTags = ['feature'];
    const branchName = 'feature/nonexistent';

    // Mock repository behavior - branch doesn't exist
    mockBranchRepository.exists.mockResolvedValue(false);

    // Act & Assert
    await expect(useCase.execute({ tags: searchTags, branchName })).rejects.toThrow(DomainError);
    await expect(useCase.execute({ tags: searchTags, branchName })).rejects.toThrow(
      `Branch "${branchName}" not found`
    );

    try {
      await useCase.execute({ tags: searchTags, branchName });
    } catch (error) {
      expect(error instanceof DomainError).toBe(true);
      expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.BRANCH_NOT_FOUND}`);
    }

    // Verify branch repository was called to check existence but not to find documents
    expect(mockBranchRepository.exists).toHaveBeenCalled();
    expect(mockBranchRepository.findDocumentsByTags).not.toHaveBeenCalled();
  });

  it('should throw DomainError if tag is invalid', async () => {
    // Arrange
    const searchTags = ['invalid tag with spaces']; // Invalid tag

    // Act & Assert
    await expect(useCase.execute({ tags: searchTags })).rejects.toThrow(DomainError);
    await expect(useCase.execute({ tags: searchTags })).rejects.toThrow(
      'Tag must contain only lowercase letters, numbers, and hyphens'
    );

    // Verify repositories were not called
    expect(mockGlobalRepository.findDocumentsByTags).not.toHaveBeenCalled();
  });

  it('should handle case with no matching documents', async () => {
    // Arrange
    const searchTags = ['nonexistent'];

    // Mock repository behavior - no matching documents
    mockGlobalRepository.findDocumentsByTags.mockResolvedValue([]);

    // Act
    const result = await useCase.execute({ tags: searchTags });

    // Assert
    expect(result).toBeDefined();
    expect(result.documents).toHaveLength(0);
    expect(result.searchInfo.count).toBe(0);
  });

  it('should handle repository errors', async () => {
    // Arrange
    const searchTags = ['feature'];

    // Mock repository behavior - error
    const repositoryError = new Error('Database connection failed');
    mockGlobalRepository.findDocumentsByTags.mockImplementation(() => {
      throw repositoryError;
    });

    // Act & Assert
    await expect(useCase.execute({ tags: searchTags })).rejects.toThrow(ApplicationError);
    await expect(useCase.execute({ tags: searchTags })).rejects.toThrow(
      'Failed to search documents by tags: Database connection failed'
    );

    try {
      await useCase.execute({ tags: searchTags });
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
    const searchTags = ['feature'];

    // Mock repository behavior - domain error
    const domainError = new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Invalid tag format');
    mockGlobalRepository.findDocumentsByTags.mockImplementation(() => {
      throw domainError;
    });

    // Act & Assert
    await expect(useCase.execute({ tags: searchTags })).rejects.toThrow(domainError);
  });

  it('should pass through application errors from repository', async () => {
    // Arrange
    const searchTags = ['feature'];

    // Mock repository behavior - application error
    const applicationError = new ApplicationError(
      ApplicationErrorCodes.UNKNOWN_ERROR,
      'Infrastructure error'
    );
    mockGlobalRepository.findDocumentsByTags.mockImplementation(() => {
      throw applicationError;
    });

    // Act & Assert
    await expect(useCase.execute({ tags: searchTags })).rejects.toThrow(applicationError);
  });
});
