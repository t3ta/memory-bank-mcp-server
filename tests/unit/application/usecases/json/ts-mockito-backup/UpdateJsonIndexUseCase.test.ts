import { describe, it, expect, beforeEach, jest } from '@jest/globals';
// ts-mockito import removed;
import { UpdateJsonIndexUseCase } from '../../../../../src/application/usecases/json/UpdateJsonIndexUseCase';
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository';
import { IIndexService } from '../../../../../src/infrastructure/index/interfaces/IIndexService';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { DocumentId } from '../../../../../src/domain/entities/DocumentId';
import { JsonDocument } from '../../../../../src/domain/entities/JsonDocument';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { DomainError, DomainErrorCodes } from '../../../../../src/shared/errors/DomainError';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../../src/shared/errors/ApplicationError';

/**
 * Unit tests for UpdateJsonIndexUseCase
 * 
 * These tests verify that the UpdateJsonIndexUseCase correctly implements:
 * - Building and updating JSON document indices for branch and global memory banks
 * - Supporting full rebuild and incremental index update modes
 * - Collecting tags from documents to provide metadata about the index
 * - Input validation for branch names
 * - Integration with index service to maintain consistent indices
 * - Proper error handling for non-existent branches and other errors
 * 
 * The test uses mocked repositories and custom document fixtures to isolate the use case behavior.
 */

// Helper function to create test documents
const createTestDocuments = () => {
  // Create generic document with valid content
  const doc1 = JsonDocument.create({
    id: DocumentId.generate(),
    path: DocumentPath.create('doc1.json'),
    title: 'Document 1',
    documentType: 'generic',
    tags: [Tag.create('tag1'), Tag.create('tag2')],
    content: { someField: 'document 1', anotherField: 123 },
  });

  // Create branch_context document with valid content
  const doc2 = JsonDocument.create({
    id: DocumentId.generate(),
    path: DocumentPath.create('doc2.json'),
    title: 'Document 2',
    documentType: 'branch_context',
    tags: [Tag.create('tag2'), Tag.create('tag3')],
    content: {
      purpose: 'Test branch purpose',
      userStories: [
        {
          description: 'Test user story',
          completed: false,
        },
      ],
    },
  });

  return [doc1, doc2];
};

describe('UpdateJsonIndexUseCase', () => {
  // Mocks
  let jsonRepositoryMock: IJsonDocumentRepository;
  let globalRepositoryMock: IJsonDocumentRepository;
  let indexServiceMock: IIndexService;

  // Use case
  let useCase: UpdateJsonIndexUseCase;

  // Test data
  const testBranchName = 'feature/test';
  const testDocuments = createTestDocuments();

  beforeEach(() => {
    // Create mocks
    jsonRepositoryMock = jest.mocked<IJsonDocumentRepository>();
    globalRepositoryMock = jest.mocked<IJsonDocumentRepository>();
    indexServiceMock = jest.mocked<IIndexService>();

    // Create use case with mocks
    useCase = new UpdateJsonIndexUseCase(
      jsonRepositoryMock,
      indexServiceMock,
      globalRepositoryMock
    );
  });

  describe('Updating branch repository index', () => {
    it('should update branch index with fullRebuild', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');

      // Mock repository behavior
      when(jsonRepositoryMock.exists(branchInfo, dummyPath)).thenResolve(
        true
      );

      jsonRepositoryMock.listAll = jest.fn().mockResolvedValue(testDocuments);

      when(
        indexServiceMock.buildIndex(branchInfo, testDocuments)
      ).thenResolve();

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        fullRebuild: true,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.updateLocation).toBe(testBranchName);
      expect(result.updateInfo.fullRebuild).toBe(true);
      expect(result.updateInfo.timestamp).toBeDefined();

      // Verify repository and service methods were called
      verify(jsonRepositoryMock.exists(branchInfo, dummyPath)).once();
      verify(jsonRepositoryMock.listAll(branchInfo)).once();
      verify(indexServiceMock.buildIndex(branchInfo, testDocuments)).once();
    });

    it('should update branch index incrementally when fullRebuild is false', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');

      // Mock repository behavior
      when(jsonRepositoryMock.exists(branchInfo, dummyPath)).thenResolve(
        true
      );

      jsonRepositoryMock.listAll = jest.fn().mockResolvedValue(testDocuments);

      indexServiceMock.addToIndex = jest.fn().mockResolvedValue();

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        fullRebuild: false,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.updateLocation).toBe(testBranchName);
      expect(result.updateInfo.fullRebuild).toBe(false);

      // Verify repository and service methods were called
      verify(jsonRepositoryMock.exists(branchInfo, dummyPath)).once();
      verify(jsonRepositoryMock.listAll(branchInfo)).once();
      verify(indexServiceMock.addToIndex(branchInfo, testDocuments[0])).once();
      verify(indexServiceMock.addToIndex(branchInfo, testDocuments[1])).once();
      expect(indexServiceMock.buildIndex).not.toHaveBeenCalled();
    });

    it('should throw DomainError when branch does not exist', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');

      // Mock repository behavior
      when(jsonRepositoryMock.exists(branchInfo, dummyPath)).thenResolve(
        false
      );

      // Act & Assert
      try {
        await useCase.execute({
          branchName: testBranchName,
        });
        expect('No error thrown').toBe('Expected DomainError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).message).toBe(`Branch "${testBranchName}" not found`);
      }

      // Verify repository methods were called - we don't check the specific call count here
      // because the impl may call the method multiple times
      expect(jsonRepositoryMock.exists).toHaveBeenCalledTimes(1) // Note: Changed from atLeast to exact match;
      expect(jsonRepositoryMock.listAll).not.toHaveBeenCalled();
    });
  });

  describe('Updating global repository index', () => {
    it('should update global index with fullRebuild', async () => {
      // Arrange: Mock the UpdateJsonIndexUseCase instead of using BranchInfo for global
      // Use feature/ prefix to avoid BranchInfo validation error
      const mockBranchInfo = BranchInfo.create('feature/global');

      // Mock repository behavior
      globalRepositoryMock.listAll = jest.fn().mockResolvedValue(testDocuments);

      indexServiceMock.buildIndex = jest.fn().mockResolvedValue();

      // Act
      const result = await useCase.execute({
        fullRebuild: true,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.updateLocation).toBe('global');
      expect(result.updateInfo.fullRebuild).toBe(true);

      // Verify repository and service methods were called
      verify(globalRepositoryMock.listAll(expect.anything())).once();
      verify(indexServiceMock.buildIndex(expect.anything(), testDocuments)).once();
      expect(jsonRepositoryMock.listAll).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should pass through domain errors from repository', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const domainError = new DomainError(
        DomainErrorCodes.INVALID_BRANCH_NAME,
        'Invalid branch name'
      );

      when(jsonRepositoryMock.exists(branchInfo, dummyPath)).thenThrow(
        domainError
      );

      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
        })
      ).rejects.toBe(domainError);
    });

    it('should wrap unknown errors as ApplicationError', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const unknownError = new Error('Something went wrong');

      when(jsonRepositoryMock.exists(branchInfo, dummyPath)).thenThrow(
        unknownError
      );

      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
        })
      ).rejects.toThrow(ApplicationError);

      await expect(
        useCase.execute({
          branchName: testBranchName,
        })
      ).rejects.toThrow('Failed to update JSON index: Something went wrong');
    });
  });
});
