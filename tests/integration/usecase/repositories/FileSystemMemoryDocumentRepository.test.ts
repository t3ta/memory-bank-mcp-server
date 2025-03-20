import path from 'path';
import { FileSystemMemoryDocumentRepository } from '../FileSystemMemoryDocumentRepository';
import { IFileSystemService } from '../../../storage/interfaces/IFileSystemService';
import { DocumentPath } from '../../../../domain/entities/DocumentPath';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument';
import { Tag } from '../../../../domain/entities/Tag';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from '../../../../shared/errors/InfrastructureError';
import { DomainError, DomainErrorCodes } from '../../../../shared/errors/DomainError';

// Mock FileSystemService
const mockFileSystemService: jest.Mocked<IFileSystemService> = {
  readFile: jest.fn(),
  readFileChunk: jest.fn(),
  writeFile: jest.fn(),
  fileExists: jest.fn(),
  deleteFile: jest.fn(),
  createDirectory: jest.fn(),
  directoryExists: jest.fn(),
  listFiles: jest.fn(),
  getFileStats: jest.fn(),
};

// Mock utils functions
jest.mock('../../../../shared/utils/index', () => ({
  extractTags: jest.fn((content) => {
    const tagMatch = content.match(/tags:\s+((?:#[a-z0-9-]+\s*)+)/);
    if (tagMatch && tagMatch[1]) {
      return tagMatch[1]
        .trim()
        .split(/\s+/)
        .map((tag: string) => tag.substring(1));
    }
    return [];
  }),
}));

// Mock logger
jest.mock('../../../../shared/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import logger after mocking
import { logger } from '../../../../shared/utils/logger';

describe('FileSystemMemoryDocumentRepository', () => {
  let repository: FileSystemMemoryDocumentRepository;
  const basePath = '/test/docs';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create repository
    repository = new FileSystemMemoryDocumentRepository(basePath, mockFileSystemService);

    // Suppress console output in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks(); // Clear all mocks including logger
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
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
      });

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
      expect(mockFileSystemService.getFileStats).not.toHaveBeenCalled();
    });

    it('should handle FILE_NOT_FOUND error and return null', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
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
    });

    it('should pass through domain errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const domainError = new DomainError(
        DomainErrorCodes.INVALID_TAG_FORMAT,
        'Invalid tag format'
      );

      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockResolvedValue('content');
      // Simulate error during tag extraction
      jest
        .mocked(jest.requireMock('../../../../shared/utils/index'))
        .extractTags.mockImplementation(() => {
          throw domainError;
        });

      // Act & Assert
      await expect(repository.findByPath(docPath)).rejects.toThrow(DomainError);
      await expect(repository.findByPath(docPath)).rejects.toThrow('Invalid tag format');
    });

    it('should pass through infrastructure errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const infraError = new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        'Failed to read file'
      );

      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockRejectedValue(infraError);

      // Act & Assert
      await expect(repository.findByPath(docPath)).rejects.toThrow(InfrastructureError);
      await expect(repository.findByPath(docPath)).rejects.toThrow('Failed to read file');
    });

    it('should handle and wrap other errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const error = new Error('Unknown error');

      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.findByPath(docPath)).rejects.toThrow(InfrastructureError);
      await expect(repository.findByPath(docPath)).rejects.toThrow(
        `Failed to find document by path: ${docPath.value}`
      );

      try {
        await repository.findByPath(docPath);
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(
          `INFRA_ERROR.${InfrastructureErrorCodes.FILE_READ_ERROR}`
        );
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
        path.join(basePath, 'not-markdown.txt'),
      ];

      // Mock listFiles to return file paths
      mockFileSystemService.listFiles.mockResolvedValue(files);

      // Mock findByPath for different documents
      const findByPathSpy = jest
        .spyOn(repository, 'findByPath')
        .mockImplementation(async (docPath: DocumentPath) => {
          if (docPath.value === 'doc1.md') {
            return MemoryDocument.create({
              path: docPath,
              content: '# Doc 1\n\ntags: #architecture #design\n\nContent',
              tags: [Tag.create('architecture'), Tag.create('design')],
              lastModified: new Date('2023-01-01T00:00:00.000Z'),
            });
          } else if (docPath.value === 'doc2.md') {
            return MemoryDocument.create({
              path: docPath,
              content: '# Doc 2\n\ntags: #ui #design\n\nContent',
              tags: [Tag.create('ui'), Tag.create('design')],
              lastModified: new Date('2023-01-01T00:00:00.000Z'),
            });
          } else if (docPath.value === 'doc3.md') {
            return MemoryDocument.create({
              path: docPath,
              content: '# Doc 3\n\ntags: #architecture #api\n\nContent',
              tags: [Tag.create('architecture'), Tag.create('api')],
              lastModified: new Date('2023-01-01T00:00:00.000Z'),
            });
          }
          return null;
        });

      // Act
      const result = await repository.findByTags(tagsToFind);

      // Assert
      expect(result).toHaveLength(2); // Should find 2 documents with 'architecture' tag
      expect(result[0].path.value).toBe('doc1.md');
      expect(result[1].path.value).toBe('doc3.md');

      // Restore all spies
      findByPathSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should return empty array when no documents match tags', async () => {
      // Arrange
      const tagsToFind = [Tag.create('nonexistent')];
      const files = [path.join(basePath, 'doc1.md'), path.join(basePath, 'doc2.md')];

      // Mock listFiles to return file paths
      mockFileSystemService.listFiles.mockResolvedValue(files);

      // Mock findByPath to return documents without the searched tag
      const findByPathSpy = jest
        .spyOn(repository, 'findByPath')
        .mockImplementation(async (docPath: DocumentPath) => {
          return MemoryDocument.create({
            path: docPath,
            content: '# Doc\n\ntags: #other #tag\n\nContent',
            tags: [Tag.create('other'), Tag.create('tag')],
            lastModified: new Date('2023-01-01T00:00:00.000Z'),
          });
        });

      // Act
      const result = await repository.findByTags(tagsToFind);

      // Assert
      expect(result).toHaveLength(0);

      // Restore all spies
      findByPathSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should handle errors when reading files and continue with valid ones', async () => {
      // Arrange
      const tagsToFind = [Tag.create('architecture')];
      const files = [path.join(basePath, 'valid.md'), path.join(basePath, 'error.md')];

      // Mock listFiles to return file paths
      mockFileSystemService.listFiles.mockResolvedValue(files);

      // Mock findByPath to succeed for one file and fail for another
      const findByPathSpy = jest
        .spyOn(repository, 'findByPath')
        .mockImplementation(async (docPath: DocumentPath) => {
          if (docPath.value === 'valid.md') {
            return MemoryDocument.create({
              path: docPath,
              content: '# Doc\n\ntags: #architecture\n\nContent',
              tags: [Tag.create('architecture')],
              lastModified: new Date('2023-01-01T00:00:00.000Z'),
            });
          } else if (docPath.value === 'error.md') {
            throw new Error('Error reading file');
          }
          return null;
        });

      // Act
      const result = await repository.findByTags(tagsToFind);

      // Assert
      expect(result).toHaveLength(1); // Should still find the valid document
      expect(result[0].path.value).toBe('valid.md');

      // Verify error was logged
      expect(logger.error).toHaveBeenCalled();

      // Restore all spies
      findByPathSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should pass through domain errors', async () => {
      // Arrange
      const tagsToFind = [Tag.create('architecture')];
      const domainError = new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Invalid document path'
      );

      mockFileSystemService.listFiles.mockRejectedValue(domainError);

      // Act & Assert
      await expect(repository.findByTags(tagsToFind)).rejects.toThrow(DomainError);
      await expect(repository.findByTags(tagsToFind)).rejects.toThrow('Invalid document path');
    });

    it('should pass through infrastructure errors', async () => {
      // Arrange
      const tagsToFind = [Tag.create('architecture')];
      const infraError = new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        'File system error'
      );

      mockFileSystemService.listFiles.mockRejectedValue(infraError);

      // Act & Assert
      await expect(repository.findByTags(tagsToFind)).rejects.toThrow(InfrastructureError);
      await expect(repository.findByTags(tagsToFind)).rejects.toThrow('File system error');
    });

    it('should handle and wrap other errors', async () => {
      // Arrange
      const tagsToFind = [Tag.create('architecture')];
      const error = new Error('Unknown error');

      mockFileSystemService.listFiles.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.findByTags(tagsToFind)).rejects.toThrow(InfrastructureError);
      await expect(repository.findByTags(tagsToFind)).rejects.toThrow(
        'Failed to find documents by tags'
      );

      try {
        await repository.findByTags(tagsToFind);
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(
          `INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`
        );
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
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
      });

      mockFileSystemService.writeFile.mockResolvedValue();

      // Act
      await repository.save(document);

      // Assert
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(
        fullPath,
        expect.stringContaining('# Test Document')
      );
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
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
      });

      mockFileSystemService.writeFile.mockResolvedValue();

      // Act
      await repository.save(document);

      // Assert
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
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
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

    it('should pass through domain errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const content = '# Test Document\n\nContent';
      const document = MemoryDocument.create({
        path: docPath,
        content,
        tags: [Tag.create('test')],
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
      });

      const domainError = new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Invalid document path'
      );

      mockFileSystemService.writeFile.mockRejectedValue(domainError);

      // Act & Assert
      await expect(repository.save(document)).rejects.toThrow(DomainError);
      await expect(repository.save(document)).rejects.toThrow('Invalid document path');
    });

    it('should pass through infrastructure errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const content = '# Test Document\n\nContent';
      const document = MemoryDocument.create({
        path: docPath,
        content,
        tags: [Tag.create('test')],
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
      });

      const infraError = new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        'Failed to write file'
      );

      mockFileSystemService.writeFile.mockRejectedValue(infraError);

      // Act & Assert
      await expect(repository.save(document)).rejects.toThrow(InfrastructureError);
      await expect(repository.save(document)).rejects.toThrow('Failed to write file');
    });

    it('should handle and wrap other errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const content = '# Test Document\n\nContent';
      const document = MemoryDocument.create({
        path: docPath,
        content,
        tags: [Tag.create('test')],
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
      });

      const error = new Error('Unknown error');

      mockFileSystemService.writeFile.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.save(document)).rejects.toThrow(InfrastructureError);
      await expect(repository.save(document)).rejects.toThrow(
        `Failed to save document: ${docPath.value}`
      );

      try {
        await repository.save(document);
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(
          `INFRA_ERROR.${InfrastructureErrorCodes.FILE_WRITE_ERROR}`
        );
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

      mockFileSystemService.deleteFile.mockResolvedValue(false);

      // Act
      const result = await repository.delete(docPath);

      // Assert
      expect(result).toBe(false);
    });

    it('should pass through domain errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const domainError = new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Invalid document path'
      );

      mockFileSystemService.deleteFile.mockRejectedValue(domainError);

      // Act & Assert
      await expect(repository.delete(docPath)).rejects.toThrow(DomainError);
      await expect(repository.delete(docPath)).rejects.toThrow('Invalid document path');
    });

    it('should pass through infrastructure errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const infraError = new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        'File system error'
      );

      mockFileSystemService.deleteFile.mockRejectedValue(infraError);

      // Act & Assert
      await expect(repository.delete(docPath)).rejects.toThrow(InfrastructureError);
      await expect(repository.delete(docPath)).rejects.toThrow('File system error');
    });

    it('should handle and wrap other errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const error = new Error('Unknown error');

      mockFileSystemService.deleteFile.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.delete(docPath)).rejects.toThrow(InfrastructureError);
      await expect(repository.delete(docPath)).rejects.toThrow(
        `Failed to delete document: ${docPath.value}`
      );

      try {
        await repository.delete(docPath);
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(
          `INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`
        );
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
        path.join(basePath, 'not-markdown.txt'),
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
      // Set up the files to list
      const files = [
        path.join(basePath, 'valid.md'),
        path.join(basePath, '..', 'invalid.md'), // This path is outside the base directory
      ];

      mockFileSystemService.listFiles.mockResolvedValue(files);

      // Mock DocumentPath.create to throw error for invalid path
      jest.spyOn(DocumentPath, 'create').mockImplementation((pathStr) => {
        if (pathStr === 'valid.md') {
          return { value: 'valid.md' } as unknown as DocumentPath;
        }
        if (pathStr === '../invalid.md') {
          throw new DomainError(DomainErrorCodes.INVALID_DOCUMENT_PATH, 'Invalid document path');
        }
        return { value: pathStr } as unknown as DocumentPath;
      });

      // Mock path.relative to return the path strings
      jest.spyOn(path, 'relative').mockImplementation((from, to) => {
        console.log('DEBUG path.relative:', { from, to });
        if (to === path.join(basePath, 'valid.md')) {
          return 'valid.md';
        }
        if (to === path.join(basePath, '..', 'invalid.md')) {
          return '../invalid.md';
        }
        return '';
      });

      // Act
      const results = await repository.list();

      // Assert
      expect(results).toHaveLength(1); // Only the valid path should be included
      expect(results[0].value).toBe('valid.md');
      expect(logger.error).toHaveBeenCalled(); // Error should be logged for invalid path
    });

    it('should return empty array when no documents found', async () => {
      // Arrange
      mockFileSystemService.listFiles.mockResolvedValue([]);

      // Act
      const results = await repository.list();

      // Assert
      expect(results).toHaveLength(0);
    });

    it('should pass through domain errors', async () => {
      // Arrange
      const domainError = new DomainError(
        DomainErrorCodes.INVALID_DOCUMENT_PATH,
        'Invalid document path'
      );

      mockFileSystemService.listFiles.mockRejectedValue(domainError);

      // Act & Assert
      await expect(repository.list()).rejects.toThrow(DomainError);
      await expect(repository.list()).rejects.toThrow('Invalid document path');
    });

    it('should pass through infrastructure errors', async () => {
      // Arrange
      const infraError = new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        'File system error'
      );

      mockFileSystemService.listFiles.mockRejectedValue(infraError);

      // Act & Assert
      await expect(repository.list()).rejects.toThrow(InfrastructureError);
      await expect(repository.list()).rejects.toThrow('File system error');
    });

    it('should handle and wrap other errors', async () => {
      // Arrange
      const error = new Error('Unknown error');

      mockFileSystemService.listFiles.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.list()).rejects.toThrow(InfrastructureError);
      await expect(repository.list()).rejects.toThrow('Failed to list documents');

      try {
        await repository.list();
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(
          `INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`
        );
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

      try {
        (repository as any).resolvePath(documentPath);
      } catch (e) {
        expect((e as InfrastructureError).code).toBe(
          `INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`
        );
      }
    });
  });
});
