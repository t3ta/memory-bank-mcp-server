import { setupMcpTestEnv, createTestDocument, createBranchDir } from './helpers/mcp-test-helper.js';
import type { Application } from '../../src/main/Application.js';
import type { MCPTestClient } from '@t3ta/mcp-test';

describe('MCP E2E Search Tests (using mcp-test)', () => {
  let app: Application;
  let client: MCPTestClient;
  let cleanup: () => Promise<void>;
  let testEnv: any;

  const testBranch = 'feature-search-test';

  // テスト用ドキュメント定義
  const globalDocs = [
    {
      path: 'core/global-search-1.json',
      content: createTestDocument(
        'global-search-1',
        'core/global-search-1.json',
        { category: "test", priority: "high" },
        ["global", "test", "high-priority"]
      )
    },
    {
      path: 'core/global-search-2.json',
      content: createTestDocument(
        'global-search-2',
        'core/global-search-2.json',
        { category: "test", priority: "medium" },
        ["global", "test", "medium-priority"]
      )
    },
    {
      path: 'guides/global-search-3.json',
      content: createTestDocument(
        'global-search-3',
        'guides/global-search-3.json',
        { category: "guide", priority: "low" },
        ["global", "guide", "low-priority"]
      )
    }
  ];

  const branchDocs = [
    {
      path: 'branch-search-1.json',
      content: createTestDocument(
        'branch-search-1',
        'branch-search-1.json',
        { feature: "search", status: "active" },
        ["branch", "feature", "active"]
      )
    },
    {
      path: 'branch-search-2.json',
      content: createTestDocument(
        'branch-search-2',
        'branch-search-2.json',
        { feature: "search", status: "completed" },
        ["branch", "feature", "completed"]
      )
    },
    {
      path: 'designs/branch-search-3.json',
      content: createTestDocument(
        'branch-search-3',
        'designs/branch-search-3.json',
        { feature: "design", status: "review" },
        ["branch", "design", "review"]
      )
    }
  ];

  // テストデータをセットアップ
  async function setupTestDocuments() {
    // グローバルドキュメントをセットアップ
    for (const doc of globalDocs) {
      await client.callTool('write_global_memory_bank', {
        path: doc.path,
        docs: app.options.docsRoot,
        content: JSON.stringify(doc.content, null, 2),
        tags: doc.content.metadata.tags,
        returnContent: false
      });
    }

    // ブランチドキュメントをセットアップ
    for (const doc of branchDocs) {
      await client.callTool('write_branch_memory_bank', {
        branch: testBranch,
        path: doc.path,
        docs: app.options.docsRoot,
        content: JSON.stringify(doc.content, null, 2),
        tags: doc.content.metadata.tags,
        returnContent: false
      });
    }
  }

  beforeEach(async () => {
    const setup = await setupMcpTestEnv();
    app = setup.app;
    client = setup.client;
    cleanup = setup.cleanup;
    testEnv = setup.testEnv;

    // テスト用のブランチディレクトリを作成
    await createBranchDir(testEnv, testBranch);

    // テストドキュメントをセットアップ
    await setupTestDocuments();
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should search global documents by single tag', async () => {
    const searchResult = await client.callTool('search_documents_by_tags', {
      tags: ["guide"],
      docs: app.options.docsRoot,
      scope: 'global'
    });

    expect(searchResult).toBeDefined();
    expect(searchResult.success).toBe(true);
    expect(searchResult.data).toBeDefined();
    expect(Array.isArray(searchResult.data)).toBe(true);

    // "guide"タグを持つドキュメントは1つだけ
    expect(searchResult.data.length).toBe(1);
    expect(searchResult.data[0].path).toBe('guides/global-search-3.json');
  });

  it('should search branch documents by single tag', async () => {
    const searchResult = await client.callTool('search_documents_by_tags', {
      tags: ["design"],
      docs: app.options.docsRoot,
      scope: 'branch',
      branch: testBranch
    });

    expect(searchResult).toBeDefined();
    expect(searchResult.success).toBe(true);
    expect(searchResult.data).toBeDefined();
    expect(Array.isArray(searchResult.data)).toBe(true);

    // "design"タグを持つドキュメントは1つだけ
    expect(searchResult.data.length).toBe(1);
    expect(searchResult.data[0].path).toBe('designs/branch-search-3.json');
  });

  it('should search documents by multiple tags with AND logic', async () => {
    const searchResult = await client.callTool('search_documents_by_tags', {
      tags: ["global", "test"],
      docs: app.options.docsRoot,
      scope: 'global',
      match: 'and'
    });

    expect(searchResult).toBeDefined();
    expect(searchResult.success).toBe(true);
    expect(searchResult.data).toBeDefined();
    expect(Array.isArray(searchResult.data)).toBe(true);

    // "global"と"test"タグを両方持つドキュメントは2つ
    expect(searchResult.data.length).toBe(2);

    // ドキュメントパスの配列を作成
    const resultPaths = searchResult.data.map((doc: any) => doc.path);

    // 期待されるパスが含まれているか確認
    expect(resultPaths).toContain('core/global-search-1.json');
    expect(resultPaths).toContain('core/global-search-2.json');
    expect(resultPaths).not.toContain('guides/global-search-3.json');
  });

  it('should search documents by multiple tags with OR logic', async () => {
    const searchResult = await client.callTool('search_documents_by_tags', {
      tags: ["high-priority", "medium-priority"],
      docs: app.options.docsRoot,
      scope: 'global',
      match: 'or'
    });

    expect(searchResult).toBeDefined();
    expect(searchResult.success).toBe(true);
    expect(searchResult.data).toBeDefined();
    expect(Array.isArray(searchResult.data)).toBe(true);

    // "high-priority"または"medium-priority"タグを持つドキュメントは2つ
    expect(searchResult.data.length).toBe(2);

    // ドキュメントパスの配列を作成
    const resultPaths = searchResult.data.map((doc: any) => doc.path);

    // 期待されるパスが含まれているか確認
    expect(resultPaths).toContain('core/global-search-1.json');
    expect(resultPaths).toContain('core/global-search-2.json');
    expect(resultPaths).not.toContain('guides/global-search-3.json');
  });

  it('should search documents across all scopes', async () => {
    const searchResult = await client.callTool('search_documents_by_tags', {
      tags: ["feature"],
      docs: app.options.docsRoot,
      scope: 'all',
      branch: testBranch
    });

    expect(searchResult).toBeDefined();
    expect(searchResult.success).toBe(true);
    expect(searchResult.data).toBeDefined();
    expect(Array.isArray(searchResult.data)).toBe(true);

    // "feature"タグを持つブランチドキュメントは2つだけ
    // グローバルドキュメントにはこのタグは付いていない
    expect(searchResult.data.length).toBe(2);

    // ドキュメントパスの配列を作成
    const resultPaths = searchResult.data.map((doc: any) => doc.path);

    // 期待されるパスが含まれているか確認
    expect(resultPaths).toContain('branch-search-1.json');
    expect(resultPaths).toContain('branch-search-2.json');
  });

  it('should return empty array when no documents match search criteria', async () => {
    const searchResult = await client.callTool('search_documents_by_tags', {
      tags: ["non-existent-tag"],
      docs: app.options.docsRoot,
      scope: 'all',
      branch: testBranch
    });

    expect(searchResult).toBeDefined();
    expect(searchResult.success).toBe(true);
    expect(searchResult.data).toBeDefined();
    expect(Array.isArray(searchResult.data)).toBe(true);

    // マッチするドキュメントはない
    expect(searchResult.data.length).toBe(0);
  });
});
