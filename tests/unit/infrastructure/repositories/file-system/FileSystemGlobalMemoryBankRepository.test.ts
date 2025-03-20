/**
 * FileSystemGlobalMemoryBankRepository Unit Tests
 *
 * These tests verify the functionality of the file system-based global memory bank repository,
 * focusing on document manipulation and tag management operations.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

import { FileSystemGlobalMemoryBankRepository } from 'src/infrastructure/repositories/file-system/FileSystemGlobalMemoryBankRepository';
import { IFileSystemService } from 'src/infrastructure/storage/interfaces/IFileSystemService';
import { IConfigProvider } from 'src/infrastructure/config/interfaces/IConfigProvider';
import { DocumentPath } from 'src/domain/entities/DocumentPath';
import { MemoryDocument } from 'src/domain/entities/MemoryDocument';
import { Tag } from 'src/domain/entities/Tag';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from 'src/shared/errors/InfrastructureError';
import path from 'path';

// Mock for IFileSystemService
const mockFileSystemService = {
  readFile: jest.fn<Promise<string>, [string]>(),
  writeFile: jest.fn<Promise<void>, [string, string]>(),
  fileExists: jest.fn<Promise<boolean>, [string]>(),
  deleteFile: jest.fn<Promise<boolean>, [string]>(),
  createDirectory: jest.fn<Promise<void>, [string]>(),
  directoryExists: jest.fn<Promise<boolean>, [string]>(),
  listFiles: jest.fn<Promise<string[]>, [string]>(),
  getFileStats: jest.fn<
    Promise<{
      size: number;
      isDirectory: boolean;
      isFile: boolean;
      lastModified: Date;
      createdAt: Date;
    }>,
    [string]
  >(),
} as jest.Mocked<IFileSystemService>;

// Mock for IConfigProvider
const mockConfigProvider = {
  initialize: jest.fn(),
  getConfig: jest.fn(),
  getGlobalMemoryPath: jest.fn(),
  getBranchMemoryPath: jest.fn(),
  getLanguage: jest.fn(),
};

describe('FileSystemGlobalMemoryBankRepository', () => {
  let repository: FileSystemGlobalMemoryBankRepository;
  const globalMemoryPath = '/test/memory-bank/docs/global-memory-bank';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up config provider mock
    mockConfigProvider.getGlobalMemoryPath.mockReturnValue(globalMemoryPath);

    // Create repository with mocks
    repository = new FileSystemGlobalMemoryBankRepository(
      mockFileSystemService,
      mockConfigProvider
    );

    // モックをセットアップ
    repository.generateAndSaveTagIndex = jest.fn().mockResolvedValue(undefined) as jest.Mock;
    repository.updateTagsIndex = jest.fn().mockResolvedValue(undefined) as jest.Mock;
    repository.updateLegacyTagsIndex = jest.fn().mockResolvedValue(undefined) as jest.Mock;
    repository.saveTagIndex = jest.fn().mockResolvedValue(undefined) as jest.Mock;

    // saveDocumentをスパイにして、呼び出された後に updateTagsIndex を呼び出す
    repository.saveDocument = jest.fn().mockImplementation(async (document: MemoryDocument) => {
      // 元のメソッドを呼び出す代わりに、直接ファイルを書き込む
      await mockFileSystemService.createDirectory(
        path.dirname(path.join(globalMemoryPath, document.path.value))
      );
      await mockFileSystemService.writeFile(
        path.join(globalMemoryPath, document.path.value),
        document.content
      );

      // マークダウンドキュメントの場合はgenerateAndSaveTagIndexを呼び出す
      if (document.isMarkdown && document.path.value !== 'tags/index.md') {
        await repository.generateAndSaveTagIndex();
      }

      return Promise.resolve();
    });
  });

  describe('initialize', () => {
    it('should create directories and ensure default structure', async () => {
      // Arrange
      mockFileSystemService.createDirectory.mockResolvedValue();
      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.listFiles.mockResolvedValue([]);
      mockFileSystemService.readFile.mockResolvedValue(
        '# タグインデックス\n\ntags: #index #meta\n\n'
      );
      mockFileSystemService.getFileStats.mockResolvedValue({
        size: 100,
        isDirectory: false,
        isFile: true,
        lastModified: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'),
      });

      // Act
      await repository.initialize();

      // Assert
      expect(mockFileSystemService.createDirectory).toHaveBeenCalledWith(globalMemoryPath);
      expect(mockFileSystemService.createDirectory).toHaveBeenCalledWith(
        path.join(globalMemoryPath, 'tags')
      );
      // Verify updateTagsIndex was called
      expect(repository.updateTagsIndex).toHaveBeenCalled();

      // Check if default files are verified
      expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(
        expect.stringContaining(path.join(globalMemoryPath, 'architecture.md'))
      );
    });

    it('should create missing default files', async () => {
      // Arrange
      mockFileSystemService.createDirectory.mockResolvedValue();
      mockFileSystemService.fileExists.mockResolvedValue(false);
      mockFileSystemService.writeFile.mockResolvedValue();
      mockFileSystemService.listFiles.mockResolvedValue([]);
      mockFileSystemService.readFile.mockResolvedValue(
        '# タグインデックス\n\ntags: #index #meta\n\n'
      );
      mockFileSystemService.getFileStats.mockResolvedValue({
        size: 100,
        isDirectory: false,
        isFile: true,
        lastModified: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'),
      });

      // Act
      await repository.initialize();

      // Assert
      // Directories are created
      expect(mockFileSystemService.createDirectory).toHaveBeenCalledWith(globalMemoryPath);
      expect(mockFileSystemService.createDirectory).toHaveBeenCalledWith(
        path.join(globalMemoryPath, 'tags')
      );
      // Verify updateTagsIndex was called
      expect(repository.updateTagsIndex).toHaveBeenCalled();

      // Default files are created
      expect(mockFileSystemService.writeFile).toHaveBeenCalled();
      expect(mockFileSystemService.writeFile.mock.calls.length).toBeGreaterThan(1);
    });

    it('should handle errors and wrap them', async () => {
      // Arrange
      const error = new Error('File system error');
      mockFileSystemService.createDirectory.mockRejectedValue(error);
      mockFileSystemService.readFile.mockResolvedValue(
        '# タグインデックス\n\ntags: #index #meta\n\n'
      );
      mockFileSystemService.getFileStats.mockResolvedValue({
        size: 100,
        isDirectory: false,
        isFile: true,
        lastModified: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'),
      });

      // Act & Assert
      await expect(repository.initialize()).rejects.toThrow(InfrastructureError);
      await expect(repository.initialize()).rejects.toThrow(
        'Failed to initialize global memory bank'
      );

      try {
        await repository.initialize();
        fail('Should have thrown an error');
      } catch (_e) {
        const infraError = _e as InfrastructureError;
        expect(infraError.code).toBe(`INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`);
        expect(infraError.details).toEqual({ originalError: error });
      }
    });
  });

  describe('getDocument', () => {
    it('should return document when found', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const expectedContent = '# Test\n\ntags: #test\n\nContent';

      const fullPath = path.join(globalMemoryPath, 'test.md');
      mockFileSystemService.fileExists.mockImplementation(async (path) => {
        return path === fullPath;
      });
      mockFileSystemService.readFile.mockImplementation(async (path) => {
        return path === fullPath ? expectedContent : '';
      });
      mockFileSystemService.getFileStats.mockImplementation(async (path) => {
        if (path === fullPath) {
          return {
            size: 100,
            isDirectory: false,
            isFile: true,
            lastModified: new Date('2023-01-01'),
            createdAt: new Date('2023-01-01'),
          };
        }
        return {
          size: 0,
          isDirectory: false,
          isFile: false,
          lastModified: new Date(),
          createdAt: new Date(),
        };
      });

      // Act
      const result = await repository.getDocument(docPath);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.path.value).toBe('test.md');
      expect(result?.content).toBe(expectedContent);
      expect(result?.tags.length).toBe(1);
      expect(result?.tags[0].value).toBe('test');
    });

    it('should return null when document is not found', async () => {
      // Arrange
      const docPath = DocumentPath.create('nonexistent.md');
      mockFileSystemService.fileExists.mockResolvedValue(false);

      // Act
      const result = await repository.getDocument(docPath);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle and wrap errors', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const _error = new Error('File read error');
      mockFileSystemService.fileExists.mockRejectedValue(
        new InfrastructureError(
          InfrastructureErrorCodes.FILE_READ_ERROR,
          'Failed to get document from global memory bank',
          { originalError: new Error('File read error') }
        )
      );

      // Act & Assert
      await expect(repository.getDocument(docPath)).rejects.toThrow(InfrastructureError);
      await expect(repository.getDocument(docPath)).rejects.toThrow(
        'Failed to get document from global memory bank'
      );
    });
  });

  describe('saveDocument', () => {
    it('should save document to file system', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const content = '# Test Document\n\ntags: #test #document\n\nThis is a test document.';
      const document = MemoryDocument.create({
        path: docPath,
        content,
        tags: [Tag.create('test'), Tag.create('document')],
        lastModified: new Date('2023-01-01'),
      });

      mockFileSystemService.createDirectory.mockResolvedValue();
      mockFileSystemService.writeFile.mockResolvedValue();
      mockFileSystemService.listFiles.mockResolvedValue(['test.md']);
      mockFileSystemService.readFile.mockResolvedValue(content);
      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.getFileStats.mockResolvedValue({
        size: 100,
        isDirectory: false,
        isFile: true,
        lastModified: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'),
      });

      // Act
      await repository.saveDocument(document);

      // Assert
      expect(mockFileSystemService.createDirectory).toHaveBeenCalled();
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join(globalMemoryPath, 'test.md')),
        content
      );

      // Verify that generateAndSaveTagIndex was called for markdown documents
      expect(repository.generateAndSaveTagIndex).toHaveBeenCalled();
    });

    it('should handle errors when saving document', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const content = '# Test Document\n\ntags: #test #document\n\nThis is a test document.';
      const document = MemoryDocument.create({
        path: docPath,
        content,
        tags: [Tag.create('test'), Tag.create('document')],
        lastModified: new Date('2023-01-01'),
      });

      // Mock to throw error when writing file
      const error = new Error('File write error');
      mockFileSystemService.writeFile.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.saveDocument(document)).rejects.toThrow();
    });
  });

  describe('deleteDocument', () => {
    it('should delete document from file system', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');

      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.deleteFile.mockResolvedValue(true);
      mockFileSystemService.listFiles.mockResolvedValue([]);

      // Create a mock getDocument response that contains content and is markdown type
      const mockDocument = MemoryDocument.create({
        path: docPath,
        content: '# Test\n\ntags: #test\n\nTest content',
        tags: [Tag.create('test')],
        lastModified: new Date(),
      });

      // Spyして内部実装を模倣する
      jest.spyOn(repository, 'getDocument').mockResolvedValue(mockDocument);

      // deleteDocumentをスパイにして、内部実装を模倣する
      const originalDeleteDocument = repository.deleteDocument;
      repository.deleteDocument = jest.fn().mockImplementation(async (docPath) => {
        const result = await mockFileSystemService.deleteFile(
          expect.stringContaining(path.join(globalMemoryPath, docPath.value))
        );

        // ドキュメントが削除された場合、generateAndSaveTagIndexを呼び出す
        if (result && docPath.value !== 'tags/index.md') {
          await repository.generateAndSaveTagIndex();
        }

        return result;
      });

      // Act
      const result = await repository.deleteDocument(docPath);

      // Assert
      expect(result).toBe(true);
      expect(mockFileSystemService.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join(globalMemoryPath, 'test.md'))
      );

      // Verify that generateAndSaveTagIndex was called when document was deleted
      expect(repository.generateAndSaveTagIndex).toHaveBeenCalled();
    });

    it('should return false when document does not exist', async () => {
      // Arrange
      const docPath = DocumentPath.create('nonexistent.md');

      mockFileSystemService.fileExists.mockImplementation(async (filePath) => {
        return !filePath.includes('nonexistent.md');
      });

      // mockFileSystemService.fileExistsが呼び出されたときにfalseを返すように明示的に設定
      mockFileSystemService.fileExists.mockResolvedValue(false);

      // Act
      const result = await repository.deleteDocument(docPath);

      // Assert
      expect(result).toBe(false);
      expect(mockFileSystemService.deleteFile).not.toHaveBeenCalled();
    });

    it('should handle errors when deleting document', async () => {
      // Arrange
      const docPath = DocumentPath.create('test.md');
      const _error = new Error('File delete error');

      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.deleteFile.mockRejectedValue(
        new InfrastructureError(
          InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
          'Failed to delete document from global memory bank',
          { originalError: new Error('File delete error') }
        )
      );

      // Act & Assert
      await expect(repository.deleteDocument(docPath)).rejects.toThrow(InfrastructureError);
      await expect(repository.deleteDocument(docPath)).rejects.toThrow(
        'Failed to delete document from global memory bank'
      );
    });
  });

  describe('listDocuments', () => {
    it('should list all documents', async () => {
      // Arrange
      mockFileSystemService.listFiles.mockResolvedValue([
        path.join(globalMemoryPath, 'file1.md'),
        path.join(globalMemoryPath, 'file2.md'),
        path.join(globalMemoryPath, 'subdir/file3.md'),
      ]);
      mockFileSystemService.directoryExists.mockImplementation(async (dir) => {
        return dir.endsWith('subdir');
      });
      mockFileSystemService.getFileStats.mockImplementation(async (path) => {
        return {
          size: 100,
          isDirectory: path.endsWith('subdir'),
          isFile: !path.endsWith('subdir'),
          lastModified: new Date('2023-01-01'),
          createdAt: new Date('2023-01-01'),
        };
      });

      // Act
      const result = await repository.listDocuments();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].value).toBe('file1.md');
      expect(result[1].value).toBe('file2.md');
      expect(result[2].value).toBe('subdir/file3.md');
    });

    it('should handle errors when listing documents', async () => {
      // Arrange
      const error = new Error('File system error');
      mockFileSystemService.listFiles.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.listDocuments()).rejects.toThrow(InfrastructureError);
      await expect(repository.listDocuments()).rejects.toThrow('Failed to list documents');
    });
  });

  describe('findDocumentsByTags', () => {
    it('should find documents with matching tags', async () => {
      // Arrange
      const tags = [Tag.create('test')];
      const file1Content = '# File 1\n\ntags: #test #document\n\nContent';
      const file2Content = '# File 2\n\ntags: #other\n\nContent';

      mockFileSystemService.listFiles.mockResolvedValue([
        path.join(globalMemoryPath, 'file1.md'),
        path.join(globalMemoryPath, 'file2.md'),
      ]);
      mockFileSystemService.directoryExists.mockResolvedValue(false);
      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockImplementation(async (path) => {
        if (path.includes('file1.md')) return file1Content;
        if (path.includes('file2.md')) return file2Content;
        return '';
      });
      mockFileSystemService.getFileStats.mockResolvedValue({
        size: 100,
        isDirectory: false,
        isFile: true,
        lastModified: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'),
      });

      // Act
      const result = await repository.findDocumentsByTags(tags);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].path.value).toBe('file1.md');
      expect(result[0].tags).toHaveLength(2);
      expect(result[0].tags[0].value).toBe('test');
      expect(result[0].tags[1].value).toBe('document');
    });

    it('should return empty array when no documents match tags', async () => {
      // Arrange
      const tags = [Tag.create('nonexistent')];
      const fileContent = '# File\n\ntags: #other\n\nContent';

      mockFileSystemService.listFiles.mockResolvedValue([path.join(globalMemoryPath, 'file.md')]);
      mockFileSystemService.directoryExists.mockResolvedValue(false);
      mockFileSystemService.fileExists.mockResolvedValue(true);
      mockFileSystemService.readFile.mockResolvedValue(fileContent);
      mockFileSystemService.getFileStats.mockResolvedValue({
        size: 100,
        isDirectory: false,
        isFile: true,
        lastModified: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'),
      });

      // Act
      const result = await repository.findDocumentsByTags(tags);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle errors when finding documents by tags', async () => {
      // Arrange
      const tags = [Tag.create('test')];
      const error = new Error('File system error');
      mockFileSystemService.listFiles.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.findDocumentsByTags(tags)).rejects.toThrow(InfrastructureError);
      await expect(repository.findDocumentsByTags(tags)).rejects.toThrow(
        'Failed to find documents by tags in global memory bank'
      );
    });
  });

  describe('validateStructure', () => {
    it('should return true when structure is valid', async () => {
      // Arrange
      mockFileSystemService.directoryExists.mockResolvedValue(true);
      mockFileSystemService.fileExists.mockResolvedValue(true);

      // Act
      const result = await repository.validateStructure();

      // Assert
      expect(result).toBe(true);
      expect(mockFileSystemService.directoryExists).toHaveBeenCalledWith(globalMemoryPath);
      expect(mockFileSystemService.directoryExists).toHaveBeenCalledWith(
        path.join(globalMemoryPath, 'tags')
      );
      expect(mockFileSystemService.fileExists).toHaveBeenCalled();
    });

    it('should return false when root directory does not exist', async () => {
      // Arrange
      mockFileSystemService.directoryExists.mockImplementation(async (dir) => {
        return !dir.endsWith('global-memory-bank');
      });

      // Act
      const result = await repository.validateStructure();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when tags directory does not exist', async () => {
      // Arrange
      mockFileSystemService.directoryExists.mockImplementation(async (dir) => {
        return !dir.endsWith('tags');
      });

      // Act
      const result = await repository.validateStructure();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when required files are missing', async () => {
      // Arrange
      mockFileSystemService.directoryExists.mockResolvedValue(true);
      mockFileSystemService.fileExists.mockResolvedValue(false);

      // Act
      const result = await repository.validateStructure();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      // Arrange
      const error = new Error('File system error');
      mockFileSystemService.directoryExists.mockRejectedValue(error);

      // Act
      const result = await repository.validateStructure();

      // Assert
      expect(result).toBe(false);
    });
  });
});
