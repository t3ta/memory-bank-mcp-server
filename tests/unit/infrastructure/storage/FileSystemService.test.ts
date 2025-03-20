/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FileSystemService } from '../../../../src/infrastructure/storage/FileSystemService.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../../src/shared/errors/InfrastructureError.js';

// withFileSystemRetry をモック化して、リトライ機能をテストから分離
jest.mock('../../../../src/infrastructure/repositories/file-system/FileSystemRetryUtils.js', () => ({
  withFileSystemRetry: jest.fn<Promise<any>, [string, () => Promise<any>, object?]>((operationName, fn) => fn()),
  isRetryableError: jest.fn<boolean, [unknown]>(() => false),
}));

// fs/promises モジュールをモック化
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  readdir: jest.fn(),
}));

// Logger をモック化
jest.mock('../../../../src/shared/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService;

  beforeEach(() => {
    jest.clearAllMocks();
    fileSystemService = new FileSystemService();
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      // Setup
      const filePath = '/test/file.txt';
      const fileContent = 'Test file content';
      (fs.readFile as jest.Mock<Promise<string>>).mockResolvedValue(fileContent);

      // Act
      const result = await fileSystemService.readFile(filePath);

      // Assert
      expect(result).toBe(fileContent);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should throw FILE_NOT_FOUND error when file does not exist', async () => {
      // Setup
      const filePath = '/test/nonexistent.txt';
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      (fs.readFile as jest.Mock<Promise<string>>).mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.readFile(filePath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.readFile(filePath)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.FILE_NOT_FOUND,
      });
    });

    it('should throw FILE_PERMISSION_ERROR when permission is denied', async () => {
      // Setup
      const filePath = '/test/protected.txt';
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      (fs.readFile as jest.Mock<Promise<string>>).mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.readFile(filePath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.readFile(filePath)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
      });
    });

    it('should wrap other errors in FILE_READ_ERROR', async () => {
      // Setup
      const filePath = '/test/error.txt';
      const error = new Error('Unknown error');
      (fs.readFile as jest.Mock<Promise<string>>).mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.readFile(filePath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.readFile(filePath)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.FILE_READ_ERROR,
      });
    });
  });

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      // Setup
      const filePath = '/test/output.txt';
      const dirPath = '/test';
      const content = 'Test content to write';
      
      // Mock directory exists check and file write
      (fs.mkdir as jest.Mock<Promise<void>>).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock<Promise<void>>).mockResolvedValue(undefined);

      // Act
      await fileSystemService.writeFile(filePath, content);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, content, 'utf-8');
    });

    it('should handle permission errors', async () => {
      // Setup
      const filePath = '/test/protected.txt';
      const content = 'Test content';
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      
      // Mock directory creation success but file write failure
      (fs.mkdir as jest.Mock<Promise<void>>).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock<Promise<void>>).mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.writeFile(filePath, content)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.writeFile(filePath, content)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
      });
    });

    it('should wrap other errors in FILE_WRITE_ERROR', async () => {
      // Setup
      const filePath = '/test/error.txt';
      const content = 'Test content';
      const error = new Error('Unknown error');
      
      // Mock directory creation success but file write failure
      (fs.mkdir as jest.Mock<Promise<void>>).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock<Promise<void>>).mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.writeFile(filePath, content)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.writeFile(filePath, content)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.FILE_WRITE_ERROR,
      });
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      // Setup
      const filePath = '/test/exists.txt';
      (fs.stat as jest.Mock<Promise<{ isFile: () => boolean }>>).mockResolvedValue({
        isFile: () => true,
      });

      // Act
      const result = await fileSystemService.fileExists(filePath);

      // Assert
      expect(result).toBe(true);
      expect(fs.stat).toHaveBeenCalledWith(filePath);
    });

    it('should return false when path exists but is not a file', async () => {
      // Setup
      const dirPath = '/test/dir';
      (fs.stat as jest.Mock<Promise<{ isFile: () => boolean }>>).mockResolvedValue({
        isFile: () => false,
      });

      // Act
      const result = await fileSystemService.fileExists(dirPath);

      // Assert
      expect(result).toBe(false);
      expect(fs.stat).toHaveBeenCalledWith(dirPath);
    });

    it('should return false when file does not exist', async () => {
      // Setup
      const filePath = '/test/nonexistent.txt';
      const error = new Error('File not found');
      (fs.stat as jest.Mock<Promise<{ isFile: () => boolean }>>).mockRejectedValue(error);

      // Act
      const result = await fileSystemService.fileExists(filePath);

      // Assert
      expect(result).toBe(false);
      expect(fs.stat).toHaveBeenCalledWith(filePath);
    });
  });

  describe('createDirectory', () => {
    it('should create directory successfully', async () => {
      // Setup
      const dirPath = '/test/newdir';
      (fs.mkdir as jest.Mock<Promise<void>>).mockResolvedValue(undefined);

      // Act
      await fileSystemService.createDirectory(dirPath);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should handle permission errors', async () => {
      // Setup
      const dirPath = '/protected/dir';
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      (fs.mkdir as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.createDirectory(dirPath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.createDirectory(dirPath)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
      });
    });

    it('should wrap other errors in FILE_SYSTEM_ERROR', async () => {
      // Setup
      const dirPath = '/test/error';
      const error = new Error('Unknown error');
      (fs.mkdir as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.createDirectory(dirPath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.createDirectory(dirPath)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
      });
    });
  });

  describe('listFiles', () => {
    it('should list files recursively', async () => {
      // Setup
      const rootDir = '/test';
      const file1 = '/test/file1.txt';
      const file2 = '/test/subdir/file2.txt';
      
      // Mock directory entries
      (fs.readdir as jest.Mock).mockImplementation((dir: string) => {
        if (dir === rootDir) {
          return Promise.resolve([
            { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
            { name: 'subdir', isFile: () => false, isDirectory: () => true },
          ]);
        } else if (dir === path.join(rootDir, 'subdir')) {
          return Promise.resolve([
            { name: 'file2.txt', isFile: () => true, isDirectory: () => false },
          ]);
        }
        return Promise.resolve([]);
      });

      // Act
      const results = await fileSystemService.listFiles(rootDir);

      // Assert
      expect(results).toHaveLength(2);
      expect(results).toContain(file1);
      expect(results).toContain(file2);
    });

    it('should handle directory not found error', async () => {
      // Setup
      const dirPath = '/nonexistent';
      const error = new Error('Directory not found');
      (error as any).code = 'ENOENT';
      (fs.readdir as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.listFiles(dirPath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.listFiles(dirPath)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.FILE_NOT_FOUND,
      });
    });

    it('should handle permission errors', async () => {
      // Setup
      const dirPath = '/protected';
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      (fs.readdir as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.listFiles(dirPath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.listFiles(dirPath)).rejects.toMatchObject({
        code: InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
      });
    });

    it('should continue listing even if a subdirectory has errors', async () => {
      // Setup for a more realistic test with parallell processing
      const rootDir = '/test';
      
      // Mock batch processing behavior
      (fs.readdir as jest.Mock).mockImplementation((dir: string) => {
        if (dir === rootDir) {
          return Promise.resolve([
            { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
            { name: 'gooddir', isFile: () => false, isDirectory: () => true },
            { name: 'baddir', isFile: () => false, isDirectory: () => true },
          ]);
        } else if (dir === path.join(rootDir, 'gooddir')) {
          return Promise.resolve([
            { name: 'file2.txt', isFile: () => true, isDirectory: () => false },
          ]);
        } else if (dir === path.join(rootDir, 'baddir')) {
          const error = new Error('Permission denied');
          (error as any).code = 'EACCES';
          return Promise.reject(error);
        }
        return Promise.resolve([]);
      });

      // Act - for testing errors in subdirectories, we need to restore the implementation
      // that properly handles subdirectory errors
      const originalListFiles = FileSystemService.prototype.listFiles;
      FileSystemService.prototype.listFiles = originalListFiles;
      
      try {
        const results = await fileSystemService.listFiles(rootDir);
        
        // Assert - should still get files from good paths
        expect(results).toContain(path.join(rootDir, 'file1.txt'));
        expect(results).toContain(path.join(rootDir, 'gooddir', 'file2.txt'));
        // But no error from the bad directory
      } finally {
        // Restore the mock implementation for other tests
        FileSystemService.prototype.listFiles = jest.fn();
      }
    });
  });

  describe('getBranchMemoryPath', () => {
    it('should return correct path for branch name', () => {
      // Act
      const result = fileSystemService.getBranchMemoryPath('feature/test');

      // Assert
      expect(result).toBe('docs/branch-memory-bank/feature-test');
    });
  });

  describe('getConfig', () => {
    it('should return default configuration', () => {
      // Act
      const config = fileSystemService.getConfig();

      // Assert
      expect(config).toEqual({
        memoryBankRoot: 'docs',
      });
    });
  });
});
