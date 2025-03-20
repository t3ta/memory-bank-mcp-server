/**
 * FileSystemJsonDocumentRepository Unit Tests
 *
 * These tests verify the functionality of the file system-based JSON document repository,
 * including document creation, retrieval, and deletion operations.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { BranchInfo } from 'src/domain/entities/BranchInfo';
import { DocumentId } from 'src/domain/entities/DocumentId';
import { DocumentPath } from 'src/domain/entities/DocumentPath';
import { JsonDocument } from 'src/domain/entities/JsonDocument';
import { Tag } from 'src/domain/entities/Tag';
import { FileSystemJsonDocumentRepository } from 'src/infrastructure/repositories/file-system/FileSystemJsonDocumentRepository';
import { IFileSystemService } from 'src/infrastructure/storage/interfaces/IFileSystemService';
import { IIndexService } from 'src/infrastructure/index/interfaces/IIndexService';
import { DocumentReference } from 'src/schemas/v2/index-schema';

// Mock file system service
const mockFileSystemService = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  deleteFile: jest.fn(),
  createDirectory: jest.fn(),
  fileExists: jest.fn(),
  directoryExists: jest.fn(),
  listFiles: jest.fn(),
  getFileStats: jest.fn(),
  getBranchMemoryPath: jest.fn(),
  getConfig: jest.fn(),
  readFileChunk: jest.fn(),
};

// Mock index service
const mockIndexService = {
  initializeIndex: jest.fn(),
  buildIndex: jest.fn(),
  addToIndex: jest.fn(),
  removeFromIndex: jest.fn(),
  findById: jest.fn(),
  findByPath: jest.fn(),
  findByTags: jest.fn(),
  findByType: jest.fn(),
  listAll: jest.fn(),
  saveIndex: jest.fn(),
  loadIndex: jest.fn(),
};

describe('FileSystemJsonDocumentRepository', () => {
  const rootPath = '/test/root';
  let repository: FileSystemJsonDocumentRepository;

  // Sample data
  const branchInfo = BranchInfo.create('feature/test');
  const documentPath = DocumentPath.create('path/to/document.json');
  const documentId = DocumentId.generate();
  const tag1 = Tag.create('tag1');
  const tag2 = Tag.create('tag2');

  // Sample JsonDocument
  const sampleJsonDocument = JsonDocument.create({
    id: documentId,
    path: documentPath,
    title: 'Test Document',
    documentType: 'generic',
    tags: [tag1, tag2],
    content: { test: 'value' },
    lastModified: new Date(),
    createdAt: new Date(),
    version: 1,
  });

  // Sample document reference
  const sampleDocRef: DocumentReference = {
    id: documentId.value,
    path: documentPath.value,
    documentType: 'generic',
    title: 'Test Document',
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create repository instance
    repository = new FileSystemJsonDocumentRepository(
      mockFileSystemService as unknown as IFileSystemService,
      mockIndexService as unknown as IIndexService,
      rootPath
    );
  });

  describe('findById', () => {
    it('should find document by ID', async () => {
      // Setup mocks
      mockFileSystemService.listFiles.mockResolvedValue([
        `${rootPath}/feature-test/some-file.json`,
      ]);
      mockFileSystemService.directoryExists.mockResolvedValue(true);
      mockIndexService.findById.mockResolvedValue(sampleDocRef);
      mockFileSystemService.readFile.mockResolvedValue(sampleJsonDocument.toString());

      // Call method
      const result = await repository.findById(documentId);

      // Assertions
      expect(result).toBeTruthy();
      expect(result?.id.value).toBe(documentId.value);
      expect(mockIndexService.findById).toHaveBeenCalledWith(expect.any(BranchInfo), documentId);
      expect(mockFileSystemService.readFile).toHaveBeenCalled();
    });

    it('should return null when document not found', async () => {
      // Setup mocks
      mockFileSystemService.listFiles.mockResolvedValue([
        `${rootPath}/feature-test/some-file.json`,
      ]);
      mockFileSystemService.directoryExists.mockResolvedValue(true);
      mockIndexService.findById.mockResolvedValue(null);

      // Call method
      const result = await repository.findById(documentId);

      // Assertions
      expect(result).toBeNull();
    });
  });

  describe('findByPath', () => {
    it('should find document by path', async () => {
      // Setup mocks
      mockIndexService.findByPath.mockResolvedValue(sampleDocRef);
      mockFileSystemService.readFile.mockResolvedValue(sampleJsonDocument.toString());

      // Call method
      const result = await repository.findByPath(branchInfo, documentPath);

      // Assertions
      expect(result).toBeTruthy();
      expect(result?.path.value).toBe(documentPath.value);
      expect(mockIndexService.findByPath).toHaveBeenCalledWith(branchInfo, documentPath);
      expect(mockFileSystemService.readFile).toHaveBeenCalled();
    });

    it('should check file system if not in index', async () => {
      // Setup mocks
      mockIndexService.findByPath.mockResolvedValue(null);
      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockResolvedValue(sampleJsonDocument.toString());

      // Call method
      const result = await repository.findByPath(branchInfo, documentPath);

      // Assertions
      expect(result).toBeTruthy();
      expect(mockIndexService.addToIndex).toHaveBeenCalled();
    });

    it('should return null when document not found', async () => {
      // Setup mocks
      mockIndexService.findByPath.mockResolvedValue(null);
      mockFileSystemService.fileExists.mockResolvedValue(false);

      // Call method
      const result = await repository.findByPath(branchInfo, documentPath);

      // Assertions
      expect(result).toBeNull();
    });
  });

  describe('findByTags', () => {
    it('should find documents by tags', async () => {
      // Setup mocks
      const tags = [tag1, tag2];
      mockIndexService.findByTags.mockResolvedValue([sampleDocRef]);
      mockFileSystemService.readFile.mockResolvedValue(sampleJsonDocument.toString());

      // Call method
      const result = await repository.findByTags(branchInfo, tags, true);

      // Assertions
      expect(result.length).toBe(1);
      expect(result[0].id.value).toBe(documentId.value);
      expect(mockIndexService.findByTags).toHaveBeenCalledWith(branchInfo, tags, true);
    });

    it('should handle when document file is missing', async () => {
      // Setup mocks
      const tags = [tag1];
      mockIndexService.findByTags.mockResolvedValue([sampleDocRef]);
      mockFileSystemService.readFile.mockRejectedValue(new Error('File not found'));

      // Call method
      const result = await repository.findByTags(branchInfo, tags);

      // Assertions
      expect(result.length).toBe(0);
      expect(mockIndexService.removeFromIndex).toHaveBeenCalled();
    });
  });

  describe('findByType', () => {
    it('should find documents by type', async () => {
      // Setup mocks
      mockIndexService.findByType.mockResolvedValue([sampleDocRef]);
      mockFileSystemService.readFile.mockResolvedValue(sampleJsonDocument.toString());

      // Call method
      const result = await repository.findByType(branchInfo, 'generic');

      // Assertions
      expect(result.length).toBe(1);
      expect(result[0].documentType).toBe('generic');
      expect(mockIndexService.findByType).toHaveBeenCalledWith(branchInfo, 'generic');
    });
  });

  describe('save', () => {
    it('should save document', async () => {
      // Setup mocks
      mockFileSystemService.createDirectory.mockResolvedValue();
      mockFileSystemService.writeFile.mockResolvedValue();
      mockIndexService.addToIndex.mockResolvedValue();

      // Call method
      const result = await repository.save(branchInfo, sampleJsonDocument);

      // Assertions
      expect(result).toBe(sampleJsonDocument);
      expect(mockFileSystemService.createDirectory).toHaveBeenCalled();
      expect(mockFileSystemService.writeFile).toHaveBeenCalled();
      expect(mockIndexService.addToIndex).toHaveBeenCalledWith(branchInfo, sampleJsonDocument);
    });
  });

  describe('delete', () => {
    it('should delete document by JsonDocument', async () => {
      // Setup mocks
      mockIndexService.removeFromIndex.mockResolvedValue();
      mockFileSystemService.deleteFile.mockResolvedValue(true);

      // Call method
      const result = await repository.delete(branchInfo, sampleJsonDocument);

      // Assertions
      expect(result).toBe(true);
      expect(mockIndexService.removeFromIndex).toHaveBeenCalled();
      expect(mockFileSystemService.deleteFile).toHaveBeenCalled();
    });

    it('should delete document by DocumentPath', async () => {
      // Setup mocks
      mockIndexService.removeFromIndex.mockResolvedValue();
      mockFileSystemService.deleteFile.mockResolvedValue(true);

      // Call method
      const result = await repository.delete(branchInfo, documentPath);

      // Assertions
      expect(result).toBe(true);
    });

    it('should delete document by DocumentId', async () => {
      // Setup mocks
      mockIndexService.findById.mockResolvedValue(sampleDocRef);
      mockIndexService.removeFromIndex.mockResolvedValue();
      mockFileSystemService.deleteFile.mockResolvedValue(true);

      // Call method
      const result = await repository.delete(branchInfo, documentId);

      // Assertions
      expect(result).toBe(true);
    });

    it('should return false when document not found', async () => {
      // Setup mocks
      mockIndexService.findById.mockResolvedValue(null);

      // Call method
      const result = await repository.delete(branchInfo, documentId);

      // Assertions
      expect(result).toBe(false);
    });
  });

  describe('listAll', () => {
    it('should list all documents from index', async () => {
      // Setup mocks
      mockIndexService.listAll.mockResolvedValue([sampleDocRef]);
      mockFileSystemService.readFile.mockResolvedValue(sampleJsonDocument.toString());

      // Call method
      const result = await repository.listAll(branchInfo);

      // Assertions
      expect(result.length).toBe(1);
      expect(result[0].id.value).toBe(documentId.value);
    });

    it('should fallback to file system scanning if index fails', async () => {
      // Setup mocks
      mockIndexService.listAll.mockRejectedValue(new Error('Index error'));
      mockFileSystemService.directoryExists.mockResolvedValue(true);
      mockFileSystemService.listFiles.mockResolvedValue([`${rootPath}/feature-test/test.json`]);
      mockFileSystemService.readFile.mockResolvedValue(sampleJsonDocument.toString());
      mockIndexService.buildIndex.mockResolvedValue();

      // Call method
      await expect(repository.listAll(branchInfo)).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true when document exists in index', async () => {
      // Setup mocks
      mockIndexService.findByPath.mockResolvedValue(sampleDocRef);
      mockFileSystemService.fileExists.mockResolvedValue(true);

      // Call method
      const result = await repository.exists(branchInfo, documentPath);

      // Assertions
      expect(result).toBe(true);
    });

    it('should check file system if not in index', async () => {
      // Setup mocks
      mockIndexService.findByPath.mockResolvedValue(null);
      mockFileSystemService.fileExists.mockResolvedValue(true);

      // Call method
      const result = await repository.exists(branchInfo, documentPath);

      // Assertions
      expect(result).toBe(true);
    });

    it('should return false when document does not exist', async () => {
      // Setup mocks
      mockIndexService.findByPath.mockResolvedValue(null);
      mockFileSystemService.fileExists.mockResolvedValue(false);

      // Call method
      const result = await repository.exists(branchInfo, documentPath);

      // Assertions
      expect(result).toBe(false);
    });
  });
});
