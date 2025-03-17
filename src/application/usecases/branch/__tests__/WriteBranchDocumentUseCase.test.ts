import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { mock, instance, when, verify, anyString, anything, deepEqual, reset } from 'ts-mockito';
import { WriteBranchDocumentUseCase } from '../WriteBranchDocumentUseCase.js';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument.js';
import { BranchInfo } from '../../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../domain/entities/DocumentPath.js';
import { Tag } from '../../../../domain/entities/Tag.js';
import { DomainError } from '../../../../shared/errors/DomainError.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../shared/errors/ApplicationError.js';
import { createMockBranchRepository } from '../../../../../tests/mocks/repositories.js';
import { createTestDocument, createTestBranch } from '../../../../../tests/helpers/test-data.js';

describe('WriteBranchDocumentUseCase', () => {
  let useCase: WriteBranchDocumentUseCase;
  let mockBranchRepo;
  let branchRepoInstance;

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

    when(mockBranchRepo.exists(testBranchName)).thenResolve(true);
    when(mockBranchRepo.getDocument(deepEqual(branchInfo), deepEqual(docPath))).thenResolve(null);
    when(mockBranchRepo.saveDocument(anything(), anything())).thenResolve();

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
    verify(mockBranchRepo.getDocument(deepEqual(branchInfo), deepEqual(docPath))).once();
    verify(mockBranchRepo.saveDocument(anything(), anything())).once();
  });

  it('should initialize the branch if it does not exist', async () => {
    // Arrange
    const branchInfo = createTestBranch(testBranchName);
    const docPath = DocumentPath.create(testDocumentPath);

    when(mockBranchRepo.exists(testBranchName)).thenResolve(false);
    when(mockBranchRepo.initialize(deepEqual(branchInfo))).thenResolve();
    when(mockBranchRepo.getDocument(deepEqual(branchInfo), deepEqual(docPath))).thenResolve(null);
    when(mockBranchRepo.saveDocument(anything(), anything())).thenResolve();

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
    verify(mockBranchRepo.initialize(deepEqual(branchInfo))).once();
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

    when(mockBranchRepo.exists(testBranchName)).thenResolve(true);
    when(mockBranchRepo.getDocument(deepEqual(branchInfo), deepEqual(docPath))).thenResolve(
      existingDocument
    );
    when(mockBranchRepo.saveDocument(anything(), anything())).thenResolve();

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
    verify(mockBranchRepo.saveDocument(anything(), anything())).once();
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

    when(mockBranchRepo.exists(testBranchName)).thenResolve(true);
    when(mockBranchRepo.getDocument(deepEqual(branchInfo), deepEqual(docPath))).thenResolve(
      existingDocument
    );
    when(mockBranchRepo.saveDocument(anything(), anything())).thenResolve();

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
    verify(mockBranchRepo.saveDocument(anything(), anything())).once();
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
    verify(mockBranchRepo.exists(anyString())).never();
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
    when(mockBranchRepo.exists(testBranchName)).thenThrow(unknownError);

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
    when(mockBranchRepo.exists(testBranchName)).thenThrow(domainError);

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
