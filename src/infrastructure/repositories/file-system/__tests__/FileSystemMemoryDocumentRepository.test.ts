import path from 'path';
import { FileSystemMemoryDocumentRepository } from '../FileSystemMemoryDocumentRepository.js';
import { IFileSystemService } from '../../../storage/interfaces/IFileSystemService.js';
import { DocumentPath } from '../../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../../domain/entities/Tag.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../../shared/errors/InfrastructureError.js';
import { DomainError, DomainErrorCodes } from '../../../../shared/errors/DomainError.js';

// Mock the extractTags utility to have more control in tests
jest.mock('../../../../shared/utils/index.js', () => {
  const originalModule = jest.requireActual('../../../../shared/utils/index.js');
  return {
    ...originalModule,
    extractTags: jest.fn()
  };
});

// Import after mocking
import { extractTags } from '../../../../shared/utils/index.js';

describe('FileSystemMemoryDocumentRepository', () => {
  let repository: FileSystemMemoryDocumentRepository;
  let mockFileSystemService: jest.Mocked<IFileSystemService>;
  const basePath = '/test/docs';
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock for extractTags with default implementation
    (extractTags as jest.Mock).mockImplementation((content: string) => {
      const match = content.match(/tags:\s+([#\w\s-]+)/);
      if (match && match[1]) {
        return match[1].trim().split(/\s+/).map(tag => tag.substring(1));
      }
      return [];
    });
    
    // Create mock file system service
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
    
    // Create repository
    repository = new FileSystemMemoryDocumentRepository(basePath, mockFileSystemService);
    
    // Suppress console output in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findByPath', () => {
    it('should return document when file exists', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const fullPath = path.join(basePath, 'test.md');
      const content = '# Test Document\n\ntags: #test #document\n\nTest content';
      
      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockResolvedValue(content);
      mockFileSystemService.getFileStats.mockResolvedValue({
        size: 100,
        isDirectory: false,
        isFile: true,
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
        createdAt: new Date('2023-01-01T00:00:00.000Z')
      });
      
      // Set up extractTags to return expected tags
      (extractTags as jest.Mock).mockReturnValue(['test', 'document']);
      
      // Act
      const result = await repository.findByPath(docPath);
      
      // Assert
      expect(result).toBeDefined();
      expect(result?.path.value).toBe('test.md');
      expect(result?.content).toBe(content);
      expect(result?.tags).toHaveLength(2);
      expect(result?.tags[0].value).toBe('test');
      expect(result?.tags[1].value).toBe('document');
      expect(result?.lastModified.toISOString()).toBe('2023-01-01T00:00:00.000Z');
      
      // Verify fileSystemService calls
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(fullPath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(fullPath);
      expect(mockFileSystemService.getFileStats).toHaveBeenCalledWith(fullPath);
    });

    it('should return null when file does not exist', async () => {
      // Arrange
      const docPath = DocumentPath.create('nonexistent.md');
      const fullPath = path.join(basePath, 'nonexistent.md');
      
      mockFileSystemService.fileExists.mockResolvedValue(false);
      
      // Act
      const result = await repository.findByPath(docPath);
      
      // Assert
      expect(result).toBeNull();
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(fullPath);
      expect(mockFileSystemService.readFile).not.toHaveBeenCalled();
    });

    it('should handle FILE_NOT_FOUND error and return null', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const fullPath = path.join(basePath, 'test.md');
      const notFoundError = new InfrastructureError(
        InfrastructureErrorCodes.FILE_NOT_FOUND,
        'File not found'
      );
      
      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockRejectedValue(notFoundError);
      
      // Act
      const result = await repository.findByPath(docPath);
      
      // Assert
      expect(result).toBeNull();
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(fullPath);
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(fullPath);
    });

    it('should pass through domain errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const fullPath = path.join(basePath, 'test.md');
      const domainError = new DomainError(
        DomainErrorCodes.INVALID_TAG_FORMAT,
        'Invalid tag format'
      );
      
      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockResolvedValue('content');
      // Simulate error during tag extraction
      (extractTags as jest.Mock).mockImplementation(() => {
        throw domainError;
      });
      
      // Act & Assert
      await expect(repository.findByPath(docPath)).rejects.toThrow(DomainError);
      await expect(repository.findByPath(docPath)).rejects.toThrow('Invalid tag format');
    });

    it('should handle and wrap other errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const fullPath = path.join(basePath, 'test.md');
      const error = new Error('Unknown error');
      
      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockRejectedValue(error);
      
      // Act & Assert
      await expect(repository.findByPath(docPath)).rejects.toThrow(InfrastructureError);
      
      try {
        await repository.findByPath(docPath);
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(`INFRA_ERROR.${InfrastructureErrorCodes.FILE_READ_ERROR}`);
        expect((e as InfrastructureError).details).toEqual({ originalError: error });
      }
    });
  });

  describe('findByTags', () => {
    it('should find documents with matching tags', async () => {
      // Arrange
      const tagsToFind = [Tag.create('architecture')];
      const files = [
        path.join(basePath, 'doc1.md'),
        path.join(basePath, 'doc2.md'),
        path.join(basePath, 'doc3.md'),
        path.join(basePath, 'not-markdown.txt')
      ];
      
      // Document contents with different tags
      const doc1Content = '# Doc 1\n\ntags: #architecture #design\n\nContent';
      const doc2Content = '# Doc 2\n\ntags: #ui #design\n\nContent';
      const doc3Content = '# Doc 3\n\ntags: #architecture #api\n\nContent';
      
      // Mock listFiles to return file paths
      mockFileSystemService.listFiles.mockResolvedValue(files);
      
      // Setup fileExists mock
      mockFileSystemService.fileExists.mockImplementation(async (filePath) => {
        return filePath.endsWith('.md');
      });
      
      // Setup readFile mock
      mockFileSystemService.readFile.mockImplementation(async (filePath) => {
        if (filePath.includes('doc1.md')) return doc1Content;
        if (filePath.includes('doc2.md')) return doc2Content;
        if (filePath.includes('doc3.md')) return doc3Content;
        return '';
      });
      
      // Setup getFileStats mock
      mockFileSystemService.getFileStats.mockImplementation(async (filePath) => {
        return {
          size: 100,
          isDirectory: false,
          isFile: true,
          lastModified: new Date('2023-01-01T00:00:00.000Z'),
          createdAt: new Date('2023-01-01T00:00:00.000Z')
        };
      });
      
      // Mock extractTags for each document
      (extractTags as jest.Mock).mockImplementation((content: string) => {
        if (content === doc1Content) return ['architecture', 'design'];
        if (content === doc2Content) return ['ui', 'design'];
        if (content === doc3Content) return ['architecture', 'api'];
        return [];
      });
      
      // Act
      const result = await repository.findByTags(tagsToFind);
      
      // Assert
      expect(result).toHaveLength(2); // Should find 2 documents with 'architecture' tag
      expect(result[0].path.value).toBe('doc1.md');
      expect(result[1].path.value).toBe('doc3.md');
      expect(result[0].tags[0].value).toBe('architecture');
      expect(result[1].tags[0].value).toBe('architecture');
    });

    it('should return empty array when no documents match tags', async () => {
      // Arrange
      const tagsToFind = [Tag.create('nonexistent')];
      const files = [
        path.join(basePath, 'doc1.md'),
        path.join(basePath, 'doc2.md')
      ];
      
      // Document content with different tags
      const docContent = '# Doc\n\ntags: #other #tag\n\nContent';
      
      // Mock listFiles to return file paths
      mockFileSystemService.listFiles.mockResolvedValue(files);
      
      // Setup fileExists mock
      mockFileSystemService.fileExists.mockResolvedValue(true);
      
      // Setup readFile mock
      mockFileSystemService.readFile.mockResolvedValue(docContent);
      
      // Setup getFileStats mock
      mockFileSystemService.getFileStats.mockResolvedValue({
        size: 100,
        isDirectory: false,
        isFile: true,
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
        createdAt: new Date('2023-01-01T00:00:00.000Z')
      });
      
      // Mock extractTags to return tags that don't match our search
      (extractTags as jest.Mock).mockReturnValue(['other', 'tag']);
      
      // Act
      const result = await repository.findByTags(tagsToFind);
      
      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle errors when reading files and continue with valid ones', async () => {
      // Arrange
      const tagsToFind = [Tag.create('architecture')];
      const files = [
        path.join(basePath, 'valid.md'),
        path.join(basePath, 'error.md')
      ];
      
      // Document content with tag matching search criteria
      const validContent = '# Doc\n\ntags: #architecture\n\nContent';
      
      // Mock listFiles to return file paths
      mockFileSystemService.listFiles.mockResolvedValue(files);
      
      // Setup fileExists mock
      mockFileSystemService.fileExists.mockImplementation(async (filePath) => {
        return true; // All files exist
      });
      
      // Setup readFile mock
      mockFileSystemService.readFile.mockImplementation(async (filePath) => {
        if (filePath.includes('error.md')) {
          throw new Error('Error reading file');
        }
        return validContent;
      });
      
      // Setup getFileStats mock
      mockFileSystemService.getFileStats.mockResolvedValue({
        size: 100,
        isDirectory: false,
        isFile: true,
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
        createdAt: new Date('2023-01-01T00:00:00.000Z')
      });
      
      // Mock extractTags to return matching tags for valid document
      (extractTags as jest.Mock).mockReturnValue(['architecture']);
      
      // Act
      const result = await repository.findByTags(tagsToFind);
      
      // Assert
      expect(result).toHaveLength(1); // Should still find the valid document
      expect(result[0].path.value).toBe('valid.md');
      expect(result[0].tags[0].value).toBe('architecture');
      
      // Verify error was logged
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle and wrap generic errors', async () => {
      // Arrange
      const tagsToFind = [Tag.create('architecture')];
      const error = new Error('Unknown error');
      
      mockFileSystemService.listFiles.mockRejectedValue(error);
      
      // Act & Assert
      await expect(repository.findByTags(tagsToFind)).rejects.toThrow(InfrastructureError);
      
      try {
        await repository.findByTags(tagsToFind);
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(`INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`);
        expect((e as InfrastructureError).details).toEqual({ originalError: error });
      }
    });
  });

  describe('save', () => {
    it('should save document with tags', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const fullPath = path.join(basePath, 'test.md');
      const content = '# Test Document\n\nContent';
      const document = MemoryDocument.create({
        path: docPath,
        content,
        tags: [Tag.create('test'), Tag.create('document')],
        lastModified: new Date('2023-01-01T00:00:00.000Z')
      });
      
      mockFileSystemService.writeFile.mockResolvedValue();
      
      // Act
      await repository.save(document);
      
      // Assert
      // Should save with content containing tags
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(
        fullPath,
        expect.stringContaining('tags: #test #document')
      );
    });

    it('should update existing tags in content', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const fullPath = path.join(basePath, 'test.md');
      const content = '# Test Document\n\ntags: #old #tags\n\nContent';
      const document = MemoryDocument.create({
        path: docPath,
        content,
        tags: [Tag.create('new'), Tag.create('updated')],
        lastModified: new Date('2023-01-01T00:00:00.000Z')
      });
      
      mockFileSystemService.writeFile.mockResolvedValue();
      
      // Act
      await repository.save(document);
      
      // Assert
      // Content should have updated tags
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(
        fullPath,
        expect.stringContaining('tags: #new #updated')
      );
      expect(mockFileSystemService.writeFile).not.toHaveBeenCalledWith(
        fullPath,
        expect.stringContaining('tags: #old #tags')
      );
    });

    it('should not modify content when document has no tags', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const fullPath = path.join(basePath, 'test.md');
      const content = '# Test Document\n\nContent without tags';
      const document = MemoryDocument.create({
        path: docPath,
        content,
        tags: [],
        lastModified: new Date('2023-01-01T00:00:00.000Z')
      });
      
      mockFileSystemService.writeFile.mockResolvedValue();
      
      // Act
      await repository.save(document);
      
      // Assert
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(
        fullPath,
        content // Content should remain unchanged
      );
    });

    it('should handle and wrap generic errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const content = '# Test Document\n\nContent';
      const document = MemoryDocument.create({
        path: docPath,
        content,
        tags: [Tag.create('test')],
        lastModified: new Date('2023-01-01T00:00:00.000Z')
      });
      
      const error = new Error('Unknown error');
      mockFileSystemService.writeFile.mockRejectedValue(error);
      
      // Act & Assert
      await expect(repository.save(document)).rejects.toThrow(InfrastructureError);
      
      try {
        await repository.save(document);
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(`INFRA_ERROR.${InfrastructureErrorCodes.FILE_WRITE_ERROR}`);
        expect((e as InfrastructureError).details).toEqual({ originalError: error });
      }
    });
  });

  describe('delete', () => {
    it('should delete document and return true on success', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const fullPath = path.join(basePath, 'test.md');
      
      mockFileSystemService.deleteFile.mockResolvedValue(true);
      
      // Act
      const result = await repository.delete(docPath);
      
      // Assert
      expect(result).toBe(true);
      expect(mockFileSystemService.deleteFile).toHaveBeenCalledWith(fullPath);
    });

    it('should return false when deletion fails', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const fullPath = path.join(basePath, 'test.md');
      
      mockFileSystemService.deleteFile.mockResolvedValue(false);
      
      // Act
      const result = await repository.delete(docPath);
      
      // Assert
      expect(result).toBe(false);
      expect(mockFileSystemService.deleteFile).toHaveBeenCalledWith(fullPath);
    });

    it('should handle and wrap generic errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const fullPath = path.join(basePath, 'test.md');
      const error = new Error('Unknown error');
      
      mockFileSystemService.deleteFile.mockRejectedValue(error);
      
      // Act & Assert
      await expect(repository.delete(docPath)).rejects.toThrow(InfrastructureError);
      
      try {
        await repository.delete(docPath);
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(`INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`);
        expect((e as InfrastructureError).details).toEqual({ originalError: error });
      }
    });
  });

  describe('list', () => {
    it('should list all markdown documents', async () => {
      // Arrange
      const files = [
        path.join(basePath, 'doc1.md'),
        path.join(basePath, 'doc2.md'),
        path.join(basePath, 'subdir/doc3.md'),
        path.join(basePath, 'not-markdown.txt')
      ];
      
      mockFileSystemService.listFiles.mockResolvedValue(files);
      
      // Act
      const results = await repository.list();
      
      // Assert
      expect(results).toHaveLength(3); // Should only include .md files
      expect(results[0].value).toBe('doc1.md');
      expect(results[1].value).toBe('doc2.md');
      expect(results[2].value).toBe('subdir/doc3.md');
    });

    it('should handle invalid document paths and continue with valid ones', async () => {
      // Arrange
      const files = [
        path.join(basePath, 'valid.md'),
        path.join(basePath, '../invalid.md') // This path contains '..' which should be filtered out
      ];
      
      mockFileSystemService.listFiles.mockResolvedValue(files);
      
      // Mock console.error to verify it's called
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Act
      const results = await repository.list();
      
      // Assert
      expect(results).toHaveLength(1); // Only valid path should be included
      expect(results[0].value).toBe('valid.md');
      expect(consoleErrorSpy).toHaveBeenCalled(); // Error should be logged for invalid path
    });

    it('should handle and wrap generic errors', async () => {
      // Arrange
      const error = new Error('Unknown error');
      mockFileSystemService.listFiles.mockRejectedValue(error);
      
      // Act & Assert
      await expect(repository.list()).rejects.toThrow(InfrastructureError);
      
      try {
        await repository.list();
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(`INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`);
        expect((e as InfrastructureError).details).toEqual({ originalError: error });
      }
    });
  });

  describe('resolvePath', () => {
    it('should resolve paths correctly', () => {
      // Arrange
      const documentPath = 'test.md';
      
      // Act
      const result = (repository as any).resolvePath(documentPath);
      
      // Assert
      expect(result).toBe(path.join(basePath, documentPath));
    });

    it('should normalize paths', () => {
      // Arrange
      const documentPath = 'subdir/../test.md';
      
      // Act
      const result = (repository as any).resolvePath(documentPath);
      
      // Assert
      expect(result).toBe(path.join(basePath, 'test.md'));
    });

    it('should throw InfrastructureError for path traversal attempts', () => {
      // Arrange
      const documentPath = '../outside.md';
      
      // Act & Assert
      expect(() => (repository as any).resolvePath(documentPath)).toThrow(InfrastructureError);
      expect(() => (repository as any).resolvePath(documentPath)).toThrow('Invalid document path');
    });
  });
});
