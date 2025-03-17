import { describe, it, expect, beforeEach } from '@jest/globals';
import { mock, instance, when, verify, anyString, anything, deepEqual, reset } from 'ts-mockito';
import { SearchDocumentsByTagsUseCase } from '../SearchDocumentsByTagsUseCase.js';
import { BranchInfo } from '../../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../domain/entities/DocumentPath.js';
import { Tag } from '../../../../domain/entities/Tag.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../shared/errors/ApplicationError.js';
import { DomainError, DomainErrorCodes } from '../../../../shared/errors/DomainError.js';
import {
  createMockBranchRepository,
  createMockGlobalRepository,
} from '../../../../../tests/mocks/repositories.js';
import {
  createTestDocument,
  createTestBranch,
  createTestTags,
} from '../../../../../tests/helpers/test-data.js';

describe('SearchDocumentsByTagsUseCase', () => {
  let useCase: SearchDocumentsByTagsUseCase;
  let mockBranchRepo;
  let mockGlobalRepo;
  let branchRepoInstance;
  let globalRepoInstance;

  beforeEach(() => {
    // 各テスト前にモックを作成
    const branchRepoMock = createMockBranchRepository();
    const globalRepoMock = createMockGlobalRepository();

    mockBranchRepo = branchRepoMock.mock;
    mockGlobalRepo = globalRepoMock.mock;
    branchRepoInstance = branchRepoMock.instance;
    globalRepoInstance = globalRepoMock.instance;

    useCase = new SearchDocumentsByTagsUseCase(globalRepoInstance, branchRepoInstance);
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
    when(mockGlobalRepo.findDocumentsByTags(anything())).thenResolve(documents);

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
    verify(mockGlobalRepo.findDocumentsByTags(anything())).once();

    // Verify branch repository was not called
    verify(mockBranchRepo.exists(anyString())).never();
    verify(mockBranchRepo.findDocumentsByTags(anything(), anything())).never();
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
    when(mockBranchRepo.exists(branchName)).thenResolve(true);
    when(mockBranchRepo.findDocumentsByTags(anything(), anything())).thenResolve(documents);

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
    verify(mockBranchRepo.exists(branchName)).once();
    verify(mockBranchRepo.findDocumentsByTags(anything(), anything())).once();

    // Verify global repository was not called
    verify(mockGlobalRepo.findDocumentsByTags(anything())).never();
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
    when(mockGlobalRepo.findDocumentsByTags(anything())).thenResolve(documents);

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
    when(mockGlobalRepo.findDocumentsByTags(anything())).thenResolve([document]);

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
    verify(mockGlobalRepo.findDocumentsByTags(anything())).never();
    verify(mockBranchRepo.findDocumentsByTags(anything(), anything())).never();
  });

  it('should throw DomainError if branch does not exist', async () => {
    // Arrange
    const searchTags = ['feature'];
    const branchName = 'feature/nonexistent';

    // Mock repository behavior - branch doesn't exist
    when(mockBranchRepo.exists(branchName)).thenResolve(false);

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
    verify(mockBranchRepo.exists(branchName)).called();
    verify(mockBranchRepo.findDocumentsByTags(anything(), anything())).never();
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
    verify(mockGlobalRepo.findDocumentsByTags(anything())).never();
  });

  it('should handle case with no matching documents', async () => {
    // Arrange
    const searchTags = ['nonexistent'];

    // Mock repository behavior - no matching documents
    when(mockGlobalRepo.findDocumentsByTags(anything())).thenResolve([]);

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
    when(mockGlobalRepo.findDocumentsByTags(anything())).thenThrow(repositoryError);

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
    when(mockGlobalRepo.findDocumentsByTags(anything())).thenThrow(domainError);

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
    when(mockGlobalRepo.findDocumentsByTags(anything())).thenThrow(applicationError);

    // Act & Assert
    await expect(useCase.execute({ tags: searchTags })).rejects.toThrow(applicationError);
  });
});
