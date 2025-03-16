import { describe, it, expect, beforeEach } from '@jest/globals';
import { mock, instance, when, verify, anyString, anything, deepEqual, reset } from 'ts-mockito';
import { UpdateJsonIndexUseCase } from '../UpdateJsonIndexUseCase.js';
import { IJsonDocumentRepository } from '../../../../domain/repositories/IJsonDocumentRepository.js';
import { IIndexService } from '../../../../infrastructure/index/interfaces/IIndexService.js';
import { BranchInfo } from '../../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../domain/entities/DocumentPath.js';
import { DocumentId } from '../../../../domain/entities/DocumentId.js';
import { JsonDocument } from '../../../../domain/entities/JsonDocument.js';
import { Tag } from '../../../../domain/entities/Tag.js';
import { DomainError, DomainErrorCodes } from '../../../../shared/errors/DomainError.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../shared/errors/ApplicationError.js';

// Helper function to create test documents
const createTestDocuments = () => {
  const doc1 = JsonDocument.create({
    id: DocumentId.create('id-1'),
    path: DocumentPath.create('doc1.json'),
    title: 'Document 1',
    documentType: 'generic',
    tags: [Tag.create('tag1'), Tag.create('tag2')],
    content: { content: 'document 1' },
  });

  const doc2 = JsonDocument.create({
    id: DocumentId.create('id-2'),
    path: DocumentPath.create('doc2.json'),
    title: 'Document 2',
    documentType: 'branch_context',
    tags: [Tag.create('tag2'), Tag.create('tag3')],
    content: { content: 'document 2' },
  });

  return [doc1, doc2];
};

// Helper function to create a test index
const createTestIndex = () => {
  return {
    tagIndex: {
      tag1: ['doc1.json'],
      tag2: ['doc1.json', 'doc2.json'],
      tag3: ['doc2.json'],
    },
    typeIndex: {
      generic: ['doc1.json'],
      branch_context: ['doc2.json'],
    },
    pathIndex: {
      'doc1.json': 'id-1',
      'doc2.json': 'id-2',
    },
    idIndex: {
      'id-1': 'doc1.json',
      'id-2': 'doc2.json',
    },
  };
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
  const testIndex = createTestIndex();

  beforeEach(() => {
    // Create mocks
    jsonRepositoryMock = mock<IJsonDocumentRepository>();
    globalRepositoryMock = mock<IJsonDocumentRepository>();
    indexServiceMock = mock<IIndexService>();

    // Create use case with mocks
    useCase = new UpdateJsonIndexUseCase(
      instance(jsonRepositoryMock),
      instance(indexServiceMock),
      instance(globalRepositoryMock)
    );
  });

  describe('Updating branch repository index', () => {
    it('should update branch index with fullRebuild', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);

      // Mock repository behavior
      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(branchInfo.path)))
        .thenResolve(true);
      
      when(jsonRepositoryMock.listAll(deepEqual(branchInfo)))
        .thenResolve(testDocuments);
      
      when(indexServiceMock.buildIndex(deepEqual(branchInfo), deepEqual(testDocuments)))
        .thenResolve();
      
      when(indexServiceMock.getIndex(deepEqual(branchInfo)))
        .thenResolve(testIndex);

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        fullRebuild: true,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.updateLocation).toBe(testBranchName);
      expect(result.updateInfo.fullRebuild).toBe(true);
      expect(result.updateInfo.timestamp).toBeDefined();

      // Verify repository and service methods were called
      verify(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(branchInfo.path))).once();
      verify(jsonRepositoryMock.listAll(deepEqual(branchInfo))).once();
      verify(indexServiceMock.buildIndex(deepEqual(branchInfo), deepEqual(testDocuments))).once();
      verify(indexServiceMock.getIndex(deepEqual(branchInfo))).once();
    });

    it('should update branch index incrementally when fullRebuild is false', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);

      // Mock repository behavior
      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(branchInfo.path)))
        .thenResolve(true);
      
      when(jsonRepositoryMock.listAll(deepEqual(branchInfo)))
        .thenResolve(testDocuments);
      
      when(indexServiceMock.addToIndex(deepEqual(branchInfo), anything()))
        .thenResolve();
      
      when(indexServiceMock.getIndex(deepEqual(branchInfo)))
        .thenResolve(testIndex);

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        fullRebuild: false,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.updateLocation).toBe(testBranchName);
      expect(result.updateInfo.fullRebuild).toBe(false);

      // Verify repository and service methods were called
      verify(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(branchInfo.path))).once();
      verify(jsonRepositoryMock.listAll(deepEqual(branchInfo))).once();
      verify(indexServiceMock.addToIndex(deepEqual(branchInfo), testDocuments[0])).once();
      verify(indexServiceMock.addToIndex(deepEqual(branchInfo), testDocuments[1])).once();
      verify(indexServiceMock.buildIndex(anything(), anything())).never();
      verify(indexServiceMock.getIndex(deepEqual(branchInfo))).once();
    });

    it('should throw DomainError when branch does not exist', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);

      // Mock repository behavior
      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(branchInfo.path)))
        .thenResolve(false);

      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
        })
      ).rejects.toThrow(DomainError);

      await expect(
        useCase.execute({
          branchName: testBranchName,
        })
      ).rejects.toThrow(`Branch "${testBranchName}" not found`);

      // Verify repository methods were called
      verify(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(branchInfo.path))).once();
      verify(jsonRepositoryMock.listAll(anything())).never();
    });
  });

  describe('Updating global repository index', () => {
    it('should update global index with fullRebuild', async () => {
      // Arrange
      const branchInfo = BranchInfo.create('global');

      // Mock repository behavior
      when(globalRepositoryMock.listAll(deepEqual(branchInfo)))
        .thenResolve(testDocuments);
      
      when(indexServiceMock.buildIndex(deepEqual(branchInfo), deepEqual(testDocuments)))
        .thenResolve();
      
      when(indexServiceMock.getIndex(deepEqual(branchInfo)))
        .thenResolve(testIndex);

      // Act
      const result = await useCase.execute({
        fullRebuild: true,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.updateLocation).toBe('global');
      expect(result.updateInfo.fullRebuild).toBe(true);

      // Verify repository and service methods were called
      verify(globalRepositoryMock.listAll(deepEqual(branchInfo))).once();
      verify(indexServiceMock.buildIndex(deepEqual(branchInfo), deepEqual(testDocuments))).once();
      verify(indexServiceMock.getIndex(deepEqual(branchInfo))).once();
      verify(jsonRepositoryMock.listAll(anything())).never();
    });
  });

  describe('Error handling', () => {
    it('should pass through domain errors from repository', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const domainError = new DomainError(
        DomainErrorCodes.INVALID_BRANCH_NAME,
        'Invalid branch name'
      );

      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(branchInfo.path)))
        .thenThrow(domainError);

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
      const unknownError = new Error('Something went wrong');

      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(branchInfo.path)))
        .thenThrow(unknownError);

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
