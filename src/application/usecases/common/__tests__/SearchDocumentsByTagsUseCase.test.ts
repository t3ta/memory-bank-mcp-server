import { SearchDocumentsByTagsUseCase } from '../SearchDocumentsByTagsUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { DocumentPath } from '../../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../../domain/entities/Tag.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../shared/errors/ApplicationError.js';
import { DomainError, DomainErrorCodes } from '../../../../shared/errors/DomainError.js';

// Mock repositories
const mockGlobalRepository: jest.Mocked<IGlobalMemoryBankRepository> = {
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  validateStructure: jest.fn(),
  updateTagsIndex: jest.fn(),
};

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

// Helper function to create test documents
const createTestDocument = (
  path: string,
  tags: string[],
  content: string = `# Test Document\n\nContent for ${path}`
): MemoryDocument => {
  return MemoryDocument.create({
    path: DocumentPath.create(path),
    content,
    tags: tags.map((t) => Tag.create(t)),
    lastModified: new Date('2023-01-01T00:00:00.000Z'),
  });
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

    // Check that findDocumentsByTags was called with correct tags
    const callTags = mockGlobalRepository.findDocumentsByTags.mock.calls[0][0];
    expect(callTags).toHaveLength(2);
    expect(callTags[0].value).toBe('architecture');
    expect(callTags[1].value).toBe('design');

    // Verify branch repository was not called
    expect(mockBranchRepository.exists).not.toHaveBeenCalled();
    expect(mockBranchRepository.findDocumentsByTags).not.toHaveBeenCalled();
  });

  it('should search documents in branch memory bank', async () => {
    // Arrange
    const searchTags = ['feature', 'todo'];
    const branchName = 'feature/login';

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
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchName);
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
    mockGlobalRepository.findDocumentsByTags.mockRejectedValue(repositoryError);

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
    mockGlobalRepository.findDocumentsByTags.mockRejectedValue(domainError);

    // Act & Assert
    await expect(useCase.execute({ tags: searchTags })).rejects.toBe(domainError); // Should be the exact same error instance
  });

  it('should pass through application errors from repository', async () => {
    // Arrange
    const searchTags = ['feature'];

    // Mock repository behavior - application error
    const applicationError = new ApplicationError(
      ApplicationErrorCodes.UNKNOWN_ERROR,
      'Infrastructure error'
    );
    mockGlobalRepository.findDocumentsByTags.mockRejectedValue(applicationError);

    // Act & Assert
    await expect(useCase.execute({ tags: searchTags })).rejects.toBe(applicationError); // Should be the exact same error instance
  });
});
