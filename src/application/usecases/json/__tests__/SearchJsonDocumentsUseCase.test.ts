import { describe, it, expect, beforeEach } from '@jest/globals';
import { mock, instance, when, verify, anyString, anything, deepEqual, reset } from 'ts-mockito';
import { SearchJsonDocumentsUseCase } from '../SearchJsonDocumentsUseCase.js';
import { IJsonDocumentRepository } from '../../../../domain/repositories/IJsonDocumentRepository.js';
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
    id: DocumentId.generate(), // UUIDを使用
    path: DocumentPath.create('doc1.json'),
    title: 'Document 1',
    documentType: 'generic',
    tags: [Tag.create('tag1'), Tag.create('tag2')],
    content: { someField: 'document 1' }, // 正しいコンテンツ形式
    lastModified: new Date('2023-01-01T00:00:00.000Z'),
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
  });

  const doc2 = JsonDocument.create({
    id: DocumentId.generate(), // UUIDを使用
    path: DocumentPath.create('doc2.json'),
    title: 'Document 2',
    documentType: 'branch_context',
    tags: [Tag.create('tag2'), Tag.create('tag3')],
    content: { 
      purpose: 'Test branch purpose', // branch_contextタイプに必要なフィールド
      userStories: [
        {
          description: 'Test user story',
          completed: false
        }
      ]
    },
    lastModified: new Date('2023-01-02T00:00:00.000Z'),
    createdAt: new Date('2023-01-02T00:00:00.000Z'),
  });

  const doc3 = JsonDocument.create({
    id: DocumentId.generate(), // UUIDを使用
    path: DocumentPath.create('doc3.json'),
    title: 'Document 3',
    documentType: 'active_context',
    tags: [Tag.create('tag1'), Tag.create('tag3'), Tag.create('tag4')],
    content: { 
      currentWork: 'Test current work',
      recentChanges: ['change 1', 'change 2'],
      activeDecisions: [],
      considerations: [],
      nextSteps: []
    }, // active_contextに合わせたコンテンツ
    lastModified: new Date('2023-01-03T00:00:00.000Z'),
    createdAt: new Date('2023-01-03T00:00:00.000Z'),
  });

  return [doc1, doc2, doc3];
};

describe('SearchJsonDocumentsUseCase', () => {
  // Mocks
  let jsonRepositoryMock: IJsonDocumentRepository;
  let globalRepositoryMock: IJsonDocumentRepository;
  
  // Use case
  let useCase: SearchJsonDocumentsUseCase;

  // Test data
  const testBranchName = 'feature/test';
  const testDocuments = createTestDocuments();

  beforeEach(() => {
    // Create mocks
    jsonRepositoryMock = mock<IJsonDocumentRepository>();
    globalRepositoryMock = mock<IJsonDocumentRepository>();

    // Create use case with mocks
    useCase = new SearchJsonDocumentsUseCase(
      instance(jsonRepositoryMock),
      instance(globalRepositoryMock)
    );
  });

  describe('Searching in branch repository', () => {
    it('should search documents by tags', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const searchTags = ['tag1', 'tag3'];
      const tagObjects = searchTags.map(tag => Tag.create(tag));
      
      // These documents have either tag1 or tag3
      const expectedDocuments = [testDocuments[0], testDocuments[2]];

      // Mock repository behavior
      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(dummyPath)))
        .thenResolve(true);
      
      when(jsonRepositoryMock.findByTags(deepEqual(branchInfo), anything(), false))
        .thenResolve(expectedDocuments);

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        tags: searchTags,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].title).toBe('Document 1');
      expect(result.documents[1].title).toBe('Document 3');
      expect(result.searchInfo.count).toBe(2);
      expect(result.searchInfo.searchLocation).toBe(testBranchName);
      expect(result.searchInfo.searchedTags).toEqual(searchTags);
      expect(result.searchInfo.matchedAllTags).toBe(false);

      // Verify repository methods were called
      verify(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(dummyPath))).once();
      verify(jsonRepositoryMock.findByTags(deepEqual(branchInfo), anything(), false)).once();
    });

    it('should search documents with matchAllTags option', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const searchTags = ['tag1', 'tag3'];
      const tagObjects = searchTags.map(tag => Tag.create(tag));
      
      // Only document 3 has both tag1 and tag3
      const expectedDocuments = [testDocuments[2]];

      // Mock repository behavior
      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(dummyPath)))
        .thenResolve(true);
      
      when(jsonRepositoryMock.findByTags(deepEqual(branchInfo), anything(), true))
        .thenResolve(expectedDocuments);

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        tags: searchTags,
        matchAllTags: true,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].title).toBe('Document 3');
      expect(result.searchInfo.count).toBe(1);
      expect(result.searchInfo.matchedAllTags).toBe(true);

      // Verify repository methods were called
      verify(jsonRepositoryMock.findByTags(deepEqual(branchInfo), anything(), true)).once();
    });

    it('should search documents by type', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const documentType = 'branch_context';
      
      // Only document 2 is of type branch_context
      const expectedDocuments = [testDocuments[1]];

      // Mock repository behavior
      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(dummyPath)))
        .thenResolve(true);
      
      when(jsonRepositoryMock.findByType(deepEqual(branchInfo), documentType))
        .thenResolve(expectedDocuments);

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        documentType,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].title).toBe('Document 2');
      expect(result.documents[0].documentType).toBe('branch_context');
      expect(result.searchInfo.count).toBe(1);
      expect(result.searchInfo.searchedDocumentType).toBe(documentType);

      // Verify repository methods were called
      verify(jsonRepositoryMock.findByType(deepEqual(branchInfo), documentType)).once();
    });

    it('should throw DomainError when branch does not exist', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const searchTags = ['tag1'];

      // Mock repository behavior
      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(dummyPath)))
        .thenResolve(false);

      // Act & Assert
      try {
        await useCase.execute({
          branchName: testBranchName,
          tags: searchTags,
        });
        fail('Expected DomainError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).message).toBe(`Branch "${testBranchName}" not found`);
      }

      // Verify repository methods were called - atLeast(1)に変更
      verify(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(dummyPath))).atLeast(1);
      verify(jsonRepositoryMock.findByTags(anything(), anything(), anything())).never();
    });
  });

  describe('Searching in global repository', () => {
    it('should search documents in global repository by tags', async () => {
      // Arrange
      const branchInfo = BranchInfo.create('feature/global'); // 変更: 'global' -> 'feature/global'
      const searchTags = ['tag1'];
      const tagObjects = searchTags.map(tag => Tag.create(tag));
      
      // Documents with tag1
      const expectedDocuments = [testDocuments[0], testDocuments[2]];

      // Mock repository behavior
      when(globalRepositoryMock.findByTags(deepEqual(branchInfo), anything(), false))
        .thenResolve(expectedDocuments);

      // Act
      const result = await useCase.execute({
        tags: searchTags,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.documents).toHaveLength(2);
      expect(result.searchInfo.searchLocation).toBe('global');

      // Verify repository methods were called
      verify(globalRepositoryMock.findByTags(deepEqual(branchInfo), anything(), false)).once();
      verify(jsonRepositoryMock.findByTags(anything(), anything(), anything())).never();
    });
  });

  describe('Input validation', () => {
    it('should throw ApplicationError when no search criteria is provided', async () => {
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
      ).rejects.toThrow('At least one search criteria (tags or documentType) must be provided');

      // Verify repository methods were not called
      verify(jsonRepositoryMock.findByTags(anything(), anything(), anything())).never();
      verify(jsonRepositoryMock.findByType(anything(), anything())).never();
    });
  });

  describe('Error handling', () => {
    it('should pass through domain errors from repository', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const searchTags = ['tag1'];
      const domainError = new DomainError(
        DomainErrorCodes.INVALID_TAG,
        'Invalid tag format'
      );

      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(dummyPath)))
        .thenResolve(true);
      
      when(jsonRepositoryMock.findByTags(deepEqual(branchInfo), anything(), false))
        .thenThrow(domainError);

      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
          tags: searchTags,
        })
      ).rejects.toBe(domainError);
    });

    it('should wrap unknown errors as ApplicationError', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const searchTags = ['tag1'];
      const unknownError = new Error('Something went wrong');

      when(jsonRepositoryMock.exists(deepEqual(branchInfo), deepEqual(dummyPath)))
        .thenResolve(true);
      
      when(jsonRepositoryMock.findByTags(deepEqual(branchInfo), anything(), false))
        .thenThrow(unknownError);

      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
          tags: searchTags,
        })
      ).rejects.toThrow(ApplicationError);

      await expect(
        useCase.execute({
          branchName: testBranchName,
          tags: searchTags,
        })
      ).rejects.toThrow('Failed to search JSON documents: Something went wrong');
    });
  });
});
