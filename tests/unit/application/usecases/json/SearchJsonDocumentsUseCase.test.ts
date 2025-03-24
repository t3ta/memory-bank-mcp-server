// @ts-nocheck
// This file was automatically converted from ts-mockito to jest.fn()
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
// ts-mockito import removed;
import { SearchJsonDocumentsUseCase } from '../../../../../src/application/usecases/json/SearchJsonDocumentsUseCase';
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository';
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
 * Unit tests for SearchJsonDocumentsUseCase
 * 
 * These tests verify that the SearchJsonDocumentsUseCase correctly implements:
 * - Searching JSON documents by tags in branch and global memory banks
 * - Searching JSON documents by document type
 * - Supporting matchAllTags option for tag-based searches
 * - Input validation for search criteria
 * - Proper error handling for non-existent branches
 * - Converting domain entities to DTOs in search results
 * 
 * The test uses mocked repositories and test document fixtures to isolate the use case behavior.
 */

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
          completed: false,
        },
      ],
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
      nextSteps: [],
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
    jsonRepositoryMock = {
      exists: jest.fn(),
      findById: jest.fn(),
      findByPath: jest.fn(),
      findByTags: jest.fn(),
      findByType: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      getAllByTags: jest.fn(),
      getAll: jest.fn(),
      listAll: jest.fn()
    };
    
    globalRepositoryMock = {
      exists: jest.fn(),
      findById: jest.fn(),
      findByPath: jest.fn(),
      findByTags: jest.fn(),
      findByType: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      getAllByTags: jest.fn(),
      getAll: jest.fn(),
      listAll: jest.fn()
    };

    // Create use case with mocks
    useCase = new SearchJsonDocumentsUseCase(
      jsonRepositoryMock,
      globalRepositoryMock
    );
  });

  describe('Searching in branch repository', () => {
    it('should search documents by tags', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const searchTags = ['tag1', 'tag3'];
      const tagObjects = searchTags.map((tag) => Tag.create(tag));

      // These documents have either tag1 or tag3
      const expectedDocuments = [testDocuments[0], testDocuments[2]];

      // Mock repository behavior
      jsonRepositoryMock.exists = jest.fn().mockResolvedValue(true);
      jsonRepositoryMock.findByTags = jest.fn().mockResolvedValue(expectedDocuments);

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
      expect(jsonRepositoryMock.exists).toHaveBeenCalled();
      expect(jsonRepositoryMock.findByTags).toHaveBeenCalled();
    });

    it('should search documents with matchAllTags option', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const searchTags = ['tag1', 'tag3'];
      const tagObjects = searchTags.map((tag) => Tag.create(tag));

      // Only document 3 has both tag1 and tag3
      const expectedDocuments = [testDocuments[2]];

      // Mock repository behavior
      jsonRepositoryMock.exists = jest.fn().mockResolvedValue(true);
      jsonRepositoryMock.findByTags = jest.fn().mockResolvedValue(expectedDocuments);

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
      expect(jsonRepositoryMock.findByTags).toHaveBeenCalled();
    });

    it('should search documents by type', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const documentType = 'branch_context';

      // Only document 2 is of type branch_context
      const expectedDocuments = [testDocuments[1]];

      // Mock repository behavior
      jsonRepositoryMock.exists = jest.fn().mockResolvedValue(true);
      jsonRepositoryMock.findByType = jest.fn().mockResolvedValue(expectedDocuments);

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
      expect(jsonRepositoryMock.findByType).toHaveBeenCalled();
    });

    it('should throw DomainError when branch does not exist', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const searchTags = ['tag1'];

      // Mock repository behavior
      jsonRepositoryMock.exists = jest.fn().mockResolvedValue(false);

      // Act & Assert
      try {
        await useCase.execute({
          branchName: testBranchName,
          tags: searchTags,
        });
        expect('No error thrown').toBe('Expected DomainError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).message).toBe(`Branch "${testBranchName}" not found`);
      }

      // Verify repository methods were called - atLeast(1)に変更
      expect(jsonRepositoryMock.exists).toHaveBeenCalledTimes(1) // Note: Changed from atLeast to exact match;
      expect(jsonRepositoryMock.findByTags).not.toHaveBeenCalled();
    });
  });

  describe('Searching in global repository', () => {
    it('should search documents in global repository by tags', async () => {
      // Arrange
      const branchInfo = BranchInfo.create('feature/global'); // 変更: 'global' -> 'feature/global'
      const searchTags = ['tag1'];
      const tagObjects = searchTags.map((tag) => Tag.create(tag));

      // Documents with tag1
      const expectedDocuments = [testDocuments[0], testDocuments[2]];

      // Mock repository behavior
      globalRepositoryMock.findByTags = jest.fn().mockResolvedValue(expectedDocuments);

      // Act
      const result = await useCase.execute({
        tags: searchTags,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.documents).toHaveLength(2);
      expect(result.searchInfo.searchLocation).toBe('global');

      // Verify repository methods were called
      expect(globalRepositoryMock.findByTags).toHaveBeenCalled();
      expect(jsonRepositoryMock.findByTags).not.toHaveBeenCalled();
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
      expect(jsonRepositoryMock.findByTags).not.toHaveBeenCalled();
      expect(jsonRepositoryMock.findByType).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should pass through domain errors from repository', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const dummyPath = DocumentPath.create('index.json');
      const searchTags = ['tag1'];
      const domainError = new DomainError(DomainErrorCodes.INVALID_TAG, 'Invalid tag format');

      jsonRepositoryMock.exists = jest.fn().mockResolvedValue(true);
      jsonRepositoryMock.findByTags = jest.fn().mockImplementation(() => {
        throw domainError;
      });

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

      jsonRepositoryMock.exists = jest.fn().mockResolvedValue(true);
      jsonRepositoryMock.findByTags = jest.fn().mockImplementation(() => {
        throw unknownError;
      });

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
