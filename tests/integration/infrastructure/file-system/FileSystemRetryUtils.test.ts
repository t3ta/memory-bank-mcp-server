/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FileSystemService } from '../../../../src/infrastructure/storage/FileSystemService.js';
import { withRetry, withFileSystemRetry } from '../../../../src/infrastructure/repositories/file-system/FileSystemRetryUtils.js';
import {
  TestEnvironment,
  createTestEnvironment,
  wait
} from './FileSystemTestHelper.js';

// タイムアウトを延長（ファイルシステム操作のため）
jest.setTimeout(10000);

describe('FileSystemRetryUtils Integration Tests', () => {
  let testEnv: TestEnvironment;
  let fileSystemService: FileSystemService;
  
  beforeEach(async () => {
    // テスト環境のセットアップ
    testEnv = await createTestEnvironment();
    fileSystemService = new FileSystemService();
  });
  
  afterEach(async () => {
    // テスト環境のクリーンアップ
    await testEnv.cleanup();
  });
  
  describe('withRetry', () => {
    it('should retry operation until success', async () => {
      // テスト用ファイルのパス
      const filePath = path.join(testEnv.rootDir, 'retry-test.txt');
      const content = 'Test content for retry';
      
      // ファイルを作成
      await fileSystemService.writeFile(filePath, content);
      
      // カウンタとモックオペレーション
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        
        // 最初の2回は失敗
        if (attemptCount <= 2) {
          const error = new Error('Temporary error');
          (error as any).code = 'EBUSY';
          throw error;
        }
        
        // 3回目は成功
        return await fs.readFile(filePath, 'utf-8');
      });
      
      // リトライ付きで操作を実行
      const result = await withRetry(operation, {
        maxRetries: 5,
        baseDelay: 100
      });
      
      // 検証
      expect(result).toBe(content);
      expect(attemptCount).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should fail after maximum retries', async () => {
      // 常に失敗する操作
      const operation = jest.fn().mockImplementation(() => {
        const error = new Error('Persistent error');
        (error as any).code = 'EBUSY';
        return Promise.reject(error);
      });
      
      // リトライ付きで操作を実行
      await expect(withRetry(operation, {
        maxRetries: 3,
        baseDelay: 50
      })).rejects.toThrow('Persistent error');
      
      // 検証 - 初回 + 3回のリトライ = 4回呼ばれるはず
      expect(operation).toHaveBeenCalledTimes(4);
    });
    
    it('should not retry on non-retryable errors', async () => {
      // 非リトライ可能なエラーで失敗する操作
      const operation = jest.fn().mockImplementation(() => {
        const error = new Error('Non-retryable error');
        (error as any).code = 'ENOENT';
        return Promise.reject(error);
      });
      
      // リトライ付きで操作を実行
      await expect(withRetry(operation, {
        maxRetries: 3,
        baseDelay: 50
      })).rejects.toThrow('Non-retryable error');
      
      // 検証 - 1回だけ呼ばれるはず
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('withFileSystemRetry', () => {
    it('should handle file system operations with retry', async () => {
      // テスト用ファイルのパス
      const filePath = path.join(testEnv.rootDir, 'fs-retry-test.txt');
      const content = 'Test content for file system retry';
      
      // ファイルを作成
      await fileSystemService.writeFile(filePath, content);
      
      // 同期的に実行される処理と競合を起こす可能性がある操作を模擬
      const readWithConflict = async () => {
        let attemptCount = 0;
        
        // withFileSystemRetryを使用
        return await withFileSystemRetry('readWithConflict', async () => {
          attemptCount++;
          
          // 最初の試行は競合を起こす
          if (attemptCount === 1) {
            // 実際のファイルを一時的にロック状態にする代わりに、
            // 同様のエラーをスローする
            const error = new Error('Resource temporarily unavailable');
            (error as any).code = 'EAGAIN';
            throw error;
          }
          
          // 2回目の試行は成功
          return await fs.readFile(filePath, 'utf-8');
        }, {
          maxRetries: 2,
          baseDelay: 100
        });
      };
      
      // 実行と検証
      const result = await readWithConflict();
      expect(result).toBe(content);
    });
    
    it('should handle parallel access with retry mechanism', async () => {
      // テスト用ディレクトリのパス
      const dirPath = path.join(testEnv.rootDir, 'parallel-test');
      await fileSystemService.createDirectory(dirPath);
      
      // 同時に処理する数
      const concurrentCount = 10;
      const retryMaxCount = 3;
      
      // 各タスクが書き込むファイル名とカウンター
      const successCounts: Record<string, number> = {};
      const failureCounts: Record<string, number> = {};
      
      for (let i = 0; i < concurrentCount; i++) {
        successCounts[`task-${i}`] = 0;
        failureCounts[`task-${i}`] = 0;
      }
      
      // 同時アクセスによる競合を発生させるタスク
      const createTask = (taskId: string) => async () => {
        const filePath = path.join(dirPath, `${taskId}.txt`);
        const content = `Content for ${taskId}`;
        
        try {
          // リトライ機能を使って書き込み
          await withFileSystemRetry(`write-${taskId}`, async () => {
            // 競合を模擬するために50%の確率で一時的なエラーを発生させる
            const shouldFail = Math.random() < 0.5;
            
            if (shouldFail) {
              failureCounts[taskId]++;
              const error = new Error('Temporary failure');
              (error as any).code = 'EBUSY';
              throw error;
            }
            
            // 成功
            successCounts[taskId]++;
            await fs.writeFile(filePath, content, 'utf-8');
          }, {
            maxRetries: retryMaxCount,
            baseDelay: 10
          });
          
          return true;
        } catch (error) {
          console.error(`Task ${taskId} failed after retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return false;
        }
      };
      
      // タスクを作成して実行
      const tasks = Array.from({ length: concurrentCount }).map((_, i) => {
        return createTask(`task-${i}`);
      });
      
      // すべてのタスクを並行実行
      const results = await Promise.all(tasks.map(task => task()));
      
      // 検証
      // すべてのタスクが成功したことを確認
      expect(results.every(result => result)).toBe(true);
      
      // ファイルが作成されたことを確認
      for (let i = 0; i < concurrentCount; i++) {
        const taskId = `task-${i}`;
        const filePath = path.join(dirPath, `${taskId}.txt`);
        
        const exists = await fileSystemService.fileExists(filePath);
        expect(exists).toBe(true);
        
        const content = await fileSystemService.readFile(filePath);
        expect(content).toBe(`Content for ${taskId}`);
      }
      
      // いくつかのタスクは少なくとも1回は失敗したはず
      const totalFailures = Object.values(failureCounts).reduce((sum, count) => sum + count, 0);
      console.log(`Total failures across all tasks: ${totalFailures}`);
      expect(totalFailures).toBeGreaterThan(0);
      
      // すべてのタスクが最終的に成功していることを確認
      for (let i = 0; i < concurrentCount; i++) {
        const taskId = `task-${i}`;
        expect(successCounts[taskId]).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
