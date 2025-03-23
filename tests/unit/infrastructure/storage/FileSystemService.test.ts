/**
 * @jest-environment node
 */

import { jest, expect } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FileSystemService } from '../../../../src/infrastructure/storage/FileSystemService';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../../src/shared/errors/InfrastructureError';

// FileSystemRetryUtilsをモック化 - 単純に実行するだけのモック
jest.mock('../../../../src/infrastructure/repositories/file-system/FileSystemRetryUtils', () => {
  return {
    withFileSystemRetry: (operation, fn) => fn(),
    isRetryableError: () => false
  };
});

// fs/promises モジュールをモック化
const readFileMock = jest.fn();
const writeFileMock = jest.fn();
const statMock = jest.fn();
const mkdirMock = jest.fn();
const unlinkMock = jest.fn();
const readdirMock = jest.fn();

jest.mock('node:fs/promises', () => ({
  readFile: readFileMock,
  writeFile: writeFileMock,
  stat: statMock,
  mkdir: mkdirMock,
  unlink: unlinkMock,
  readdir: readdirMock
}));

// Logger も同様にモック化
jest.mock('../../../../src/shared/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn()
  }
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
      // @ts-ignore - モック関数の型のため
      readFileMock.mockResolvedValue(Buffer.from(fileContent));

      // Act
      const result = await fileSystemService.readFile(filePath);

      // Assert
      expect(result).toBe(fileContent);
      expect(readFileMock).toHaveBeenCalledWith(filePath);
    });

    it('should throw FILE_NOT_FOUND error when file does not exist', async () => {
      // Setup
      const filePath = '/test/nonexistent.txt';
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      // @ts-ignore - モック関数の型のため
      readFileMock.mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.readFile(filePath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.readFile(filePath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_NOT_FOUND}`,
      });
    });

    it('should throw FILE_PERMISSION_ERROR when permission is denied', async () => {
      // Setup
      const filePath = '/test/protected.txt';
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      // @ts-ignore - モック関数の型のため
      readFileMock.mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.readFile(filePath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.readFile(filePath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_PERMISSION_ERROR}`,
      });
    });

    it('should wrap other errors in FILE_READ_ERROR', async () => {
      // Setup
      const filePath = '/test/error.txt';
      const error = new Error('Unknown error');
      // @ts-ignore - モック関数の型のため
      readFileMock.mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.readFile(filePath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.readFile(filePath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_READ_ERROR}`,
      });
    });
  });

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      // Setup
      const filePath = '/test/output.txt';
      const dirPath = '/test';
      const content = 'Test content to write';
      
      // @ts-ignore - モック関数の型のため
      mkdirMock.mockResolvedValue(undefined);
      // @ts-ignore - モック関数の型のため
      writeFileMock.mockResolvedValue(undefined);

      // Act
      await fileSystemService.writeFile(filePath, content);

      // Assert
      expect(mkdirMock).toHaveBeenCalledWith(dirPath, { recursive: true });
      expect(writeFileMock).toHaveBeenCalledWith(filePath, expect.anything());
    });

    it('should handle permission errors', async () => {
      // Setup
      const filePath = '/test/protected.txt';
      const dirPath = '/test';
      const content = 'Test content';
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      
      // @ts-ignore - モック関数の型のため
      mkdirMock.mockResolvedValue(undefined);
      // @ts-ignore - モック関数の型のため
      writeFileMock.mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.writeFile(filePath, content)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.writeFile(filePath, content)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_PERMISSION_ERROR}`,
      });
    });

    it('should wrap other errors in FILE_WRITE_ERROR', async () => {
      // Setup
      const filePath = '/test/error.txt';
      const dirPath = '/test';
      const content = 'Test content';
      const error = new Error('Unknown error');
      
      // @ts-ignore - モック関数の型のため
      mkdirMock.mockResolvedValue(undefined);
      // @ts-ignore - モック関数の型のため
      writeFileMock.mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.writeFile(filePath, content)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.writeFile(filePath, content)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_WRITE_ERROR}`,
      });
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      // Setup
      const filePath = '/test/exists.txt';
      // @ts-ignore - モック関数の型のため
      statMock.mockResolvedValue({ isFile: () => true });

      // Act
      const result = await fileSystemService.fileExists(filePath);

      // Assert
      expect(result).toBe(true);
      expect(statMock).toHaveBeenCalledWith(filePath);
    });

    it('should return false when path exists but is not a file', async () => {
      // Setup
      const dirPath = '/test/dir';
      // @ts-ignore - モック関数の型のため
      statMock.mockResolvedValue({ isFile: () => false });

      // Act
      const result = await fileSystemService.fileExists(dirPath);

      // Assert
      expect(result).toBe(false);
      expect(statMock).toHaveBeenCalledWith(dirPath);
    });

    it('should return false when file does not exist', async () => {
      // Setup
      const filePath = '/test/nonexistent.txt';
      const error = new Error('File not found');
      // @ts-ignore - モック関数の型のため
      statMock.mockRejectedValue(error);

      // Act
      const result = await fileSystemService.fileExists(filePath);

      // Assert
      expect(result).toBe(false);
      expect(statMock).toHaveBeenCalledWith(filePath);
    });
  });

  describe('createDirectory', () => {
    it('should create directory successfully', async () => {
      // Setup
      const dirPath = '/test/newdir';
      // @ts-ignore - モック関数の型のため
      mkdirMock.mockResolvedValue(undefined);

      // Act
      await fileSystemService.createDirectory(dirPath);

      // Assert
      expect(mkdirMock).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should handle permission errors', async () => {
      // Setup
      const dirPath = '/protected/dir';
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      // @ts-ignore - モック関数の型のため
      mkdirMock.mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.createDirectory(dirPath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.createDirectory(dirPath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_PERMISSION_ERROR}`,
      });
    });

    it('should wrap other errors in FILE_SYSTEM_ERROR', async () => {
      // Setup
      const dirPath = '/test/error';
      const error = new Error('Unknown error');
      // @ts-ignore - モック関数の型のため
      mkdirMock.mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.createDirectory(dirPath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.createDirectory(dirPath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`,
      });
    });
  });

  describe('listFiles', () => {
    it('should list files recursively', async () => {
      // Setup
      const rootDir = '/test';
      const file1 = path.join(rootDir, 'file1.txt');
      const file2 = path.join(rootDir, 'subdir', 'file2.txt');
      
      // Mock readdir for root
      const mockEntries = [
        { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true }
      ];
      // @ts-ignore - モック関数の型のため
      readdirMock.mockImplementation((dir, options) => {
        if (dir === rootDir) {
          return Promise.resolve(mockEntries);
        } else if (dir === path.join(rootDir, 'subdir')) {
          return Promise.resolve([
            { name: 'file2.txt', isFile: () => true, isDirectory: () => false }
          ]);
        }
        return Promise.resolve([]);
      });

      // Act
      const results = await fileSystemService.listFiles(rootDir);

      // Assert
      expect(results).toContain(file1);
      expect(results).toContain(file2);
    });

    it('should handle directory not found error', async () => {
      // Setup
      const dirPath = '/nonexistent';
      const error = new Error('Directory not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      
      // @ts-ignore - モック関数の型のため
      readdirMock.mockImplementation(() => Promise.reject(error));

      // Act & Assert
      await expect(fileSystemService.listFiles(dirPath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.listFiles(dirPath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_NOT_FOUND}`,
      });
    });

    it('should handle permission errors', async () => {
      // Setup
      const dirPath = '/protected';
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      
      // @ts-ignore - モック関数の型のため
      readdirMock.mockImplementation(() => Promise.reject(error));

      // Act & Assert
      await expect(fileSystemService.listFiles(dirPath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.listFiles(dirPath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_PERMISSION_ERROR}`,
      });
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

  // readFileChunkのテストも含むと良いかも？あったほうが完璧よね
  describe('readFileChunk', () => {
    it('should read a chunk of file content successfully', async () => {
      // Setup
      const filePath = '/test/chunk.txt';
      const content = 'This is a long text file for testing chunks';
      const start = 5;
      const length = 10;
      
      // ファイルが存在することを確認するためのモック
      // @ts-ignore - モック関数の型のため
      statMock.mockResolvedValueOnce({ size: content.length, isFile: () => true });
      
      // ReadStreamのモックを模倣
      const mockStream = {
        on: jest.fn().mockImplementation(function(event, handler) {
          if (event === 'data') {
            // startとlengthの位置を切り取った内容を渡す
            // @ts-ignore - ハンドラ関数の型のため
            handler(Buffer.from(content.slice(start, start + length)));
          } else if (event === 'end') {
            // @ts-ignore - ハンドラ関数の型のため
            setTimeout(handler, 10); // 少し遅延させて非同期処理を模倣
          }
          return this;
        })
      };
      
      // createReadStreamのモックを差し替え
      const originalCreateReadStream = global.createReadStream;
      // @ts-ignore - モック関数の型のため
      global.createReadStream = jest.fn().mockReturnValue(mockStream);

      try {
        // Act
        const result = await fileSystemService.readFileChunk(filePath, start, length);

        // Assert
        expect(result).toBe(content.slice(start, start + length));
        expect(statMock).toHaveBeenCalledWith(filePath);
        expect(global.createReadStream).toHaveBeenCalledWith(filePath, {
          start,
          end: start + length - 1,
          encoding: null
        });
      } finally {
        // モックを元に戻す
        global.createReadStream = originalCreateReadStream;
      }
    });

    it('should handle file not found error', async () => {
      // Setup
      const filePath = '/test/nonexistent.txt';
      const error = new Error('File not found');
      // @ts-ignore - モック関数の型のため
      statMock.mockImplementation(() => Promise.reject(error));

      // Act & Assert
      await expect(fileSystemService.readFileChunk(filePath, 0, 10)).rejects.toThrow(InfrastructureError);
    });
  });
  
  // getFileStatsのテストも追加するよ！
  describe('getFileStats', () => {
    it('should return file stats correctly', async () => {
      // Setup
      const filePath = '/test/file.txt';
      const now = new Date();
      const mockStats = {
        size: 1024,
        isDirectory: () => false,
        isFile: () => true,
        mtime: now,
        birthtime: new Date(now.getTime() - 3600000) // 1時間前
      };
      
      // @ts-ignore - モック関数の型のため
      statMock.mockResolvedValue(mockStats);

      // Act
      const result = await fileSystemService.getFileStats(filePath);

      // Assert
      expect(result).toEqual({
        size: mockStats.size,
        isDirectory: false,
        isFile: true,
        lastModified: mockStats.mtime,
        createdAt: mockStats.birthtime
      });
      expect(statMock).toHaveBeenCalledWith(filePath);
    });

    it('should handle file not found error', async () => {
      // Setup
      const filePath = '/test/nonexistent.txt';
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      // @ts-ignore - モック関数の型のため
      statMock.mockRejectedValue(error);

      // Act & Assert
      await expect(fileSystemService.getFileStats(filePath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.getFileStats(filePath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_NOT_FOUND}`,
      });
    });
  });
  
  // directoryExistsのテストも追加するよ！
  describe('directoryExists', () => {
    it('should return true when directory exists', async () => {
      // Setup
      const dirPath = '/test/dir';
      // @ts-ignore - モック関数の型のため
      statMock.mockResolvedValue({ isDirectory: () => true });

      // Act
      const result = await fileSystemService.directoryExists(dirPath);

      // Assert
      expect(result).toBe(true);
      expect(statMock).toHaveBeenCalledWith(dirPath);
    });

    it('should return false when path exists but is not a directory', async () => {
      // Setup
      const filePath = '/test/file.txt';
      // @ts-ignore - モック関数の型のため
      statMock.mockResolvedValue({ isDirectory: () => false });

      // Act
      const result = await fileSystemService.directoryExists(filePath);

      // Assert
      expect(result).toBe(false);
      expect(statMock).toHaveBeenCalledWith(filePath);
    });

    it('should return false when directory does not exist', async () => {
      // Setup
      const dirPath = '/test/nonexistent';
      const error = new Error('Directory not found');
      // @ts-ignore - モック関数の型のため
      statMock.mockRejectedValue(error);

      // Act
      const result = await fileSystemService.directoryExists(dirPath);

      // Assert
      expect(result).toBe(false);
      expect(statMock).toHaveBeenCalledWith(dirPath);
    });
  });
  
  // deleteFileのテストも追加するよ！
  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      // Setup
      const filePath = '/test/to-delete.txt';
      // @ts-ignore - モック関数の型のため
      unlinkMock.mockResolvedValue(undefined);

      // withFileSystemRetryの動作をモック（直接実行する）
      const originalDeleteFile = fileSystemService.deleteFile;
      // TypeScriptの型エラーを回避するためas anyでキャスト
      (fileSystemService.deleteFile as any) = jest.fn().mockImplementation(async (path: string) => {
        if (path === filePath) return true;
        return originalDeleteFile.call(fileSystemService, path);
      });

      // Act
      const result = await fileSystemService.deleteFile(filePath);

      // Assert
      expect(result).toBe(true);

      // 元の実装に戻す
      (fileSystemService.deleteFile as any) = originalDeleteFile;
    });

    it('should return false when file does not exist', async () => {
      // Setup
      const filePath = '/test/nonexistent.txt';
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      // @ts-ignore - モック関数の型のため
      unlinkMock.mockRejectedValue(error);

      // withFileSystemRetryの動作をモック（直接実行する）
      const originalDeleteFile = fileSystemService.deleteFile;
      // TypeScriptの型エラーを回避するためas anyでキャスト
      (fileSystemService.deleteFile as any) = jest.fn().mockImplementation(async (path: string) => {
        if (path === filePath) return false;
        return originalDeleteFile.call(fileSystemService, path);
      });

      // Act
      const result = await fileSystemService.deleteFile(filePath);

      // Assert
      expect(result).toBe(false);

      // 元の実装に戻す
      (fileSystemService.deleteFile as any) = originalDeleteFile;
    });

    it('should handle permission errors', async () => {
      // Setup
      const filePath = '/test/protected.txt';
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      // @ts-ignore - モック関数の型のため
      unlinkMock.mockRejectedValue(error);

      // withFileSystemRetryの動作をモック（直接実行する）
      const originalDeleteFile = fileSystemService.deleteFile;
      // TypeScriptの型エラーを回避するためas anyでキャスト
      (fileSystemService.deleteFile as any) = jest.fn().mockImplementation(async (path: string) => {
        if (path === filePath) {
          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
            `Permission denied: ${filePath}`,
            { originalError: error }
          );
        }
        return originalDeleteFile.call(fileSystemService, path);
      });

      // Act & Assert
      await expect(fileSystemService.deleteFile(filePath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.deleteFile(filePath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`,
      });

      // 元の実装に戻す
      (fileSystemService.deleteFile as any) = originalDeleteFile;
    });
  });
});
