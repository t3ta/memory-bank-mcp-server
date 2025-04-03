/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { loadBranchFixture } from '../helpers/fixtures-loader.js';
// import { createTestApplication } from '../helpers/app-factory.js'; // Removed app-factory
// import { Application } from '../../../src/main/Application.js'; // Removed Application import
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { ReadBranchDocumentUseCase, type ReadBranchDocumentOutput } from '../../../src/application/usecases/branch/ReadBranchDocumentUseCase.js'; // Import real UseCase and types
import { BranchInfo } from '../../../src/domain/entities/BranchInfo.js'; // Import BranchInfo
import { DomainErrors } from '../../../src/shared/errors/DomainError.js'; // Import specific errors for checking
import { ApplicationErrors } from '../../../src/shared/errors/ApplicationError.js'; // Import specific errors for checking
import { IGitService } from '../../../src/infrastructure/git/IGitService.js'; // みらい追加：GitServiceのインターフェース
import { jest } from '@jest/globals'; // みらい追加：Jestのモック機能使うよ！
import { execSync } from 'child_process'; // みらい追加：Gitコマンド実行用
import { logger } from '../../../src/shared/utils/logger.js'; // みらい追加：ロガー使うよ！

import * as path from 'path';
import fsExtra from 'fs-extra'; // Use default import for fs-extra

describe('ReadBranchDocumentUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  // let app: Application; // Removed app instance
  let container: DIContainer; // Use DI container
  let useCase: ReadBranchDocumentUseCase;
  let mockGitService: jest.Mocked<IGitService>; // みらい追加：モックの型定義
  const TEST_BRANCH = 'feature/test-branch';
  const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName;

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Create test branch directory
    // createBranchDir handles safe name conversion
    // Gitリポジトリ内でテストブランチを作成・チェックアウト
    try {
      execSync(`git checkout -b ${TEST_BRANCH}`, { cwd: testEnv.tempDir, stdio: 'ignore' });
      logger.debug(`[Test Setup] Checked out to new branch: ${TEST_BRANCH}`);
    } catch (gitError) {
      logger.error(`[Test Setup] Error creating/checking out branch ${TEST_BRANCH}:`, gitError);
      throw gitError; // エラーがあればテストを中断
    }

    // Create test branch directory (after checking out branch in git)
    await createBranchDir(testEnv, TEST_BRANCH);

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // みらい追加：GitServiceをモック化してコンテナに再登録
    mockGitService = {
      getCurrentBranchName: jest.fn<() => Promise<string>>() // モック関数を作成
    };
    // getCurrentBranchNameが呼ばれたらTEST_BRANCHを返すように設定
    mockGitService.getCurrentBranchName.mockResolvedValue(TEST_BRANCH);
    container.register<IGitService>('gitService', mockGitService); // コンテナにモックを登録

    // Get the use case instance from container
    useCase = await container.get<ReadBranchDocumentUseCase>('readBranchDocumentUseCase');
    // Removed app initialization and use case retrieval from app
    // app = await createTestApplication({ docsRoot: testEnv.docRoot });
    // useCase = app['readBranchDocumentUseCase'];
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('execute', () => {
    it('should read a document from the branch memory bank', async () => {
      await loadBranchFixture(path.join(testEnv.branchMemoryPath, TEST_BRANCH), 'basic');

      const result = await useCase.execute({
        branchName: TEST_BRANCH,
        path: 'branchContext.json'
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe('branchContext.json');
      expect(typeof result.document.content).toBe('string');

      const document = JSON.parse(result.document.content);
      expect(document).toHaveProperty('schema', 'memory_document_v2');
      expect(document).toHaveProperty('metadata');
      expect(document).toHaveProperty('content');
      expect(document.metadata).toHaveProperty('id', 'test-branch-context');
      expect(document.metadata).toHaveProperty('documentType', 'branch_context');
    });

    it('should return an error if the document does not exist', async () => {
      await expect(useCase.execute({
        branchName: TEST_BRANCH,
        path: 'non-existent.json'
      })).rejects.toThrow(DomainErrors.documentNotFound('non-existent.json', { branchName: TEST_BRANCH }));
    });

    it('should return an error if the branch does not exist', async () => {
      await expect(useCase.execute({
        branchName: 'non-existent-branch',
        path: 'some-document.json'
      })).rejects.toThrow('Branch name must include a namespace prefix');
    });

    it('should return an error for an invalid path', async () => {
      await expect(useCase.execute({
        branchName: TEST_BRANCH,
        path: '../outside-documents/sensitive.json'
      })).rejects.toThrow('Document path cannot contain ".."');
    });

    it('should read a document from a subdirectory within the branch', async () => {
      const subDir = path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH, 'subdir');
      await fsExtra.ensureDir(subDir);

      const testDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "subdirectory-document",
          title: "サブディレクトリ内ドキュメント",
          documentType: "test",
          path: "subdir/test-document.json",
          tags: ["test", "subdirectory"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          value: "サブディレクトリ内のテストドキュメント"
        }
      };

      await fsExtra.outputJson(path.join(subDir, 'test-document.json'), testDocument, { spaces: 2 });

      const result = await useCase.execute({
        branchName: TEST_BRANCH,
        path: 'subdir/test-document.json'
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe('subdir/test-document.json');
      expect(typeof result.document.content).toBe('string');

      const document = JSON.parse(result.document.content);
      expect(document.metadata.id).toBe('subdirectory-document');
      expect(document.metadata.path).toBe('subdir/test-document.json');
    });

    // みらい追加：branchName省略時のテストケース
    it('should read a document using the current git branch if branchName is omitted', async () => {
      // 準備：テストドキュメントを配置
      await loadBranchFixture(path.join(testEnv.branchMemoryPath, TEST_BRANCH), 'basic');

      // 実行：branchName を省略して UseCase を呼び出す
      const result = await useCase.execute({
        // branchName: TEST_BRANCH, // ← 省略！
        path: 'branchContext.json'
      });

      // 検証：
      // 1. GitService の getCurrentBranchName が呼ばれたか？
      expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1);

      // 2. ドキュメントが正しく読み込めたか？ (既存のテストと同様の検証)
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe('branchContext.json');
      const document = JSON.parse(result.document.content);
      expect(document.metadata.id).toBe('test-branch-context');
    });

    // みらい追加：Gitリポジトリ外などでブランチ名が取得できない場合のエラーテスト
    it('should return an error if branchName is omitted and current branch cannot be determined', async () => {
      // 準備：GitService がエラーを投げるようにモックを設定
      const gitError = new Error('Not a git repository');
      mockGitService.getCurrentBranchName.mockRejectedValue(gitError);

      // 実行＆検証：branchName を省略して呼び出し、特定のエラーが投げられることを確認
      await expect(useCase.execute({
        // branchName: undefined, // 省略
        path: 'any/document.json'
      })).rejects.toThrow(ApplicationErrors.invalidInput('Branch name is required but could not be automatically determined. Please provide it explicitly or ensure you are in a Git repository.'));

      // GitService の getCurrentBranchName が呼ばれたか？
      expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1);
    });
  });
});
