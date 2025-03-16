// Mock FileSystemMemoryDocumentRepository
const mockDocumentRepositoryInstance = {
  findByPath: jest.fn(),
  findByTags: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  list: jest.fn()
};

jest.mock('../FileSystemMemoryDocumentRepository.js', () => {
  return {
    FileSystemMemoryDocumentRepository: jest.fn().mockImplementation(() => mockDocumentRepositoryInstance)
  };
});

import { FileSystemGlobalMemoryBankRepository } from '../FileSystemGlobalMemoryBankRepository.js';
import { FileSystemMemoryDocumentRepository } from '../FileSystemMemoryDocumentRepository.js';
import { IFileSystemService } from '../../../storage/interfaces/IFileSystemService.js';
import { IConfigProvider } from '../../../config/interfaces/IConfigProvider.js';
import { DocumentPath } from '../../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../../domain/entities/Tag.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../../shared/errors/InfrastructureError.js';
import path from 'path';

describe('FileSystemGlobalMemoryBankRepository', () => {
  let repository: FileSystemGlobalMemoryBankRepository;
  let mockFileSystemService: jest.Mocked<IFileSystemService>;
  let mockConfigProvider: jest.Mocked<IConfigProvider>;
  const globalMemoryPath = '/test/memory-bank/docs/global-memory-bank';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up file system service mock
    mockFileSystemService = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      fileExists: jest.fn(),
      deleteFile: jest.fn(),
      createDirectory: jest.fn(),
      directoryExists: jest.fn(),
      listFiles: jest.fn(),
      getFileStats: jest.fn()
    } as jest.Mocked<IFileSystemService>;

    // Set up config provider mock
    mockConfigProvider = {
      initialize: jest.fn(),
      getConfig: jest.fn(),
      getGlobalMemoryPath: jest.fn().mockReturnValue(globalMemoryPath),
      getBranchMemoryPath: jest.fn(),
      getLanguage: jest.fn()
    } as jest.Mocked<IConfigProvider>;

    // Create repository with mocks
    repository = new FileSystemGlobalMemoryBankRepository(
      mockFileSystemService,
      mockConfigProvider
    );

    // Reset mock document repository methods for each test
    Object.values(mockDocumentRepositoryInstance).forEach(mockFn => mockFn.mockReset());
  });

  describe('getDocument', () => {
    it('should delegate to document repository and return document when found', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const mockDocument = MemoryDocument.create({
        path: docPath,
        content: '# Test\n\ntags: #test\n\nContent',
        tags: [Tag.create('test')],
        lastModified: new Date('2023-01-01')
      });

      mockDocumentRepositoryInstance.findByPath.mockResolvedValue(mockDocument);

      // Act
      const result = await repository.getDocument(docPath);

      // Assert
      expect(result).toBe(mockDocument);
      expect(mockDocumentRepositoryInstance.findByPath).toHaveBeenCalledWith(docPath);
    });

    it('should return null when document is not found', async () => {
      // Arrange
      const docPath = DocumentPath.create('nonexistent.md');
      mockDocumentRepositoryInstance.findByPath.mockResolvedValue(null);

      // Act
      const result = await repository.getDocument(docPath);

      // Assert
      expect(result).toBeNull();
      expect(mockDocumentRepositoryInstance.findByPath).toHaveBeenCalledWith(docPath);
    });

    it('should handle errors and wrap them', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const error = new Error('Repository error');
      mockDocumentRepositoryInstance.findByPath.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.getDocument(docPath)).rejects.toThrow(InfrastructureError);
    });
  });

  describe('saveDocument', () => {
    it('should delegate to document repository and update tags index for markdown documents', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const document = MemoryDocument.create({
        path: docPath,
        content: '# Test Document\n\ntags: #test\n\nContent',
        tags: [Tag.create('test')],
        lastModified: new Date('2023-01-01')
      });

      // Setup mocks
      mockDocumentRepositoryInstance.save.mockResolvedValue(undefined);
      
      // Mock isMarkdown to return true
      const isMarkdownSpy = jest.spyOn(document, 'isMarkdown', 'get').mockReturnValue(true);
      
      // Mock updateTagsIndex
      const updateTagsIndexSpy = jest.spyOn(repository, 'updateTagsIndex').mockResolvedValue(undefined);

      try {
        // Act
        await repository.saveDocument(document);

        // Assert
        expect(mockDocumentRepositoryInstance.save).toHaveBeenCalledWith(document);
        expect(updateTagsIndexSpy).toHaveBeenCalled();
      } finally {
        // Cleanup spies
        isMarkdownSpy.mockRestore();
        updateTagsIndexSpy.mockRestore();
      }
    });

    it('should handle errors when saving document', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const document = MemoryDocument.create({
        path: docPath,
        content: '# Test Document\n\ntags: #test\n\nContent',
        tags: [Tag.create('test')],
        lastModified: new Date('2023-01-01')
      });

      // Setup mocks - simulate an error in save
      const error = new Error('Save error');
      mockDocumentRepositoryInstance.save.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.saveDocument(document)).rejects.toThrow(InfrastructureError);
    });
  });

  describe('deleteDocument', () => {
    it('should delegate to document repository and update tags index when deletion succeeds', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      
      // Setup mocks
      mockDocumentRepositoryInstance.delete.mockResolvedValue(true);
      
      // Mock updateTagsIndex
      const updateTagsIndexSpy = jest.spyOn(repository, 'updateTagsIndex').mockResolvedValue(undefined);

      try {
        // Act
        const result = await repository.deleteDocument(docPath);

        // Assert
        expect(result).toBe(true);
        expect(mockDocumentRepositoryInstance.delete).toHaveBeenCalledWith(docPath);
        expect(updateTagsIndexSpy).toHaveBeenCalled();
      } finally {
        // Cleanup spies
        updateTagsIndexSpy.mockRestore();
      }
    });

    it('should not update tags index when deletion fails', async () => {
      // Arrange
      const docPath = DocumentPath.create('nonexistent.md');
      
      // Setup mocks
      mockDocumentRepositoryInstance.delete.mockResolvedValue(false);
      
      // Mock updateTagsIndex
      const updateTagsIndexSpy = jest.spyOn(repository, 'updateTagsIndex').mockResolvedValue(undefined);

      try {
        // Act
        const result = await repository.deleteDocument(docPath);

        // Assert
        expect(result).toBe(false);
        expect(mockDocumentRepositoryInstance.delete).toHaveBeenCalledWith(docPath);
        expect(updateTagsIndexSpy).not.toHaveBeenCalled();
      } finally {
        // Cleanup spies
        updateTagsIndexSpy.mockRestore();
      }
    });

    it('should handle errors when deleting document', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      
      // Setup mocks - simulate an error in delete
      const error = new Error('Delete error');
      mockDocumentRepositoryInstance.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.deleteDocument(docPath)).rejects.toThrow(InfrastructureError);
    });
  });

  describe('listDocuments', () => {
    it('should delegate to document repository and return document paths', async () => {
      // Arrange
      const expectedPaths = [
        DocumentPath.create('doc1.md'),
        DocumentPath.create('doc2.md')
      ];
      
      // Setup mocks
      mockDocumentRepositoryInstance.list.mockResolvedValue(expectedPaths);

      // Act
      const result = await repository.listDocuments();

      // Assert
      expect(result).toEqual(expectedPaths);
      expect(mockDocumentRepositoryInstance.list).toHaveBeenCalled();
    });

    it('should handle errors when listing documents', async () => {
      // Arrange
      const error = new Error('List error');
      mockDocumentRepositoryInstance.list.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.listDocuments()).rejects.toThrow(InfrastructureError);
    });
  });

  describe('findDocumentsByTags', () => {
    it('should delegate to document repository and return matching documents', async () => {
      // Arrange
      const tags = [Tag.create('test')];
      const expectedDocuments = [
        MemoryDocument.create({
          path: DocumentPath.create('doc1.md'),
          content: '# Doc 1\n\ntags: #test\n\nContent',
          tags: [Tag.create('test')],
          lastModified: new Date('2023-01-01')
        })
      ];
      
      // Setup mocks
      mockDocumentRepositoryInstance.findByTags.mockResolvedValue(expectedDocuments);

      // Act
      const result = await repository.findDocumentsByTags(tags);

      // Assert
      expect(result).toEqual(expectedDocuments);
      expect(mockDocumentRepositoryInstance.findByTags).toHaveBeenCalledWith(tags);
    });

    it('should handle errors when finding documents by tags', async () => {
      // Arrange
      const tags = [Tag.create('test')];
      const error = new Error('Find by tags error');
      mockDocumentRepositoryInstance.findByTags.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.findDocumentsByTags(tags)).rejects.toThrow(InfrastructureError);
    });
  });
});
