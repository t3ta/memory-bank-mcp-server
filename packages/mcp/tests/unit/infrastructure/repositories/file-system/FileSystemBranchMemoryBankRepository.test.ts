import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { FileSystemBranchMemoryBankRepository } from '../../../../../src/infrastructure/repositories/file-system/FileSystemBranchMemoryBankRepository.js';
import { FileSystemService } from '../../../../../src/infrastructure/storage/FileSystemService.js';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';
import { InfrastructureError } from '../../../../../src/shared/errors/InfrastructureError.js';
import type { IFileSystemService } from '../../../../../src/infrastructure/storage/interfaces/IFileSystemService.js';
import type { BranchTagIndex } from '@memory-bank/schemas';

// Mock FileSystemService
jest.mock('../../../../../src/infrastructure/storage/FileSystemService.js');

describe('FileSystemBranchMemoryBankRepository', () => {
  let repository: FileSystemBranchMemoryBankRepository;
  let fileSystemService: jest.Mocked<IFileSystemService>;
  let branchInfo: BranchInfo;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock FileSystemService
    fileSystemService = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      fileExists: jest.fn(),
      deleteFile: jest.fn(),
      createDirectory: jest.fn(),
      directoryExists: jest.fn(),
      listFiles: jest.fn(),
      getFileStats: jest.fn(),
      readFileChunk: jest.fn(),
      getBranchMemoryPath: jest.fn(),
      getConfig: jest.fn(),
    } as jest.Mocked<IFileSystemService>;

    // Create repository instance
    repository = new FileSystemBranchMemoryBankRepository(fileSystemService as unknown as FileSystemService);

    // Create test branch info
    branchInfo = BranchInfo.create('test-branch');
  });

  describe('initialize', () => {
    test('creates branch directory', async () => {
      fileSystemService.createDirectory.mockResolvedValue();

      await repository.initialize(branchInfo);

      expect(fileSystemService.createDirectory).toHaveBeenCalledWith(
        expect.stringContaining('test-branch')
      );
    });

    test('throws InfrastructureError when directory creation fails', async () => {
      fileSystemService.createDirectory.mockRejectedValue(new Error('Creation failed'));

      await expect(repository.initialize(branchInfo)).rejects.toThrow(InfrastructureError);
    });
  });

  describe('exists', () => {
    test('returns true when branch directory exists', async () => {
      fileSystemService.directoryExists.mockResolvedValue(true);

      const result = await repository.exists('test-branch');

      expect(result).toBe(true);
      expect(fileSystemService.directoryExists).toHaveBeenCalledWith(
        expect.stringContaining('test-branch')
      );
    });

    test('returns false when branch directory does not exist', async () => {
      fileSystemService.directoryExists.mockResolvedValue(false);

      const result = await repository.exists('test-branch');

      expect(result).toBe(false);
    });

    test('throws InfrastructureError when file system error occurs', async () => {
      fileSystemService.directoryExists.mockRejectedValue(new Error('File system error'));

      await expect(repository.exists('test-branch')).rejects.toThrow(InfrastructureError);
    });
  });

  describe('document operations', () => {
    const documentPath = DocumentPath.create('test.json');
    const validDocument = {
      schema: 'memory_document_v2',
      documentType: 'generic',
      path: 'test.json',
      title: 'Test Document',
      tags: ['test'],
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      version: 1,
    };

    test('returns null when document does not exist', async () => {
      fileSystemService.fileExists.mockResolvedValue(false);

      const result = await repository.getDocument(branchInfo, documentPath);

      expect(result).toBeNull();
      expect(fileSystemService.readFile).not.toHaveBeenCalled();
    });

    test('returns document when file exists and is valid', async () => {
      fileSystemService.fileExists.mockResolvedValue(true);
      fileSystemService.readFile.mockResolvedValue(JSON.stringify(validDocument));

      const result = await repository.getDocument(branchInfo, documentPath);

      expect(result).not.toBeNull();
      expect(result?.path.value).toBe('test.json');
    });

    test('saves document and updates tag index', async () => {
      const mockDocument = {
        path: documentPath,
        tags: [Tag.create('test')],
        lastModified: new Date(),
        title: 'Test Document',
        toJSON: () => validDocument,
      };

      fileSystemService.writeFile.mockResolvedValue();
      fileSystemService.fileExists.mockResolvedValue(true);
      fileSystemService.readFile.mockResolvedValue(JSON.stringify(validDocument));
      fileSystemService.listFiles.mockResolvedValue(['test.json']);

      await repository.saveDocument(branchInfo, mockDocument as any);

      expect(fileSystemService.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test.json'),
        expect.any(String)
      );
    });

    test('deletes document and updates tag index', async () => {
      fileSystemService.fileExists.mockResolvedValue(true);
      fileSystemService.deleteFile.mockResolvedValue(true);
      fileSystemService.listFiles.mockResolvedValue(['test.json']);
      fileSystemService.readFile.mockResolvedValue(JSON.stringify(validDocument));

      const result = await repository.deleteDocument(branchInfo, documentPath);

      expect(result).toBe(true);
      expect(fileSystemService.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining('test.json')
      );
    });

    test('returns false when deleting non-existent document', async () => {
      fileSystemService.fileExists.mockResolvedValue(false);

      const result = await repository.deleteDocument(branchInfo, documentPath);

      expect(result).toBe(false);
      expect(fileSystemService.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('tag operations', () => {
    const mockTagIndex: BranchTagIndex = {
      schema: 'tag_index_v1',
      metadata: {
        indexType: 'branch',
        branchName: 'test-branch',
        lastUpdated: new Date(),
        documentCount: 2,
        tagCount: 2,
      },
      index: [
        {
          tag: 'tag1',
          documents: [
            { path: 'doc1.json', title: 'Doc 1', id: 'doc1', lastModified: new Date() },
            { path: 'doc2.json', title: 'Doc 2', id: 'doc2', lastModified: new Date() },
          ],
        },
        {
          tag: 'tag2',
          documents: [
            { path: 'doc2.json', title: 'Doc 2', id: 'doc2', lastModified: new Date() },
          ],
        },
      ],
    };

    test('finds documents with AND logic', async () => {
      fileSystemService.fileExists.mockResolvedValue(true);
      fileSystemService.readFile.mockResolvedValue(JSON.stringify(mockTagIndex));

      const results = await repository.findDocumentPathsByTagsUsingIndex({
        branchInfo,
        tags: [Tag.create('tag1'), Tag.create('tag2')],
        matchAll: true,
      });

      expect(results.length).toBe(1);
      expect(results[0].value).toBe('doc2.json');
    });

    test('finds documents with OR logic', async () => {
      fileSystemService.fileExists.mockResolvedValue(true);
      fileSystemService.readFile.mockResolvedValue(JSON.stringify(mockTagIndex));

      const results = await repository.findDocumentPathsByTagsUsingIndex({
        branchInfo,
        tags: [Tag.create('tag1'), Tag.create('tag2')],
        matchAll: false,
      });

      expect(results.length).toBe(2);
      expect(results.map(r => r.value)).toEqual(expect.arrayContaining(['doc1.json', 'doc2.json']));
    });
  });

  describe('error handling', () => {
    test('handles invalid JSON content', async () => {
      fileSystemService.fileExists.mockResolvedValue(true);
      fileSystemService.readFile.mockResolvedValue('invalid json');

      await expect(
        repository.getDocument(branchInfo, DocumentPath.create('test.json'))
      ).rejects.toThrow(InfrastructureError);
    });

    test('handles permission errors', async () => {
      const error = new Error('EACCES: permission denied');
      (error as NodeJS.ErrnoException).code = 'EACCES';
      fileSystemService.readFile.mockRejectedValue(error);

      await expect(
        repository.getDocument(branchInfo, DocumentPath.create('test.json'))
      ).rejects.toThrow(InfrastructureError);
    });

    test('handles corrupted tag index', async () => {
      fileSystemService.fileExists.mockResolvedValue(true);
      fileSystemService.readFile.mockResolvedValue('invalid json');

      await expect(
        repository.findDocumentsByTags(branchInfo, [Tag.create('test')])
      ).rejects.toThrow(InfrastructureError);
    });
  });
});
