import { UpdateTagIndexUseCase } from '../UpdateTagIndexUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { BranchInfo } from '../../../../domain/entities/BranchInfo.js';
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
const createTestDocument = (path: string, tags: string[]): MemoryDocument => {
  return MemoryDocument.create({
    path: DocumentPath.create(path),
    content: `# Test Document\n\nContent for ${path}`,
    tags: tags.map((t) => Tag.create(t)),
    lastModified: new Date('2023-01-01T00:00:00.000Z'),
  });
};

describe('UpdateTagIndexUseCase', () => {
  let useCase: UpdateTagIndexUseCase;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create use case with mock repositories
    useCase = new UpdateTagIndexUseCase(mockGlobalRepository, mockBranchRepository);

    // Mock Date.now() to return a consistent timestamp for testing
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2023-01-01T12:00:00.000Z');
  });

  afterEach(() => {
    // Restore Date mock
    jest.restoreAllMocks();
  });

  it('should update global tag index', async () => {
    // Arrange
    const documentPaths = [
      DocumentPath.create('doc1.md'),
      DocumentPath.create('doc2.md'),
      DocumentPath.create('doc3.md'),
    ];

    const documents = [
      createTestDocument('doc1.md', ['architecture', 'design']),
      createTestDocument('doc2.md', ['design', 'ui']),
      createTestDocument('doc3.md', ['architecture', 'pattern']),
    ];

    // Mock repository behavior
    mockGlobalRepository.listDocuments.mockResolvedValue(documentPaths);
    mockGlobalRepository.getDocument.mockImplementation(async (path: DocumentPath) => {
      const pathStr = path.value;
      if (pathStr === 'doc1.md') return documents[0];
      if (pathStr === 'doc2.md') return documents[1];
      if (pathStr === 'doc3.md') return documents[2];
      return null;
    });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result).toBeDefined();
    expect(result.tags).toHaveLength(4); // 'architecture', 'design', 'ui', 'pattern'
    expect(result.tags).toContain('architecture');
    expect(result.tags).toContain('design');
    expect(result.tags).toContain('ui');
    expect(result.tags).toContain('pattern');
    expect(result.documentCount).toBe(3);
    expect(result.updateInfo.fullRebuild).toBe(false);
    expect(result.updateInfo.updateLocation).toBe('global');
    expect(result.updateInfo.timestamp).toBe('2023-01-01T12:00:00.000Z');

    // Verify repository calls
    expect(mockGlobalRepository.listDocuments).toHaveBeenCalledTimes(1);
    expect(mockGlobalRepository.getDocument).toHaveBeenCalledTimes(3);

    // Verify branch repository was not called
    expect(mockBranchRepository.exists).not.toHaveBeenCalled();
    expect(mockBranchRepository.listDocuments).not.toHaveBeenCalled();
  });

  it('should update branch tag index', async () => {
    // Arrange
    const branchName = 'feature/login';
    const documentPaths = [DocumentPath.create('doc1.md'), DocumentPath.create('doc2.md')];

    const documents = [
      createTestDocument('doc1.md', ['feature', 'todo']),
      createTestDocument('doc2.md', ['feature', 'done']),
    ];

    // Mock repository behavior
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.listDocuments.mockResolvedValue(documentPaths);
    mockBranchRepository.getDocument.mockImplementation(
      async (branchInfo: BranchInfo, path: DocumentPath) => {
        const pathStr = path.value;
        if (pathStr === 'doc1.md') return documents[0];
        if (pathStr === 'doc2.md') return documents[1];
        return null;
      }
    );

    // Act
    const result = await useCase.execute({ branchName });

    // Assert
    expect(result).toBeDefined();
    expect(result.tags).toHaveLength(3); // 'feature', 'todo', 'done'
    expect(result.tags).toContain('feature');
    expect(result.tags).toContain('todo');
    expect(result.tags).toContain('done');
    expect(result.documentCount).toBe(2);
    expect(result.updateInfo.fullRebuild).toBe(false);
    expect(result.updateInfo.updateLocation).toBe(branchName);

    // Verify repository calls
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchName);
    expect(mockBranchRepository.listDocuments).toHaveBeenCalledTimes(1);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledTimes(2);

    // Verify global repository was not called
    expect(mockGlobalRepository.listDocuments).not.toHaveBeenCalled();
    expect(mockGlobalRepository.getDocument).not.toHaveBeenCalled();
  });

  it('should handle full rebuild option', async () => {
    // Arrange
    const documentPaths = [DocumentPath.create('doc1.md')];
    const documents = [createTestDocument('doc1.md', ['test'])];

    // Mock repository behavior
    mockGlobalRepository.listDocuments.mockResolvedValue(documentPaths);
    mockGlobalRepository.getDocument.mockImplementation(async (path: DocumentPath) => {
      const pathStr = path.value;
      if (pathStr === 'doc1.md') return documents[0];
      return null;
    });

    // Act
    const result = await useCase.execute({ fullRebuild: true });

    // Assert
    expect(result).toBeDefined();
    expect(result.updateInfo.fullRebuild).toBe(true);

    // Implementation note: Currently, the fullRebuild flag doesn't change behavior in the implementation,
    // it just gets reported in the result. In a real implementation, it might trigger different
    // index update strategies.
  });

  it('should handle documents with no tags', async () => {
    // Arrange
    const documentPaths = [DocumentPath.create('doc1.md'), DocumentPath.create('doc2.md')];

    // Create a document with no tags
    const doc1 = MemoryDocument.create({
      path: DocumentPath.create('doc1.md'),
      content: '# Test Document\n\nNo tags here',
      tags: [], // No tags
      lastModified: new Date('2023-01-01T00:00:00.000Z'),
    });

    // Create a document with tags
    const doc2 = createTestDocument('doc2.md', ['test']);

    // Mock repository behavior
    mockGlobalRepository.listDocuments.mockResolvedValue(documentPaths);
    mockGlobalRepository.getDocument.mockImplementation(async (path: DocumentPath) => {
      const pathStr = path.value;
      if (pathStr === 'doc1.md') return doc1;
      if (pathStr === 'doc2.md') return doc2;
      return null;
    });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result).toBeDefined();
    expect(result.tags).toHaveLength(1); // Only 'test'
    expect(result.tags).toContain('test');
    expect(result.documentCount).toBe(2); // Both documents are counted
  });

  it('should handle missing documents gracefully', async () => {
    // Arrange
    const documentPaths = [
      DocumentPath.create('doc1.md'),
      DocumentPath.create('doc2.md'), // This one will return null
    ];

    // Mock repository behavior
    mockGlobalRepository.listDocuments.mockResolvedValue(documentPaths);
    mockGlobalRepository.getDocument.mockImplementation(async (path: DocumentPath) => {
      const pathStr = path.value;
      if (pathStr === 'doc1.md') return createTestDocument('doc1.md', ['test']);
      return null; // doc2.md returns null
    });

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result).toBeDefined();
    expect(result.tags).toHaveLength(1); // Only 'test'
    expect(result.documentCount).toBe(2); // Both paths are counted even though one document is missing
  });

  it('should throw DomainError if branch does not exist', async () => {
    // Arrange
    const branchName = 'feature/nonexistent';

    // Mock repository behavior - branch doesn't exist
    mockBranchRepository.exists.mockResolvedValue(false);

    // Act & Assert
    await expect(useCase.execute({ branchName })).rejects.toThrow(DomainError);
    await expect(useCase.execute({ branchName })).rejects.toThrow(
      `Branch "${branchName}" not found`
    );

    try {
      await useCase.execute({ branchName });
    } catch (error) {
      expect(error instanceof DomainError).toBe(true);
      expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.BRANCH_NOT_FOUND}`);
    }

    // Verify branch repository was called to check existence but not to list documents
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchName);
    expect(mockBranchRepository.listDocuments).not.toHaveBeenCalled();
  });

  it('should handle repository errors when listing documents', async () => {
    // Arrange
    const repositoryError = new Error('Failed to list documents');
    mockGlobalRepository.listDocuments.mockRejectedValue(repositoryError);

    // Act & Assert
    await expect(useCase.execute({})).rejects.toThrow(ApplicationError);
    await expect(useCase.execute({})).rejects.toThrow(
      'Failed to update tag index: Failed to list documents'
    );

    try {
      await useCase.execute({});
    } catch (error) {
      expect(error instanceof ApplicationError).toBe(true);
      expect((error as ApplicationError).code).toBe(
        `APP_ERROR.${ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED}`
      );
      expect((error as ApplicationError).details).toEqual({ originalError: repositoryError });
    }
  });

  it('should handle repository errors when getting documents', async () => {
    // Arrange
    const documentPaths = [DocumentPath.create('doc1.md')];
    const repositoryError = new Error('Failed to get document');

    // Mock repository behavior
    mockGlobalRepository.listDocuments.mockResolvedValue(documentPaths);
    mockGlobalRepository.getDocument.mockRejectedValue(repositoryError);

    // Act & Assert
    await expect(useCase.execute({})).rejects.toThrow(ApplicationError);
    await expect(useCase.execute({})).rejects.toThrow(
      'Failed to update tag index: Failed to get document'
    );
  });

  it('should pass through domain errors from repository', async () => {
    // Arrange
    const documentPaths = [DocumentPath.create('doc1.md')];
    const domainError = new DomainError(
      DomainErrorCodes.INVALID_DOCUMENT_PATH,
      'Invalid document path'
    );

    // Mock repository behavior
    mockGlobalRepository.listDocuments.mockResolvedValue(documentPaths);
    mockGlobalRepository.getDocument.mockRejectedValue(domainError);

    // Act & Assert
    await expect(useCase.execute({})).rejects.toBe(domainError); // Should be the exact same error instance
  });

  it('should pass through application errors from repository', async () => {
    // Arrange
    const documentPaths = [DocumentPath.create('doc1.md')];
    const applicationError = new ApplicationError(
      ApplicationErrorCodes.UNKNOWN_ERROR,
      'Infrastructure error'
    );

    // Mock repository behavior
    mockGlobalRepository.listDocuments.mockResolvedValue(documentPaths);
    mockGlobalRepository.getDocument.mockRejectedValue(applicationError);

    // Act & Assert
    await expect(useCase.execute({})).rejects.toBe(applicationError); // Should be the exact same error instance
  });
});
