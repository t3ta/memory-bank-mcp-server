import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
// ts-mockito import removed;
import { WriteBranchDocumentUseCase } from '../../../../../src/application/usecases/branch/WriteBranchDocumentUseCase';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { DomainError } from '../../../../../src/shared/errors/DomainError';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../../src/shared/errors/ApplicationError';
import { createMockBranchRepository, MockBranchRepository } from '../../../../../tests/mocks/repositories';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository';
import { createTestDocument, createTestBranch } from '../../../../../tests/helpers/test-data';

describe('WriteBranchDocumentUseCase', () => {
  let useCase: WriteBranchDocumentUseCase;
  let mockBranchRepo: MockBranchRepository;
  let branchRepoInstance: IBranchMemoryBankRepository;

  // Test document data
  const testBranchName = 'feature/test';
  const testDocumentPath = 'test/document.md';
  const testDocumentContent = '# Test Document\n\nThis is a test document.';
  const testDocumentTags = ['test', 'document'];
  const testLastModified = new Date('2023-01-01T00:00:00.000Z');

  beforeEach(() => {
    // Mock current date in a predictable way
    jest.useFakeTimers();
    jest.setSystemTime(testLastModified);

    // 各テスト前にモックを作成
    const branchRepoMock = createMockBranchRepository();
    mockBranchRepo = branchRepoMock.mock;
    branchRepoInstance = branchRepoMock.instance;

    useCase = new WriteBranchDocumentUseCase(branchRepoInstance);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create a new document when it does not exist', async () => {
    // Arrange
    const branchInfo = createTestBranch(testBranchName);
    const docPath = DocumentPath.create(testDocumentPath);

    mockBranchRepo.exists = jest.fn().mockResolvedValue(true);
    mockBranchRepo.getDocument = jest.fn().mockResolvedValue(null);
    mockBranchRepo.saveDocument = jest.fn().mockResolvedValue();

    // Act
    const result = await useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent,
        tags: testDocumentTags,
      },
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.path).toBe(testDocumentPath);
    expect(result.document.content).toBe(testDocumentContent);
    expect(result.document.tags).toEqual(testDocumentTags);
    expect(result.document.lastModified).toBe(testLastModified.toISOString());

    // Verify repository calls
    verify(mockBranchRepo.exists(testBranchName)).once();
    verify(mockBranchRepo.getDocument(branchInfo, docPath)).once();
    verify(mockBranchRepo.saveDocument(expect.anything(), expect.anything())).once();
  });

  it('should initialize the branch if it does not exist', async () => {
    // Arrange
    const branchInfo = createTestBranch(testBranchName);
    const docPath = DocumentPath.create(testDocumentPath);

    mockBranchRepo.exists = jest.fn().mockResolvedValue(false);
    mockBranchRepo.initialize = jest.fn().mockResolvedValue();
    mockBranchRepo.getDocument = jest.fn().mockResolvedValue(null);
    mockBranchRepo.saveDocument = jest.fn().mockResolvedValue();

    // Act
    await useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent,
        tags: testDocumentTags,
      },
    });

    // Assert
    verify(mockBranchRepo.initialize(branchInfo)).once();
  });

  it('should update an existing document', async () => {
    // Arrange
    const branchInfo = createTestBranch(testBranchName);
    const docPath = DocumentPath.create(testDocumentPath);

    const existingDocument = MemoryDocument.create({
      path: docPath,
      content: 'Old content',
      tags: [Tag.create('old')],
      lastModified: new Date('2022-01-01T00:00:00.000Z'),
    });

    mockBranchRepo.exists = jest.fn().mockResolvedValue(true);
    when(mockBranchRepo.getDocument(branchInfo, docPath)).thenResolve(
      existingDocument
    );
    mockBranchRepo.saveDocument = jest.fn().mockResolvedValue();

    // Act
    const result = await useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent,
        tags: testDocumentTags,
      },
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.content).toBe(testDocumentContent);
    expect(result.document.tags).toEqual(testDocumentTags);

    // Verify saveDocument was called
    verify(mockBranchRepo.saveDocument(expect.anything(), expect.anything())).once();
  });

  it('should update content while preserving tags if tags are not provided', async () => {
    // Arrange
    const branchInfo = createTestBranch(testBranchName);
    const docPath = DocumentPath.create(testDocumentPath);
    const existingTags = [Tag.create('existing'), Tag.create('tags')];

    const existingDocument = MemoryDocument.create({
      path: docPath,
      content: 'Old content',
      tags: existingTags,
      lastModified: new Date('2022-01-01T00:00:00.000Z'),
    });

    mockBranchRepo.exists = jest.fn().mockResolvedValue(true);
    when(mockBranchRepo.getDocument(branchInfo, docPath)).thenResolve(
      existingDocument
    );
    mockBranchRepo.saveDocument = jest.fn().mockResolvedValue();

    // Act
    const result = await useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent,
        // No tags provided
      },
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.content).toBe(testDocumentContent);
    expect(result.document.tags).toEqual(existingTags.map((tag) => tag.value));

    // Verify saveDocument was called
    verify(mockBranchRepo.saveDocument(expect.anything(), expect.anything())).once();
  });

  it('should throw ApplicationError when branch name is empty', async () => {
    // Act & Assert
    await expect(
      useCase.execute({
        branchName: '',
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCase.execute({
        branchName: '',
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow('Branch name is required');

    // Verify repository was not called
    expect(mockBranchRepo.exists).not.toHaveBeenCalled();
  });

  it('should throw ApplicationError when document is missing', async () => {
    // Act & Assert
    await expect(
      useCase.execute({
        branchName: testBranchName,
        document: null as any,
      })
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCase.execute({
        branchName: testBranchName,
        document: null as any,
      })
    ).rejects.toThrow('Document is required');
  });

  it('should throw ApplicationError when document path is empty', async () => {
    // Act & Assert
    await expect(
      useCase.execute({
        branchName: testBranchName,
        document: {
          path: '',
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCase.execute({
        branchName: testBranchName,
        document: {
          path: '',
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow('Document path is required');
  });

  it('should throw ApplicationError when document content is missing', async () => {
    // Act & Assert
    await expect(
      useCase.execute({
        branchName: testBranchName,
        document: {
          path: testDocumentPath,
          content: null as any,
        },
      })
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCase.execute({
        branchName: testBranchName,
        document: {
          path: testDocumentPath,
          content: null as any,
        },
      })
    ).rejects.toThrow('Document content is required');
  });

  it('should wrap unknown errors as ApplicationError', async () => {
    // Arrange
    const unknownError = new Error('Something went wrong');
    mockBranchRepo.exists = jest.fn().mockImplementation(() => { throw unknownError });

    // Act & Assert
    await expect(
      useCase.execute({
        branchName: testBranchName,
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCase.execute({
        branchName: testBranchName,
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow(`Failed to write document: Something went wrong`);

    // Verify error is properly wrapped
    try {
      await useCase.execute({
        branchName: testBranchName,
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      });

      // If we get here, it means the expected error wasn't thrown
      expect('No error was thrown').toBe('Error should have been thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe(
        `APP_ERROR.${ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED}`
      );
      expect((error as ApplicationError).details).toEqual({ originalError: unknownError });
    }
  });

  it('should pass through domain errors without wrapping', async () => {
    // Arrange
    const domainError = new DomainError('INVALID_BRANCH_NAME', 'Invalid branch name format');
    mockBranchRepo.exists = jest.fn().mockImplementation(() => { throw domainError });

    // Act & Assert
    await expect(
      useCase.execute({
        branchName: testBranchName,
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow(domainError);

    await expect(
      useCase.execute({
        branchName: testBranchName,
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow('Invalid branch name format');
  });
});
