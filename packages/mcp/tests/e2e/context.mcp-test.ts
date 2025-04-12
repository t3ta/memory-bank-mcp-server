import { setupMcpTestEnv, createTestDocument, createBranchDir } from './helpers/mcp-test-helper.js';
import type { Application } from '../../src/main/Application.js';
import type { MCPTestClient } from 'mcp-test';
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
    await client.callTool('write_branch_memory_bank', {
      branch: testBranch,
      path: 'branchContext.json',
      docs: app.options.docsRoot,
      content: JSON.stringify(branchContextDoc, null, 2),
      returnContent: false
    });

    // アクティブコンテキストファイル作成
    await client.callTool('write_branch_memory_bank', {
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
    it('should read context from branch', async () => {
      // コンテキスト読み取りテスト
      const readResult = await client.callTool('read_context', {
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
        fail('Failed to read context with context command');
      }
    });

    it('should read context with specific language parameter', async () => {
      // 日本語コンテキスト読み取りテスト
      const readResult = await client.callTool('read_context', {
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
        fail('Failed to read context with language parameter');
      }
    });

    it('should return error when reading context from non-existent branch', async () => {
      try {
        // 存在しないブランチからのコンテキスト読み取り試行
        await client.callTool('read_context', {
          branch: 'non-existent-branch',
          language: 'en',
          docs: app.options.docsRoot
        });

        fail('Expected read_context to throw an error for non-existent branch');
      } catch (error: any) {
        // エラーが発生することを確認
        expect(error).toBeDefined();
      }
    });
  });
});
