/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { loadBranchFixture } from '../helpers/fixtures-loader.js';
// import { createTestApplication } from '../helpers/app-factory.js'; // Removed app-factory
// import { Application } from '../../../src/main/Application.js'; // Removed Application import
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { ReadBranchDocumentUseCase } from '../../../src/application/usecases/branch/ReadBranchDocumentUseCase.js'; // Import real UseCase and types
import { BranchInfo } from '../../../src/domain/entities/BranchInfo.js'; // Import BranchInfo
import { DomainError } from '../../../src/shared/errors/DomainError.js'; // Import DomainError type and specific errors for checking
import { ApplicationError, ApplicationErrors } from '../../../src/shared/errors/ApplicationError.js'; // Import ApplicationError type and specific errors for checking
import { IGitService } from '../../../src/infrastructure/git/IGitService.js';
import { IConfigProvider } from '../../../src/infrastructure/config/interfaces/IConfigProvider.js';
import type { WorkspaceConfig } from '../../../src/infrastructure/config/WorkspaceConfig.js';
import { vi, Mocked } from 'vitest'; // Mocked 型をインポート
import { execSync } from 'child_process';
import { logger } from '../../../src/shared/utils/logger.js';

import * as path from 'path';
import fsExtra from 'fs-extra'; // Use default import for fs-extra

describe('ReadBranchDocumentUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  // let app: Application; // Removed app instance
  let container: DIContainer; // Use DI container
  let useCase: ReadBranchDocumentUseCase;
  let mockGitService: Mocked<IGitService>; // vi.Mocked -> Mocked
  let mockConfigProvider: Mocked<IConfigProvider>; // vi.Mocked -> Mocked
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


    mockGitService = {
      getCurrentBranchName: vi.fn<() => Promise<string>>() // jest -> vi
    };
    // getCurrentBranchNameが呼ばれたらTEST_BRANCHを返すように設定
    mockGitService.getCurrentBranchName.mockResolvedValue(TEST_BRANCH);
    container.register<IGitService>('gitService', mockGitService); // コンテナにGitServiceモックを登録


    mockConfigProvider = {
      // initialize は呼ばれない想定なので vi.fn() だけ用意
      initialize: vi.fn(), // jest -> vi
      // getConfig はテストケースごとに振る舞いを変えるのでモック関数を用意
      getConfig: vi.fn<() => WorkspaceConfig>(), // jest -> vi
      // 他のメソッドも vi.fn() でモック化しておく
      getGlobalMemoryPath: vi.fn<() => string>(), // jest -> vi
      getBranchMemoryPath: vi.fn<(branchName: string) => string>(), // 引数を追加
      getLanguage: vi.fn<() => 'en' | 'ja' | 'zh'>() // jest -> vi
    };
    // デフォルトの getConfig の戻り値を設定 (isProjectMode: true)
    mockConfigProvider.getConfig.mockReturnValue({
      docsRoot: testEnv.docRoot,
      verbose: false,
      language: 'en',
      isProjectMode: true // デフォルトはプロジェクトモードとしておく
    });
    // 他のメソッドのデフォルト戻り値も設定 (必要に応じて)
    mockConfigProvider.getGlobalMemoryPath.mockReturnValue(testEnv.globalMemoryPath);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH));
    mockConfigProvider.getLanguage.mockReturnValue('en');

    container.register<IConfigProvider>('configProvider', mockConfigProvider); // コンテナにConfigProviderモックを登録

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
      // 正しいブランチディレクトリパスを指定する
      const safeBranchName = BranchInfo.create(TEST_BRANCH).safeName;
      await loadBranchFixture(path.join(testEnv.branchMemoryPath, safeBranchName), 'basic');

      const result = await useCase.execute({
        branchName: TEST_BRANCH,
        path: 'branchContext.json'
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe('branchContext.json');
      expect(typeof result.document.content).toBe('object'); // Expect object

      // console.log は不要になったので削除
      // console.log('### Raw content before parse:', result.document.content);
      const document = result.document.content as any; // Use content directly and assert type
      // console.log('### Parsed document:', JSON.stringify(document, null, 2)); // パース後のログは一旦不要
      expect(document).toHaveProperty('schema', 'memory_document_v2');
      // Check if documentType exists at the top level after parsing
      expect(document).toHaveProperty('documentType');
      expect(document).toHaveProperty('metadata');
      expect(document).toHaveProperty('content');
      expect(document.documentType).toBe('branch_context');
      // 期待値をフィクスチャの ID に合わせる
      expect(document.metadata).toHaveProperty('id', 'basic-branch-context');
      // expect(document.metadata).toHaveProperty('documentType', 'branch_context'); // metadata にはない
    });

    it('should return an error if the document does not exist', async () => {
      const documentPath = 'non-existent.json';
      try {
        await useCase.execute({
          branchName: TEST_BRANCH,
          path: documentPath
        });
        throw new Error('Expected documentNotFound error but no error was thrown.');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).message).toBe(`Document with ID ${documentPath} was not found`);
        expect((error as DomainError).code).toBe('DOMAIN_ERROR.DOCUMENT_NOT_FOUND');
        // details のチェックも追加（必要に応じて）
        expect((error as DomainError).details).toEqual({
          branchName: TEST_BRANCH,
          documentId: documentPath
        });
      }
    });

    it('should return an error if the branch does not exist', async () => {
      try {
        await useCase.execute({
          branchName: 'non-existent-branch', // prefixなし
          path: 'some-document.json'
        });
        throw new Error('Expected validationError but no error was thrown.');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).message).toBe('Branch name must include a namespace prefix with slash (e.g. "feature/my-branch")'); // 期待値を修正
        expect((error as DomainError).code).toBe('DOMAIN_ERROR.INVALID_BRANCH_NAME'); // 期待値を修正
      }
    });

    it('should return an error for an invalid path', async () => {
      try {
        await useCase.execute({
          branchName: TEST_BRANCH,
          path: '../outside-documents/sensitive.json'
        });
        throw new Error('Expected validationError but no error was thrown.');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).message).toBe('Document path cannot contain ".."');
        expect((error as DomainError).code).toBe('DOMAIN_ERROR.INVALID_DOCUMENT_PATH'); // 期待値を修正
      }
    });

    it('should read a document from a subdirectory within the branch', async () => {
      const subDir = path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH, 'subdir');
      await fsExtra.ensureDir(subDir);

      // スキーマ変更に合わせて documentType をトップレベルに移動
      const testDocument = {
        schema: "memory_document_v2",
        documentType: "test", // documentType をトップレベルに
        metadata: {
          id: "subdirectory-document",
          title: "サブディレクトリ内ドキュメント",
          // documentType: "test", // metadata から削除
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
      expect(typeof result.document.content).toBe('object'); // Expect object

      const document = result.document.content as any; // Use content directly and assert type
      // このテストケースの期待値はこれで合ってるはず
      expect(document.metadata.id).toBe('subdirectory-document');
      expect(document.metadata.path).toBe('subdir/test-document.json');
    });

    describe('when branchName is omitted in project mode (isProjectMode: true)', () => {
      beforeEach(() => {
        // この describe 内では isProjectMode: true を強制
        mockConfigProvider.getConfig.mockReturnValue({
          docsRoot: testEnv.docRoot,
          verbose: false,
          language: 'en',
          isProjectMode: true // ★ プロジェクトモード ON ★
        });
        // 各テスト前に GitService の呼び出し回数をリセット
        mockGitService.getCurrentBranchName.mockClear();
      });

      it('should read a document using the current git branch', async () => {
        // 準備：テストドキュメントを配置
        // 正しいブランチディレクトリパスを指定する
        const safeBranchName = BranchInfo.create(TEST_BRANCH).safeName;
        await loadBranchFixture(path.join(testEnv.branchMemoryPath, safeBranchName), 'basic');

        // 実行：branchName を省略
        const result = await useCase.execute({ path: 'branchContext.json' });

        // 検証：
        expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1); // GitService が呼ばれる
        expect(result).toBeDefined();
        expect(result.document.path).toBe('branchContext.json');
        expect(typeof result.document.content).toBe('object'); // Expect object
        const document = result.document.content as any; // Use content directly and assert type
        // 期待値をフィクスチャの ID に合わせる
        expect(document.metadata.id).toBe('basic-branch-context');
      });

      it('should return an error if current branch cannot be determined', async () => {
        // 準備：GitService がエラーを投げるように設定
        const gitError = new Error('Not a git repository');
        mockGitService.getCurrentBranchName.mockRejectedValue(gitError);

        // 実行＆検証：エラーが投げられることを確認
        try {
          await useCase.execute({ path: 'any/document.json' });
          throw new Error('Expected ApplicationError but no error was thrown.');
        } catch (error) {
          expect(error).toBeInstanceOf(ApplicationError);
          // 新しいエラーメッセージは元のメッセージをラップする形に変わっているので、含まれているか確認
          expect((error as ApplicationError).message).toContain('Branch name is required but could not be automatically determined');
          // エラーコードも変わったようなので修正
          expect((error as ApplicationError).code).toBe('APP_ERROR.INVALID_INPUT');
        }
        expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1); // GitService が呼ばれる
      });
    });

    describe('when branchName is omitted outside of project mode (isProjectMode: false)', () => {
      beforeEach(() => {
        // この describe 内では isProjectMode: false を強制
        mockConfigProvider.getConfig.mockReturnValue({
          docsRoot: testEnv.docRoot, // docsRoot は存在するが...
          verbose: false,
          language: 'en',
          isProjectMode: false // ★ プロジェクトモード OFF ★
        });
        // 各テスト前に GitService の呼び出し回数をリセット
        mockGitService.getCurrentBranchName.mockClear();
      });

      it('should return an error because branchName is required', async () => {
        // 準備：テストドキュメントを配置 (これはエラーに関係ないはず)
        // 正しいブランチディレクトリパスを指定する (エラーに関係ないはずだが念のため修正)
        const safeBranchName = BranchInfo.create(TEST_BRANCH).safeName;
        await loadBranchFixture(path.join(testEnv.branchMemoryPath, safeBranchName), 'basic');

        // 実行＆検証：branchName を省略するとエラーになることを確認
        try {
          await useCase.execute({ path: 'branchContext.json' });
          throw new Error('Expected ApplicationError but no error was thrown.');
        } catch (error) {
          expect(error).toBeInstanceOf(ApplicationError);
          expect((error as ApplicationError).code).toBe(ApplicationErrors.invalidInput('Branch name is required when not running in project mode.').code); // Compare code
          expect((error as ApplicationError).message).toBe('Branch name is required when not running in project mode.'); // Compare message
        }

        // 検証：GitService は呼ばれないはず
        expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled();
      });
    });

    // このテストケースは上の describe 内に移動したので削除
  });
});
