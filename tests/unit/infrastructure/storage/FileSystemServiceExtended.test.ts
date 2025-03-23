/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { FileSystemService } from '../../../../src/infrastructure/storage/FileSystemService';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../../src/shared/errors/InfrastructureError';
import { logger } from '../../../../tests/mocks/mockLogger';

// Mock fs/promises module
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockStat = jest.fn();
const mockMkdir = jest.fn();
const mockUnlink = jest.fn();
const mockReaddir = jest.fn();

// Setup the jest mocks
jest.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  stat: mockStat,
  mkdir: mockMkdir,
  unlink: mockUnlink,
  readdir: mockReaddir
}));

// Mock node:fs module
const mockCreateReadStream = jest.fn();
jest.mock('node:fs', () => ({
  createReadStream: mockCreateReadStream,
}));

// Mock Logger and retry utilities
jest.mock('../../../../src/shared/utils/logger', () => {
  return require('../../../../tests/mocks/mockLogger');
});

jest.mock('../../../../src/infrastructure/repositories/file-system/FileSystemRetryUtils', () => {
  return require('../../../../tests/mocks/mockFileSystemRetryUtils');
});

describe('FileSystemService Extended Tests', () => {
  let fileSystemService: FileSystemService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStat.mockReset();
    fileSystemService = new FileSystemService();
  });

  describe('readFileChunk', () => {
    it('should read a portion of a file', async () => {
      // Setup
      const filePath = '/test/chunk-test.txt';
      const content = 'This is a test file for chunk reading';
      const start = 5;
      const length = 10;
      
      // Setup for fileExists
      mockStat.mockImplementationOnce(() => Promise.resolve({ isFile: () => true }));
      
      // Setup for getFileSize
      mockStat.mockImplementationOnce(() => Promise.resolve({ size: content.length }));
      
      // Mock createReadStream
      const mockStream = new EventEmitter() as unknown as Readable;
      mockCreateReadStream.mockReturnValue(mockStream);
      
      // Call the async function
      const readPromise = fileSystemService.readFileChunk(filePath, start, length);
      
      // Simulate stream events
      setImmediate(() => {
        mockStream.emit('data', Buffer.from(content.substring(start, start + length)));
        mockStream.emit('end');
      });
      
      // Verify results
      const result = await readPromise;
      expect(result).toBe(content.substring(start, start + length));
      expect(mockCreateReadStream).toHaveBeenCalledWith(filePath, {
        start,
        end: start + length - 1,
        encoding: null
      });
    });

    it('should handle file not found error', async () => {
      // Setup
      const filePath = '/test/nonexistent.txt';
      
      // Setup for fileExists - file does not exist
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      mockStat.mockImplementation(() => Promise.reject(error));
      
      // Verify results
      await expect(fileSystemService.readFileChunk(filePath, 0, 10)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.readFileChunk(filePath, 0, 10)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_NOT_FOUND}`,
      });
    });

    it('should handle read errors from stream', async () => {
      // Setup
      const filePath = '/test/error-test.txt';
      const start = 0;
      const length = 10;
      
      // Setup for fileExists
      mockStat.mockImplementationOnce(() => Promise.resolve({ isFile: () => true }));
      
      // Setup for getFileSize
      mockStat.mockImplementationOnce(() => Promise.resolve({ size: 100 }));
      
      // Mock createReadStream
      const mockStream = new EventEmitter() as unknown as Readable;
      mockCreateReadStream.mockReturnValue(mockStream);
      
      // Call the async function
      const readPromise = fileSystemService.readFileChunk(filePath, start, length);
      
      // Simulate error event
      setImmediate(() => {
        mockStream.emit('error', new Error('Stream read error'));
      });
      
      // Verify results
      await expect(readPromise).rejects.toThrow(InfrastructureError);
      await expect(readPromise).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_READ_ERROR}`,
      });
    });

    it('should return empty string for zero length', async () => {
      // Setup
      const filePath = '/test/zero-length.txt';
      
      // Setup for fileExists
      mockStat.mockImplementationOnce(() => Promise.resolve({ isFile: () => true }));
      
      // Setup for getFileSize
      mockStat.mockImplementationOnce(() => Promise.resolve({ size: 100 }));
      
      // Verify results
      const result = await fileSystemService.readFileChunk(filePath, 0, 0);
      expect(result).toBe('');
      expect(mockCreateReadStream).not.toHaveBeenCalled();
    });

    it('should adjust length if it exceeds file size', async () => {
      // Setup
      const filePath = '/test/adjust-length.txt';
      const fileSize = 20;
      const start = 15;
      const requestedLength = 10; // This exceeds the file size
      const adjustedLength = fileSize - start; // Expected adjusted length
      
      // Setup for fileExists
      mockStat.mockImplementationOnce(() => Promise.resolve({ isFile: () => true }));
      
      // Setup for getFileSize
      mockStat.mockImplementationOnce(() => Promise.resolve({ size: fileSize }));
      
      // Mock createReadStream
      const mockStream = new EventEmitter() as unknown as Readable;
      mockCreateReadStream.mockReturnValue(mockStream);
      
      // Call the async function
      const readPromise = fileSystemService.readFileChunk(filePath, start, requestedLength);
      
      // Simulate stream events
      setImmediate(() => {
        mockStream.emit('data', Buffer.from('12345'));
        mockStream.emit('end');
      });
      
      // Verify results
      await readPromise;
      expect(mockCreateReadStream).toHaveBeenCalledWith(filePath, {
        start,
        end: start + adjustedLength - 1, // Stream should be created with adjusted length
        encoding: null
      });
    });

    it('should handle string chunk data correctly', async () => {
      // Setup
      const filePath = '/test/string-chunk.txt';
      const content = 'Test string content';
      const start = 0;
      const length = content.length;
      
      // Setup for fileExists
      mockStat.mockImplementationOnce(() => Promise.resolve({ isFile: () => true }));
      
      // Setup for getFileSize
      mockStat.mockImplementationOnce(() => Promise.resolve({ size: content.length }));
      
      // Mock createReadStream
      const mockStream = new EventEmitter() as unknown as Readable;
      mockCreateReadStream.mockReturnValue(mockStream);
      
      // Call the async function
      const readPromise = fileSystemService.readFileChunk(filePath, start, length);
      
      // Simulate stream events with string data instead of Buffer
      setImmediate(() => {
        mockStream.emit('data', content); // Send string instead of Buffer
        mockStream.emit('end');
      });
      
      // Verify results
      const result = await readPromise;
      expect(result).toBe(content);
    });

    it('should read exactly one byte from file', async () => {
      // Setup
      const filePath = '/test/one-byte.txt';
      const content = 'X'; // Single character
      const start = 0;
      const length = 1;
      
      // Setup for fileExists
      mockStat.mockImplementationOnce(() => Promise.resolve({ isFile: () => true }));
      
      // Setup for getFileSize
      mockStat.mockImplementationOnce(() => Promise.resolve({ size: content.length }));
      
      // Mock createReadStream
      const mockStream = new EventEmitter() as unknown as Readable;
      mockCreateReadStream.mockReturnValue(mockStream);
      
      // Call the async function
      const readPromise = fileSystemService.readFileChunk(filePath, start, length);
      
      // Simulate stream events
      setImmediate(() => {
        mockStream.emit('data', Buffer.from(content));
        mockStream.emit('end');
      });
      
      // Verify results
      const result = await readPromise;
      expect(result).toBe(content);
      expect(mockCreateReadStream).toHaveBeenCalledWith(filePath, {
        start,
        end: start + length - 1,
        encoding: null
      });
    });

    it('should read last byte of file correctly', async () => {
      // Setup
      const filePath = '/test/last-byte.txt';
      const fileContent = 'Test file';
      const fileSize = fileContent.length;
      const start = fileSize - 1;
      const length = 1;
      const expectedContent = fileContent.charAt(fileContent.length - 1);
      
      // Setup for fileExists
      mockStat.mockImplementationOnce(() => Promise.resolve({ isFile: () => true }));
      
      // Setup for getFileSize
      mockStat.mockImplementationOnce(() => Promise.resolve({ size: fileSize }));
      
      // Mock createReadStream
      const mockStream = new EventEmitter() as unknown as Readable;
      mockCreateReadStream.mockReturnValue(mockStream);
      
      // Call the async function
      const readPromise = fileSystemService.readFileChunk(filePath, start, length);
      
      // Simulate stream events
      setImmediate(() => {
        mockStream.emit('data', Buffer.from(expectedContent));
        mockStream.emit('end');
      });
      
      // Verify results
      const result = await readPromise;
      expect(result).toBe(expectedContent);
      expect(mockCreateReadStream).toHaveBeenCalledWith(filePath, {
        start,
        end: start + length - 1,
        encoding: null
      });
    });
  });

  describe('getFileStats', () => {
    it('should return file stats correctly', async () => {
      // Setup
      const filePath = '/test/stats-test.txt';
      const mockStats = {
        size: 1024,
        isDirectory: () => false,
        isFile: () => true,
        mtime: new Date('2023-01-01'),
        birthtime: new Date('2023-01-01')
      };
      
      mockStat.mockImplementation(() => Promise.resolve(mockStats));
      
      // Act
      const stats = await fileSystemService.getFileStats(filePath);
      
      // Assert
      expect(stats).toEqual({
        size: 1024,
        isDirectory: false,
        isFile: true,
        lastModified: mockStats.mtime,
        createdAt: mockStats.birthtime
      });
      expect(mockStat).toHaveBeenCalledWith(filePath);
    });

    it('should handle directory stats correctly', async () => {
      // Setup
      const dirPath = '/test/dir';
      const mockStats = {
        size: 4096, // Typical directory size
        isDirectory: () => true,
        isFile: () => false,
        mtime: new Date('2023-01-01'),
        birthtime: new Date('2023-01-01')
      };
      
      mockStat.mockImplementation(() => Promise.resolve(mockStats));
      
      // Act
      const stats = await fileSystemService.getFileStats(dirPath);
      
      // Assert
      expect(stats).toEqual({
        size: 4096,
        isDirectory: true,
        isFile: false,
        lastModified: mockStats.mtime,
        createdAt: mockStats.birthtime
      });
    });

    it('should throw FILE_NOT_FOUND error when file does not exist', async () => {
      // Setup
      const filePath = '/test/nonexistent-stats.txt';
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      mockStat.mockImplementation(() => Promise.reject(error));
      
      // Act & Assert
      await expect(fileSystemService.getFileStats(filePath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.getFileStats(filePath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_NOT_FOUND}`,
      });
    });

    it('should throw FILE_PERMISSION_ERROR when permission is denied', async () => {
      // Setup
      const filePath = '/test/protected-stats.txt';
      const fileError = new Error('Permission denied');
      (fileError as any).code = 'EACCES';
      mockStat.mockImplementation(() => Promise.reject(fileError));
      
      // Act & Assert
      await expect(fileSystemService.getFileStats(filePath)).rejects.toThrow(InfrastructureError);
      const resultError = await fileSystemService.getFileStats(filePath).catch(e => e);
      console.log('Actual error code:', resultError.code);
      await expect(resultError).toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_PERMISSION_ERROR}`,
      });
    });

    it('should wrap other errors in FILE_SYSTEM_ERROR', async () => {
      // Setup
      const filePath = '/test/error-stats.txt';
      const error = new Error('Unknown error');
      mockStat.mockImplementation(() => Promise.reject(error));
      
      // Act & Assert
      await expect(fileSystemService.getFileStats(filePath)).rejects.toThrow(InfrastructureError);
      await expect(fileSystemService.getFileStats(filePath)).rejects.toMatchObject({
        code: `INFRA_ERROR.${InfrastructureErrorCodes.FILE_SYSTEM_ERROR}`,
      });
    });
  });
});
