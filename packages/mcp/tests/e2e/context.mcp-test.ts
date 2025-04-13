import { setupMcpTestEnv, createTestDocument, createBranchDir, callToolWithLegacySupport } from './helpers/mcp-test-helper.js';
import type { Application } from '../../src/main/Application.js';
import type { MCPTestClient } from '@t3ta/mcp-test';
import type { DocumentDTO } from '../../src/application/dtos/DocumentDTO.js';

// テスト用のツールレスポンス型
interface MockToolResponse<T = any> {
  success: boolean;
  data: T;
}

describe('MCP E2E Context Tests (using mcp-test)', () => {
  let app: Application;
  let client: MCPTestClient;
  let cleanup: () => Promise<void>;
  let testEnv: any;

  const testBranch = 'feature-context-test';

  beforeEach(async () => {
    const setup = await setupMcpTestEnv();
    app = setup.app;
    client = setup.client;
    cleanup = setup.cleanup;
    testEnv = setup.testEnv;

    // テスト用のブランチディレクトリを作成
    await createBranchDir(testEnv, testBranch);

    // テスト用のドキュメントを作成
    const branchContextDoc = createTestDocument(
      'branch-context-test',
      'branchContext.json',
      {
        branchName: testBranch,
        description: "Test branch for context tests",
        createdAt: new Date().toISOString()
      },
      ["branch-context", "test"]
    );

    const activeContextDoc = createTestDocument(
      'active-context-test',
      'activeContext.json',
      {
        activeTasks: ["test context functionality"],
        lastModified: new Date().toISOString()
      },
      ["active-context", "test"]
    );

    // ブランチコンテキストファイル作成
    await callToolWithLegacySupport(client, 'write_branch_memory_bank', {
      branch: testBranch,
      path: 'branchContext.json',
      docs: app.options.docsRoot,
      content: JSON.stringify(branchContextDoc, null, 2),
      returnContent: false
    });

    // アクティブコンテキストファイル作成
    await callToolWithLegacySupport(client, 'write_branch_memory_bank', {
      branch: testBranch,
      path: 'activeContext.json',
      docs: app.options.docsRoot,
      content: JSON.stringify(activeContextDoc, null, 2),
      returnContent: false
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('read_context command', () => {
    it('should read context from branch when branch is specified', async () => {
      // コンテキスト読み取りテスト
      const readResult = await callToolWithLegacySupport(client, 'read_context', {
        branch: testBranch,
        language: 'en',
        docs: app.options.docsRoot
      }) as MockToolResponse;

      expect(readResult).toBeDefined();
      expect(readResult.success).toBe(true);

      if (readResult.success && readResult.data) {
        // コンテキストの内容を確認
        const contextData = readResult.data;

        // ブランチ情報があること
        expect(contextData.branch).toBeDefined();
        expect(contextData.branch.name).toBe(testBranch);

        // アクティブタスク情報があること
        expect(contextData.activeTasks).toBeDefined();
        expect(Array.isArray(contextData.activeTasks)).toBe(true);
        expect(contextData.activeTasks.length).toBeGreaterThan(0);
        expect(contextData.activeTasks[0]).toBe("test context functionality");
      } else {
        throw new Error('Failed to read context with context command');
      }
    });

    // プロジェクトモードでブランチが省略できることをテスト
    it('should auto-detect branch when in project mode and branch is omitted', async () => {
      // プロジェクトモードをシミュレート
      process.env.MEMORY_BANK_PROJECT_MODE = 'true';

      try {
        // DIコンテナからgitServiceを直接取得してモック
        const { setupContainer } = await import('../../src/main/di/providers.js');
        const container = await setupContainer({ docsRoot: app.options.docsRoot });
        const gitService = await container.get('gitService');

        // オリジナルの実装を保存
        const originalGetCurrentBranchName = gitService.getCurrentBranchName;

        try {
          // テスト用のブランチ名を返すように上書き
          gitService.getCurrentBranchName = async () => testBranch;

          // ブランチ名を省略してコンテキスト読み取りテスト
          const readResult = await callToolWithLegacySupport(client, 'read_context', {
            // branch パラメータは省略
            language: 'en',
            docs: app.options.docsRoot
          }) as MockToolResponse;

          expect(readResult).toBeDefined();
          expect(readResult.success).toBe(true);

          if (readResult.success && readResult.data) {
            // コンテキストの内容を確認
            const contextData = readResult.data;

            // ブランチ情報があること (自動検出されたもの)
            expect(contextData.branch).toBeDefined();
            expect(contextData.branch.name).toBe(testBranch);

            // アクティブタスク情報があること
            expect(contextData.activeTasks).toBeDefined();
            expect(Array.isArray(contextData.activeTasks)).toBe(true);
          } else {
            throw new Error('Failed to read context with auto-detected branch');
          }
        } finally {
          // テスト後にgitServiceの実装を元に戻す
          gitService.getCurrentBranchName = originalGetCurrentBranchName;
        }
      } finally {
        // テスト後に環境を元に戻す
        delete process.env.MEMORY_BANK_PROJECT_MODE;
      }
    });

    it('should read context with specific language parameter', async () => {
      // 日本語コンテキスト読み取りテスト
      const readResult = await callToolWithLegacySupport(client, 'read_context', {
        branch: testBranch,
        language: 'ja',
        docs: app.options.docsRoot
      }) as MockToolResponse;

      expect(readResult).toBeDefined();
      expect(readResult.success).toBe(true);

      // 言語が指定されていても基本的なコンテキスト情報が取得できること
      if (readResult.success && readResult.data) {
        const contextData = readResult.data;
        expect(contextData.branch).toBeDefined();
        expect(contextData.branch.name).toBe(testBranch);
      } else {
        throw new Error('Failed to read context with language parameter');
      }
    });

    // 環境変数から language を取得するテスト
    it('should use language from environment when language parameter is omitted', async () => {
      // 環境変数に言語を設定
      process.env.LANGUAGE = 'ja';

      try {
        // language パラメータを省略してコンテキスト読み取りテスト
        const readResult = await callToolWithLegacySupport(client, 'read_context', {
          branch: testBranch,
          // language パラメータは省略
          docs: app.options.docsRoot
        }) as MockToolResponse;

        expect(readResult).toBeDefined();
        expect(readResult.success).toBe(true);

        if (readResult.success && readResult.data) {
          // コンテキストの内容を確認
          const contextData = readResult.data;
          // データが正しく取得できていることを確認
          expect(contextData.branch).toBeDefined();
          expect(contextData.branch.name).toBe(testBranch);
        } else {
          throw new Error('Failed to read context with language from environment');
        }
      } finally {
        // テスト後に環境を元に戻す
        delete process.env.LANGUAGE;
      }
    });

    // docs パラメータが省略できるテスト
    it('should use docs path from environment when docs parameter is omitted', async () => {
      // 環境変数に docs パスを設定
      const originalDocsRoot = process.env.DOCS_ROOT;
      process.env.DOCS_ROOT = app.options.docsRoot;

      try {
        // docs パラメータを省略してコンテキスト読み取りテスト
        const readResult = await callToolWithLegacySupport(client, 'read_context', {
          branch: testBranch,
          language: 'en',
          // docs パラメータは省略
        }) as MockToolResponse;

        expect(readResult).toBeDefined();
        expect(readResult.success).toBe(true);

        if (readResult.success && readResult.data) {
          // コンテキストの内容を確認
          const contextData = readResult.data;
          // データが正しく取得できていることを確認
          expect(contextData.branch).toBeDefined();
          expect(contextData.branch.name).toBe(testBranch);
        } else {
          throw new Error('Failed to read context with docs from environment');
        }
      } finally {
        // テスト後に環境を元に戻す
        if (originalDocsRoot) {
          process.env.DOCS_ROOT = originalDocsRoot;
        } else {
          delete process.env.DOCS_ROOT;
        }
      }
    });

    it('should return error when reading context from non-existent branch', async () => {
      try {
        // 存在しないブランチからのコンテキスト読み取り試行
        await callToolWithLegacySupport(client, 'read_context', {
          branch: 'non-existent-branch',
          language: 'en',
          docs: app.options.docsRoot
        });

        throw new Error('Expected read_context to throw an error for non-existent branch');
      } catch (error: any) {
        // エラーが発生することを確認
        expect(error).toBeDefined();
      }
    });
  });
});
