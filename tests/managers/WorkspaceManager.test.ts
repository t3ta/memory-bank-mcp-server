import { WorkspaceManager } from '../../src/managers/WorkspaceManager';
import * as fs from 'fs/promises';
import path from 'path';
import os from 'os';

// モジュールの完全なモック化
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
  rm: jest.fn(),
  readdir: jest.fn(),
}));

describe('WorkspaceManager - Robust Test Suite', () => {
  let workspaceManager: WorkspaceManager;
  let testTempDir: string;

  beforeEach(async () => {
    // テスト用の一時ディレクトリを作成
    testTempDir = path.join(os.tmpdir(), `test-workspace-manager-${Date.now()}`);
    await fs.mkdir(testTempDir, { recursive: true });

    // WorkspaceManagerの初期化
    workspaceManager = new WorkspaceManager({
      basePath: testTempDir,
      language: 'ja'
    });

    // モックのリセット
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    try {
      await fs.rm(testTempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  // ブランチ管理機能のテスト
  describe('Branch Management', () => {
    test('ブランチ名のバリデーション', async () => {
      // 有効なブランチ名のテスト
      const validBranchNames = [
        'feature/test-branch',
        'fix/critical-bug',
        'hotfix/security-patch'
      ];

      for (const branchName of validBranchNames) {
        try {
          await workspaceManager.switchBranch(branchName);
        } catch (error) {
          fail(`有効なブランチ名「${branchName}」でエラーが発生: ${error}`);
        }
      }

      // 無効なブランチ名のテスト
      const invalidBranchNames = [
        'invalid/branch/name',
        '../security-risk',
        'space in branch',
        ''
      ];

      for (const branchName of invalidBranchNames) {
        await expect(workspaceManager.switchBranch(branchName)).rejects.toThrow();
      }
    });

    test('ブランチメモリーバンク作成の堅牢性', async () => {
      const branchName = 'feature/robust-test';

      // モックの設定
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      try {
        await workspaceManager.createBranchMemoryBank(branchName);
        
        // 正しいパスで呼び出されたことを確認
        expect(fs.mkdir).toHaveBeenCalledWith(
          expect.stringContaining(path.join('docs', 'branch-memory-bank', 'feature-robust-test')), 
          { recursive: true }
        );
      } catch (error) {
        fail(`ブランチメモリーバンク作成中に予期せぬエラー: ${error}`);
      }
    });
  });

  // ファイルシステム操作のテスト
  describe('File System Operations', () => {
    test('ファイルシステム権限エラーの処理', async () => {
      // 権限エラーをシミュレート
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(
        workspaceManager.createBranchMemoryBank('test-branch')
      ).rejects.toThrow('Permission denied');
    });

    test('一時的なファイルシステムエラーの回復', async () => {
      const branchName = 'feature/temp-error-test';
      
      // 最初は失敗し、2回目で成功するシナリオをシミュレート
      let callCount = 0;
      (fs.mkdir as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary file system error'));
        }
        return Promise.resolve();
      });

      try {
        await workspaceManager.createBranchMemoryBank(branchName);
        
        // 2回目の呼び出しで成功することを確認
        expect(callCount).toBe(2);
      } catch (error) {
        fail(`リトライ機構に失敗: ${error}`);
      }
    });
  });

  // エラーハンドリングとロバストネスのテスト
  describe('Error Handling and Robustness', () => {
    test('不明なエラーに対する適切な例外処理', async () => {
      // 予期しない型のエラーをシミュレート
      (fs.mkdir as jest.Mock).mockRejectedValue({ code: 'UNKNOWN_ERROR' });

      await expect(
        workspaceManager.createBranchMemoryBank('error-test-branch')
      ).rejects.toThrow();
    });

    test('メモリーバンク初期化時の堅牢性', async () => {
      // 初期化時のエラーケース
      (fs.access as jest.Mock).mockRejectedValue(new Error('Base path not accessible'));

      await expect(
        workspaceManager.initialize()
      ).rejects.toThrow('Base path not accessible');
    });
  });
});
