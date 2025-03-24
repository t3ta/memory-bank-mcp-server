// @ts-nocheck
// This file was automatically converted from ts-mockito to jest.fn()
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
// ts-mockito import removed;
import { ReadJsonDocumentUseCase } from '../../../../../src/application/usecases/json/ReadJsonDocumentUseCase';
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

// Helper function to create test document
const createTestDocument = (id: string, path: string, content?: Record<string, unknown>) => {
  const documentId = DocumentId.create(id);
  const documentPath = DocumentPath.create(path);
  // 常に有効なコンテンツを持つように修正
  const validContent = content && Object.keys(content).length > 0 ? content : { test: 'content' };

  return JsonDocument.create({
    id: documentId,
    path: documentPath,
    title: 'Test Document',
    documentType: 'generic',
    tags: [Tag.create('test')],
    content: validContent,
    lastModified: new Date('2023-01-01T00:00:00.000Z'),
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
  });
};

describe('ReadJsonDocumentUseCase', () => {
  // Mocks
  let jsonRepositoryMock: IJsonDocumentRepository;
  let globalRepositoryMock: IJsonDocumentRepository;

  // Use case
  let useCase: ReadJsonDocumentUseCase;

  // Test data
  const testBranchName = 'feature/test';
  const testDocumentId = 'b1e3b4f8-5c0f-4a9c-a6bc-a32d8f3bccf8';
  const testDocumentPath = 'test/document.json';

  beforeEach(() => {
    // Create mocks with type casting for Jest compatibility
    jsonRepositoryMock = {
      findById: jest.fn(),
      findByPath: jest.fn(),
      findByTags: jest.fn(),
      findByType: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      listAll: jest.fn(),
      exists: jest.fn()
    } as unknown as IJsonDocumentRepository;
    
    globalRepositoryMock = {
      findById: jest.fn(),
      findByPath: jest.fn(),
      findByTags: jest.fn(),
      findByType: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      listAll: jest.fn(),
      exists: jest.fn()
    } as unknown as IJsonDocumentRepository;

    // Create use case with mocks
    useCase = new ReadJsonDocumentUseCase(
      jsonRepositoryMock,
      globalRepositoryMock
    );
  });

  describe('Reading from branch repository', () => {
    it('should read a document by path', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const documentPath = DocumentPath.create(testDocumentPath);
      const expectedDocument = createTestDocument(testDocumentId, testDocumentPath);

      jsonRepositoryMock.findByPath = jest.fn().mockResolvedValue(expectedDocument);

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        path: testDocumentPath,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.id).toBe(testDocumentId);
      expect(result.document.path).toBe(testDocumentPath);
      expect(result.document.title).toBe('Test Document');
      expect(result.document.documentType).toBe('generic');
      expect(result.document.tags).toEqual(['test']);
      expect(result.document.lastModified).toBe('2023-01-01T00:00:00.000Z');
      expect(result.document.createdAt).toBe('2023-01-01T00:00:00.000Z');
      expect(result.location).toBe(testBranchName);

      // Verify repository method was called
      expect(jsonRepositoryMock.findByPath).toHaveBeenCalled();
      expect(globalRepositoryMock.findByPath).not.toHaveBeenCalled();
    });

    it('should read a document by ID', async () => {
      // Arrange
      const documentId = DocumentId.create(testDocumentId);
      const expectedDocument = createTestDocument(testDocumentId, testDocumentPath);

      jsonRepositoryMock.findById = jest.fn().mockResolvedValue(expectedDocument);

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        id: testDocumentId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.id).toBe(testDocumentId);
      expect(result.document.path).toBe(testDocumentPath);
      expect(result.location).toBe(testBranchName);

      // Verify repository method was called - .once()ではなく.atLeast(1)を使用
      expect(jsonRepositoryMock.findById).toHaveBeenCalledTimes(1) // Note: Changed from atLeast to exact match;
      expect(globalRepositoryMock.findById).not.toHaveBeenCalled();
    });

    it('should throw DomainError when document is not found', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const documentPath = DocumentPath.create(testDocumentPath);

      jsonRepositoryMock.findByPath = jest.fn().mockResolvedValue(null);

      // Act & Assert
      try {
        await useCase.execute({
          branchName: testBranchName,
          path: testDocumentPath,
        });
        // ここに到達するとテストは失敗
        expect('DomainError should be thrown').toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).message).toContain(
          `Document "${testDocumentPath}" not found in branch`
        );
      }

      // Verify repository method was called
      expect(jsonRepositoryMock.findByPath).toHaveBeenCalled();
    });
  });

  describe('Reading from global repository', () => {
    it('should read a document by path from global', async () => {
      // Arrange - 'global'から'feature/global'に変更
      const branchInfo = BranchInfo.create('feature/global');
      const documentPath = DocumentPath.create(testDocumentPath);
      const expectedDocument = createTestDocument(testDocumentId, testDocumentPath);

      globalRepositoryMock.findByPath = jest.fn().mockResolvedValue(expectedDocument);

      // Act
      const result = await useCase.execute({
        path: testDocumentPath,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.id).toBe(testDocumentId);
      expect(result.document.path).toBe(testDocumentPath);
      expect(result.location).toBe('global');

      // Verify repository method was called
      expect(globalRepositoryMock.findByPath).toHaveBeenCalled();
      expect(jsonRepositoryMock.findByPath).not.toHaveBeenCalled();
    });

    it('should read a document by ID from global', async () => {
      // Arrange
      const documentId = DocumentId.create(testDocumentId);
      const expectedDocument = createTestDocument(testDocumentId, testDocumentPath);

      globalRepositoryMock.findById = jest.fn().mockResolvedValue(expectedDocument);

      // Act
      const result = await useCase.execute({
        id: testDocumentId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.id).toBe(testDocumentId);
      expect(result.document.path).toBe(testDocumentPath);
      expect(result.location).toBe('global');

      // Verify repository method was called - .once()ではなく.atLeast(1)を使用
      expect(globalRepositoryMock.findById).toHaveBeenCalledTimes(1) // Note: Changed from atLeast to exact match;
      expect(jsonRepositoryMock.findById).not.toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
    it('should throw ApplicationError when neither path nor ID is provided', async () => {
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
      ).rejects.toThrow('Either document path or ID must be provided');

      // Verify repository methods were not called
      expect(jsonRepositoryMock.findByPath).not.toHaveBeenCalled();
      expect(jsonRepositoryMock.findById).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should pass through domain errors from repository', async () => {
      // Arrange
      const documentId = DocumentId.create(testDocumentId);
      const domainError = new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Invalid document path'
      );

      jsonRepositoryMock.findById = jest.fn().mockImplementation(() => { throw domainError });

      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
          id: testDocumentId,
        })
      ).rejects.toBe(domainError);
    });

    it('should wrap unknown errors as ApplicationError', async () => {
      // Arrange
      const documentId = DocumentId.create(testDocumentId);
      const unknownError = new Error('Something went wrong');

      jsonRepositoryMock.findById = jest.fn().mockImplementation(() => { throw unknownError });

      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
          id: testDocumentId,
        })
      ).rejects.toThrow(ApplicationError);

      await expect(
        useCase.execute({
          branchName: testBranchName,
          id: testDocumentId,
        })
      ).rejects.toThrow('Failed to read JSON document: Something went wrong');
    });
  });
});
