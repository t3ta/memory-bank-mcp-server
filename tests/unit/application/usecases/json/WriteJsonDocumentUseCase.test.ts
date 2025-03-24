// @ts-nocheck
// This file was automatically converted from ts-mockito to jest.fn()
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WriteJsonDocumentUseCase } from '../../../../../src/application/usecases/json/WriteJsonDocumentUseCase';
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository';
import { IIndexService } from '../../../../../src/infrastructure/index/interfaces/IIndexService';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { JsonDocument } from '../../../../../src/domain/entities/JsonDocument';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { DomainError, DomainErrorCodes } from '../../../../../src/shared/errors/DomainError';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../../src/shared/errors/ApplicationError';

/**
 * Unit tests for WriteJsonDocumentUseCase
 * 
 * These tests verify that the WriteJsonDocumentUseCase correctly implements:
 * - Creating new JSON documents in branch and global memory banks
 * - Updating existing JSON documents
 * - Input validation for document data (path, title, type, content)
 * - Integration with index service to keep indices updated
 * - Special handling for global repository access
 * - Proper error handling and error propagation
 * 
 * The test uses mocked repositories and index service to isolate the use case behavior.
 */

// Helper function to create test document
const createTestJsonDocument = (path: string, content: Record<string, unknown> = {}) => {
  const documentPath = DocumentPath.create(path);
  return JsonDocument.create({
    path: documentPath,
    title: 'Test Document',
    documentType: 'generic',
    tags: [Tag.create('test')],
    content: content || { test: 'content' },
    lastModified: new Date('2023-01-01T00:00:00.000Z'),
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
  });
};

describe('WriteJsonDocumentUseCase', () => {
  // Mocks
  let jsonRepositoryMock: IJsonDocumentRepository;
  let globalRepositoryMock: IJsonDocumentRepository;
  let indexServiceMock: IIndexService;

  // Use case
  let useCase: WriteJsonDocumentUseCase;

  // Test data
  const testBranchName = 'feature/test';
  const testDocumentPath = 'test/document.json';
  const testContent = { test: 'content' };

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
    
    indexServiceMock = {
      addToIndex: jest.fn(),
      removeFromIndex: jest.fn(),
      searchByTerm: jest.fn(),
      listAllDocuments: jest.fn(),
      buildIndex: jest.fn(),
      updateIndex: jest.fn()
    };

    // Create use case with mocks
    useCase = new WriteJsonDocumentUseCase(
      jsonRepositoryMock,
      indexServiceMock,
      globalRepositoryMock
    );
  });

  describe('Writing to branch repository', () => {
    it('should create a new document when it does not exist', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const documentPath = DocumentPath.create(testDocumentPath);

      // Mock repository behavior
      jsonRepositoryMock.findByPath.mockResolvedValue(null);
      
      jsonRepositoryMock.save.mockImplementation(
        (branchInfo, document) => Promise.resolve(document)
      );

      indexServiceMock.addToIndex = jest.fn().mockResolvedValue();

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        document: {
          path: testDocumentPath,
          title: 'Test Document',
          documentType: 'generic',
          tags: ['test'],
          content: testContent,
        },
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(testDocumentPath);
      expect(result.document.title).toBe('Test Document');
      expect(result.document.documentType).toBe('generic');
      expect(result.document.tags).toEqual(['test']);
      expect(result.document.content).toEqual(testContent);
      expect(result.isNew).toBe(true);
      expect(result.location).toBe(testBranchName);

      // Verify repository methods were called
      expect(jsonRepositoryMock.findByPath).toHaveBeenCalledWith(branchInfo, documentPath);
      expect(jsonRepositoryMock.findByPath).toHaveBeenCalledTimes(1);
      expect(jsonRepositoryMock.save).toHaveBeenCalledTimes(1);
      expect(indexServiceMock.addToIndex).toHaveBeenCalledTimes(1);
    });

    it('should update an existing document', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const documentPath = DocumentPath.create(testDocumentPath);
      const existingDocument = createTestJsonDocument(testDocumentPath, { oldTest: 'oldContent' });
      const newContent = { newTest: 'newContent' };

      // Mock repository behavior
      jsonRepositoryMock.findByPath.mockResolvedValue(existingDocument);
      
      jsonRepositoryMock.save.mockImplementation(
        (branchInfo, document) => Promise.resolve(document)
      );

      indexServiceMock.addToIndex = jest.fn().mockResolvedValue();

      // Act
      const result = await useCase.execute({
        branchName: testBranchName,
        document: {
          path: testDocumentPath,
          title: 'Updated Document',
          documentType: 'generic',
          tags: ['test', 'updated'],
          content: newContent,
        },
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(testDocumentPath);
      expect(result.document.title).toBe('Updated Document');
      expect(result.document.tags).toEqual(['test', 'updated']);
      expect(result.document.content).toEqual(newContent);
      expect(result.isNew).toBe(false);
      expect(result.location).toBe(testBranchName);

      // Verify repository methods were called
      expect(jsonRepositoryMock.findByPath).toHaveBeenCalledWith(branchInfo, documentPath);
      expect(jsonRepositoryMock.findByPath).toHaveBeenCalledTimes(1);
      expect(jsonRepositoryMock.save).toHaveBeenCalledTimes(1);
      expect(indexServiceMock.addToIndex).toHaveBeenCalledTimes(1);
    });
  });

  describe('Writing to global repository', () => {
    it('should create a new document in global repository', async () => {
      // Arrange - globalのところをfeature/globalに変更
      const branchInfo = BranchInfo.create('feature/global');
      const documentPath = DocumentPath.create(testDocumentPath);

      // Mock repository behavior
      globalRepositoryMock.findByPath.mockResolvedValue(null);
      
      globalRepositoryMock.save.mockImplementation(
        (branchInfo, document) => Promise.resolve(document)
      );

      indexServiceMock.addToIndex = jest.fn().mockResolvedValue();

      // Act
      const result = await useCase.execute({
        document: {
          path: testDocumentPath,
          title: 'Global Document',
          documentType: 'generic',
          tags: ['global'],
          content: testContent,
        },
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(testDocumentPath);
      expect(result.document.title).toBe('Global Document');
      expect(result.document.tags).toEqual(['global']);
      expect(result.document.content).toEqual(testContent);
      expect(result.isNew).toBe(true);
      expect(result.location).toBe('global');

      // Verify repository methods were called
      expect(globalRepositoryMock.findByPath).toHaveBeenCalledWith(branchInfo, documentPath);
      expect(globalRepositoryMock.findByPath).toHaveBeenCalledTimes(1);
      expect(globalRepositoryMock.save).toHaveBeenCalledTimes(1);
      expect(indexServiceMock.addToIndex).toHaveBeenCalledTimes(1);
      expect(jsonRepositoryMock.findByPath).not.toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
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
      ).rejects.toThrow('Document data is required');

      // Verify repository methods were not called
      expect(jsonRepositoryMock.findByPath).not.toHaveBeenCalled();
      expect(jsonRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('should throw ApplicationError when document path is missing', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            title: 'Test Document',
            documentType: 'generic',
            content: testContent,
          } as any,
        })
      ).rejects.toThrow(ApplicationError);

      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            title: 'Test Document',
            documentType: 'generic',
            content: testContent,
          } as any,
        })
      ).rejects.toThrow('Document path is required');
    });

    it('should throw ApplicationError when document title is missing', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            path: testDocumentPath,
            documentType: 'generic',
            content: testContent,
          } as any,
        })
      ).rejects.toThrow(ApplicationError);

      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            path: testDocumentPath,
            documentType: 'generic',
            content: testContent,
          } as any,
        })
      ).rejects.toThrow('Document title is required');
    });

    it('should throw ApplicationError when document type is missing', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            path: testDocumentPath,
            title: 'Test Document',
            content: testContent,
          } as any,
        })
      ).rejects.toThrow(ApplicationError);

      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            path: testDocumentPath,
            title: 'Test Document',
            content: testContent,
          } as any,
        })
      ).rejects.toThrow('Document type is required');
    });

    it('should throw ApplicationError when document content is missing', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            path: testDocumentPath,
            title: 'Test Document',
            documentType: 'generic',
          } as any,
        })
      ).rejects.toThrow(ApplicationError);

      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            path: testDocumentPath,
            title: 'Test Document',
            documentType: 'generic',
          } as any,
        })
      ).rejects.toThrow('Document content is required and cannot be empty');
    });

    it('should throw ApplicationError when writing to global without global repository', async () => {
      // Create use case without global repository
      const useCaseWithoutGlobal = new WriteJsonDocumentUseCase(
        jsonRepositoryMock,
        indexServiceMock
      );

      // Act & Assert
      await expect(
        useCaseWithoutGlobal.execute({
          document: {
            path: testDocumentPath,
            title: 'Global Document',
            documentType: 'generic',
            content: testContent,
          },
        })
      ).rejects.toThrow(ApplicationError);

      await expect(
        useCaseWithoutGlobal.execute({
          document: {
            path: testDocumentPath,
            title: 'Global Document',
            documentType: 'generic',
            content: testContent,
          },
        })
      ).rejects.toThrow('Global repository not provided for global document write');
    });
  });

  describe('Error handling', () => {
    it('should pass through domain errors from repository', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const documentPath = DocumentPath.create(testDocumentPath);
      const domainError = new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Invalid document path'
      );

      jsonRepositoryMock.findByPath.mockImplementation(() => {
        throw domainError;
      });

      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            path: testDocumentPath,
            title: 'Test Document',
            documentType: 'generic',
            content: testContent,
          },
        })
      ).rejects.toBe(domainError);
    });

    it('should wrap unknown errors as ApplicationError', async () => {
      // Arrange
      const branchInfo = BranchInfo.create(testBranchName);
      const documentPath = DocumentPath.create(testDocumentPath);
      const unknownError = new Error('Something went wrong');

      jsonRepositoryMock.findByPath.mockImplementation(() => {
        throw unknownError;
      });

      // Act & Assert
      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            path: testDocumentPath,
            title: 'Test Document',
            documentType: 'generic',
            content: testContent,
          },
        })
      ).rejects.toThrow(ApplicationError);

      await expect(
        useCase.execute({
          branchName: testBranchName,
          document: {
            path: testDocumentPath,
            title: 'Test Document',
            documentType: 'generic',
            content: testContent,
          },
        })
      ).rejects.toThrow('Failed to write JSON document: Something went wrong');
    });
  });
});
