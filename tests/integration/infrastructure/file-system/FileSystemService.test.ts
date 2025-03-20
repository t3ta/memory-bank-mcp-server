/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FileSystemService } from '../../../../src/infrastructure/storage/FileSystemService.js';
import {
  TestEnvironment,
  createTestEnvironment,
  createTestFiles,
  readAllFiles,
  listAllFiles,
  wait
} from './FileSystemTestHelper.js';

// タイムアウトを延長（ファイルシステム操作のため）
jest.setTimeout(10000);

describe('FileSystemService Integration Tests', () => {
  let testEnv: TestEnvironment;
  let fileSystemService: FileSystemService;

  beforeEach(async () => {
    // テスト環境のセットアップ
    testEnv = await createTestEnvironment();

    // 実際のファイルシステムサービスを作成
    fileSystemService = new FileSystemService();
  });

  afterEach(async () => {
    // テスト環境のクリーンアップ
    await testEnv.cleanup();
  });

  describe('File Operations', () => {
    it('should read and write files', async () => {
      // テストファイルのパス
      const filePath = path.join(testEnv.rootDir, 'test-file.txt');
      const content = 'This is a test file content';

      // ファイルを書き込む
      await fileSystemService.writeFile(filePath, content);

      // ファイルの存在を確認
      const exists = await fileSystemService.fileExists(filePath);
      expect(exists).toBe(true);

      // ファイルを読み込む
      const readContent = await fileSystemService.readFile(filePath);
      expect(readContent).toBe(content);
    });

    it('should delete files', async () => {
      // テストファイルのパス
      const filePath = path.join(testEnv.rootDir, 'to-delete.txt');
      const content = 'This file will be deleted';

      // ファイルを書き込む
      await fileSystemService.writeFile(filePath, content);

      // ファイルの存在を確認
      let exists = await fileSystemService.fileExists(filePath);
      expect(exists).toBe(true);

      // ファイルを削除
      const result = await fileSystemService.deleteFile(filePath);
      expect(result).toBe(true);

      // ファイルが削除されたことを確認
      exists = await fileSystemService.fileExists(filePath);
      expect(exists).toBe(false);
    });

    it.skip('should handle non-existent files', async () => {
      // 存在しないファイルのパス
      const filePath = path.join(testEnv.rootDir, 'non-existent.txt');

      // ファイルが存在しないことを確認
      const exists = await fileSystemService.fileExists(filePath);
      expect(exists).toBe(false);

      // 存在しないファイルを読み込もうとするとエラーになる
      await expect(fileSystemService.readFile(filePath)).rejects.toThrow();

      // 存在しないファイルを削除しようとすると失敗する（エラーにはならない）
      const result = await fileSystemService.deleteFile(filePath);
      expect(result).toBe(false);
    });

    it('should handle concurrent file operations', async () => {
      // テストファイルのパス
      const baseFilePath = path.join(testEnv.rootDir, 'concurrent');
      const numFiles = 10;

      // 複数のファイル操作を同時に行う
      const writePromises = Array.from({ length: numFiles }).map((_, i) => {
        const filePath = `${baseFilePath}-${i}.txt`;
        const content = `Content for file ${i}`;
        return fileSystemService.writeFile(filePath, content);
      });

      // すべての書き込みが完了するのを待つ
      await Promise.all(writePromises);

      // すべてのファイルが作成されたことを確認
      for (let i = 0; i < numFiles; i++) {
        const filePath = `${baseFilePath}-${i}.txt`;
        const exists = await fileSystemService.fileExists(filePath);
        expect(exists).toBe(true);
      }

      // 複数のファイルを同時に読み込む
      const readPromises = Array.from({ length: numFiles }).map((_, i) => {
        const filePath = `${baseFilePath}-${i}.txt`;
        return fileSystemService.readFile(filePath);
      });

      // すべての読み込みが完了するのを待つ
      const contents = await Promise.all(readPromises);

      // 内容を検証
      for (let i = 0; i < numFiles; i++) {
        expect(contents[i]).toBe(`Content for file ${i}`);
      }
    });
  });

  describe('Directory Operations', () => {
    it('should create directories recursively', async () => {
      // ディレクトリのパス
      const dirPath = path.join(testEnv.rootDir, 'nested', 'dir', 'structure');

      // ディレクトリを作成
      await fileSystemService.createDirectory(dirPath);

      // ディレクトリの存在を確認
      const exists = await fileSystemService.directoryExists(dirPath);
      expect(exists).toBe(true);

      // 親ディレクトリも作成されていることを確認
      const parentExists = await fileSystemService.directoryExists(path.join(testEnv.rootDir, 'nested', 'dir'));
      expect(parentExists).toBe(true);
    });

    it('should create parent directories when writing files', async () => {
      // 深いパスのファイル
      const filePath = path.join(testEnv.rootDir, 'deep', 'nested', 'file.txt');
      const content = 'File in nested directory';

      // ファイルを書き込む（親ディレクトリは自動作成される）
      await fileSystemService.writeFile(filePath, content);

      // ファイルの存在を確認
      const exists = await fileSystemService.fileExists(filePath);
      expect(exists).toBe(true);

      // ファイルの内容を確認
      const readContent = await fileSystemService.readFile(filePath);
      expect(readContent).toBe(content);
    });

    it('should list files recursively', async () => {
      // 複数のディレクトリとファイルを作成
      const fileMap = {
        'file1.txt': 'Content 1',
        'file2.txt': 'Content 2',
        'dir1/file3.txt': 'Content 3',
        'dir1/file4.txt': 'Content 4',
        'dir1/subdir/file5.txt': 'Content 5',
        'dir2/file6.txt': 'Content 6'
      };

      // ファイルを作成
      for (const [relativePath, content] of Object.entries(fileMap)) {
        const filePath = path.join(testEnv.rootDir, relativePath);
        const dirPath = path.dirname(filePath);
        await fileSystemService.createDirectory(dirPath);
        await fileSystemService.writeFile(filePath, content);
      }

      // ディレクトリ内のファイルを再帰的にリストアップ
      const files = await fileSystemService.listFiles(testEnv.rootDir);

      // ファイル数を確認
      expect(files.length).toBe(6);

      // すべてのファイルがリストに含まれていることを確認
      for (const relativePath of Object.keys(fileMap)) {
        const filePath = path.join(testEnv.rootDir, relativePath);
        expect(files).toContain(filePath);
      }
    });
  });

  describe('Retry Mechanism', () => {
    it.skip('should handle temporary file system errors', async () => {
      // 一時的なファイルシステムエラーを模擬
      const originalReadFile = fs.readFile;
      let attempts = 0;

      // readFileを上書きして最初の2回はエラーを発生させる
      (fs.readFile as any) = jest.fn().mockImplementation((filepath: string, options: any) => {
        attempts++;
        if (attempts <= 2) {
          const error = new Error('Temporary error');
          (error as any).code = 'EBUSY';
          return Promise.reject(error);
        }
        return originalReadFile(filepath, options);
      });

      // テストファイルを作成
      const filePath = path.join(testEnv.rootDir, 'retry-test.txt');
      const content = 'Content for retry testing';
      await fileSystemService.writeFile(filePath, content);

      // ファイルを読み込む（最初の2回は失敗するが、3回目で成功するはず）
      const readContent = await fileSystemService.readFile(filePath);

      // 内容を確認
      expect(readContent).toBe(content);

      // 呼び出し回数を確認
      expect(attempts).toBe(3);

      // 元に戻す
      (fs.readFile as any) = originalReadFile;
    });
  });

  describe.skip('Performance Tests', () => {
    it('should handle large number of small files efficiently', async () => {
      // 多数の小さなファイルを作成
      const numFiles = 100;
      const fileSize = 100; // bytes

      // ランダムな内容を生成
      const generateContent = (size: number) => {
        return new Array(size).fill(0).map(() => Math.random().toString(36).charAt(2)).join('');
      };

      console.log(`Creating ${numFiles} files...`);
      const startCreate = Date.now();

      // ファイルを作成
      const createPromises = Array.from({ length: numFiles }).map((_, i) => {
        const filePath = path.join(testEnv.rootDir, `perf-${i}.txt`);
        const content = generateContent(fileSize);
        return fileSystemService.writeFile(filePath, content);
      });

      await Promise.all(createPromises);

      const createTime = Date.now() - startCreate;
      console.log(`Created ${numFiles} files in ${createTime}ms`);

      // ファイルをリスト
      console.log('Listing files...');
      const startList = Date.now();
      const files = await fileSystemService.listFiles(testEnv.rootDir);
      const listTime = Date.now() - startList;

      console.log(`Listed ${files.length} files in ${listTime}ms`);
      expect(files.length).toBe(numFiles);

      // ファイルを読み込む
      console.log('Reading files...');
      const startRead = Date.now();

      const readPromises = files.map(file => fileSystemService.readFile(file));
      const contents = await Promise.all(readPromises);

      const readTime = Date.now() - startRead;
      console.log(`Read ${contents.length} files in ${readTime}ms`);

      // すべてのファイルが内容を持っていることを確認
      for (const content of contents) {
        expect(content.length).toBe(fileSize);
      }

      // パフォーマンスにある程度の制約を設ける
      // Note: 実行環境によって異なるため、非常に緩い制約
      expect(createTime).toBeLessThan(10000); // 10秒未満
      expect(listTime).toBeLessThan(5000);    // 5秒未満
      expect(readTime).toBeLessThan(10000);   // 10秒未満
    });
  });
});
