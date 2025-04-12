import { setupMcpTestEnv, createTestDocument, createBranchDir } from './helpers/mcp-test-helper.js';
import type { Application } from '../../src/main/Application.js';
import type { MCPTestClient } from '@t3ta/mcp-test';
import type { DocumentDTO } from '../../src/application/dtos/DocumentDTO.js';

describe('MCP E2E Unified Document Commands Tests (using mcp-test)', () => {
  let app: Application;
  let client: MCPTestClient;
  let cleanup: () => Promise<void>;
  let testEnv: any;

  const testBranch = 'feature-unified-test';
  const testGlobalDocPath = 'core/unified-global-test-doc.json';
  const testBranchDocPath = 'unified-branch-test-doc.json';

  beforeEach(async () => {
    const setup = await setupMcpTestEnv();
    app = setup.app;
    client = setup.client;
    cleanup = setup.cleanup;
    testEnv = setup.testEnv;

    // テスト用のブランチディレクトリを作成
    await createBranchDir(testEnv, testBranch);
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('read_document command', () => {
    it('should read document from global scope', async () => {
      // グローバルドキュメントを作成
      const globalDoc = createTestDocument(
        'unified-global-1',
        testGlobalDocPath,
        { message: "Unified global content" },
        ["global", "unified"]
      );

      // グローバルドキュメントを書き込み
      await client.callTool('write_global_memory_bank', {
        path: testGlobalDocPath,
        docs: app.options.docsRoot,
        content: JSON.stringify(globalDoc, null, 2),
        returnContent: false
      });

      // 統一コマンドでドキュメントを読み取り
      const readResult = await client.callTool('read_document', {
        scope: 'global',
        path: testGlobalDocPath,
        docs: app.options.docsRoot
      });

      expect(readResult).toBeDefined();
      expect(readResult.success).toBe(true);

      if (readResult.success && readResult.data) {
        const document = readResult.data as DocumentDTO;
        expect(document.path).toBe(testGlobalDocPath);

        const content = typeof document.content === 'string'
          ? JSON.parse(document.content)
          : document.content;

        expect(content.content.message).toBe("Unified global content");
      } else {
        fail('Failed to read global document with unified command');
      }
    });

    it('should read document from branch scope', async () => {
      // ブランチドキュメントを作成
      const branchDoc = createTestDocument(
        'unified-branch-1',
        testBranchDocPath,
        { message: "Unified branch content" },
        ["branch", "unified"]
      );

      // ブランチドキュメントを書き込み
      await client.callTool('write_branch_memory_bank', {
        branch: testBranch,
        path: testBranchDocPath,
        docs: app.options.docsRoot,
        content: JSON.stringify(branchDoc, null, 2),
        returnContent: false
      });

      // 統一コマンドでドキュメントを読み取り
      const readResult = await client.callTool('read_document', {
        scope: 'branch',
        path: testBranchDocPath,
        docs: app.options.docsRoot,
        branch: testBranch
      });

      expect(readResult).toBeDefined();
      expect(readResult.success).toBe(true);

      if (readResult.success && readResult.data) {
        const document = readResult.data as DocumentDTO;
        expect(document.path).toBe(testBranchDocPath);

        const content = typeof document.content === 'string'
          ? JSON.parse(document.content)
          : document.content;

        expect(content.content.message).toBe("Unified branch content");
      } else {
        fail('Failed to read branch document with unified command');
      }
    });
  });

  describe('write_document command', () => {
    it('should write document to global scope', async () => {
      // グローバルドキュメントを作成
      const globalDoc = createTestDocument(
        'unified-global-write-1',
        testGlobalDocPath,
        { message: "Unified global write content" },
        ["global", "unified", "write"]
      );

      // 統一コマンドでドキュメントを書き込み
      const writeResult = await client.callTool('write_document', {
        scope: 'global',
        path: testGlobalDocPath,
        docs: app.options.docsRoot,
        content: globalDoc,
        tags: ["global", "unified", "write"],
        returnContent: true
      });

      expect(writeResult).toBeDefined();
      expect(writeResult.success).toBe(true);

      // 書き込まれたドキュメントを読み取り
      const readResult = await client.callTool('read_global_memory_bank', {
        path: testGlobalDocPath,
        docs: app.options.docsRoot
      });

      expect(readResult.success).toBe(true);

      if (readResult.success && readResult.data) {
        const document = readResult.data as DocumentDTO;
        const content = typeof document.content === 'string'
          ? JSON.parse(document.content)
          : document.content;

        expect(content.content.message).toBe("Unified global write content");
      } else {
        fail('Failed to read document written with unified command');
      }
    });

    it('should write document to branch scope', async () => {
      // ブランチドキュメントを作成
      const branchDoc = createTestDocument(
        'unified-branch-write-1',
        testBranchDocPath,
        { message: "Unified branch write content" },
        ["branch", "unified", "write"]
      );

      // 統一コマンドでドキュメントを書き込み
      const writeResult = await client.callTool('write_document', {
        scope: 'branch',
        path: testBranchDocPath,
        docs: app.options.docsRoot,
        branch: testBranch,
        content: branchDoc,
        tags: ["branch", "unified", "write"],
        returnContent: true
      });

      expect(writeResult).toBeDefined();
      expect(writeResult.success).toBe(true);

      // 書き込まれたドキュメントを読み取り
      const readResult = await client.callTool('read_branch_memory_bank', {
        branch: testBranch,
        path: testBranchDocPath,
        docs: app.options.docsRoot
      });

      expect(readResult.success).toBe(true);

      if (readResult.success && readResult.data) {
        const document = readResult.data as DocumentDTO;
        const content = typeof document.content === 'string'
          ? JSON.parse(document.content)
          : document.content;

        expect(content.content.message).toBe("Unified branch write content");
      } else {
        fail('Failed to read document written with unified command');
      }
    });

    it('should update existing document with new content', async () => {
      // 最初のドキュメントを作成
      const initialDoc = createTestDocument(
        'unified-update-1',
        testGlobalDocPath,
        { message: "Initial content" },
        ["global", "unified", "initial"]
      );

      // 最初のドキュメントを書き込み
      await client.callTool('write_document', {
        scope: 'global',
        path: testGlobalDocPath,
        docs: app.options.docsRoot,
        content: initialDoc,
        returnContent: false
      });

      // 更新用ドキュメントを作成
      const updatedDoc = createTestDocument(
        'unified-update-1',
        testGlobalDocPath,
        { message: "Updated content" },
        ["global", "unified", "updated"]
      );

      // 統一コマンドでドキュメントを更新
      const updateResult = await client.callTool('write_document', {
        scope: 'global',
        path: testGlobalDocPath,
        docs: app.options.docsRoot,
        content: updatedDoc,
        tags: ["global", "unified", "updated"],
        returnContent: true
      });

      expect(updateResult).toBeDefined();
      expect(updateResult.success).toBe(true);

      // 更新されたドキュメントを読み取り
      const readResult = await client.callTool('read_document', {
        scope: 'global',
        path: testGlobalDocPath,
        docs: app.options.docsRoot
      });

      expect(readResult.success).toBe(true);

      if (readResult.success && readResult.data) {
        const document = readResult.data as DocumentDTO;
        const content = typeof document.content === 'string'
          ? JSON.parse(document.content)
          : document.content;

        expect(content.content.message).toBe("Updated content");
      } else {
        fail('Failed to read updated document');
      }
    });
  });

  // JSON Patchのテストも必要に応じて追加可能
  // TODO: JSONパッチテストの追加
});
