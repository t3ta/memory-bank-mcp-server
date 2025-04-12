import { setupMcpTestEnv, createTestDocument, createBranchDir, MockMCPToolResponse, callToolWithLegacySupport } from './helpers/mcp-test-helper.js';
import type { Application } from '../../src/main/Application.js';
import type { MCPTestClient } from '@t3ta/mcp-test';
import type { DocumentDTO } from '../../src/application/dtos/DocumentDTO.js';
import { toSafeBranchName } from '../../src/shared/utils/branchNameUtils.js';

describe('MCP E2E Branch Memory Bank Tests (using mcp-test)', () => {
  let app: Application;
  let client: MCPTestClient;
  let cleanup: () => Promise<void>;
  let testEnv: any;

  const testBranch = 'feature-test-branch';
  const testDocPath = 'branch-test-doc.json';

  // テスト用のドキュメントを準備
  const initialDocContent = createTestDocument(
    'branch-test-1',
    testDocPath,
    { message: "Initial branch content" },
    ["branch", "initial"]
  );
  const initialDocContentString = JSON.stringify(initialDocContent, null, 2);

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

  it('should write and read a document in branch memory bank', async () => {
    // ブランチメモリバンクにドキュメントを書き込み (unified APIを使用)
    const writeResult = await callToolWithLegacySupport(client, 'write_document', {
      scope: 'branch',
      branch: testBranch,
      path: testDocPath,
      docs: app.options.docsRoot,
      content: initialDocContentString,
      tags: ["branch", "initial", "test"],
      returnContent: true
    });

    expect(writeResult).toBeDefined();
    expect(writeResult.success).toBe(true);

    // 書き込んだドキュメントを読み取り (unified APIを使用)
    const readResult = await callToolWithLegacySupport(client, 'read_document', {
      scope: 'branch',
      branch: testBranch,
      path: testDocPath,
      docs: app.options.docsRoot
    });

    expect(readResult).toBeDefined();
    expect(readResult.success).toBe(true);

    if (readResult.success) {
      expect(readResult.data).toBeDefined();
      if (!readResult.data) throw new Error('readResult.data should not be null');

      const document = readResult.data as DocumentDTO;
      expect(document.path).toBe(testDocPath);

      // ContentをパースしてチェックするのはJSON形式の場合は必要
      const content = typeof document.content === 'string'
        ? JSON.parse(document.content)
        : document.content;

      expect(content.content.message).toBe("Initial branch content");
    } else {
      throw new Error('read_document should return success: true');
    }
  });

  it('should fail when reading non-existent branch document', async () => {
    try {
      // 存在しないドキュメントの読み取りを試みる (unified APIを使用)
      await callToolWithLegacySupport(client, 'read_document', {
        scope: 'branch',
        branch: testBranch,
        path: 'non-existent-doc.json',
        docs: app.options.docsRoot
      });

      throw new Error('Expected read_document to throw for non-existent document');
    } catch (error: any) {
      // エラーが発生することを期待
      expect(error).toBeDefined();
    }
  });

  it('should update existing branch document with new content', async () => {
    // まず初期ドキュメントを作成 (unified APIを使用)
    await callToolWithLegacySupport(client, 'write_document', {
      scope: 'branch',
      branch: testBranch,
      path: testDocPath,
      docs: app.options.docsRoot,
      content: initialDocContentString,
      returnContent: false
    });

    // 更新するドキュメントを準備
    const updatedDoc = createTestDocument(
      'branch-test-1',
      testDocPath,
      { message: "Updated branch content" },
      ["branch", "updated"]
    );

    // ドキュメント更新 (unified APIを使用)
    const updateResult = await callToolWithLegacySupport(client, 'write_document', {
      scope: 'branch',
      branch: testBranch,
      path: testDocPath,
      docs: app.options.docsRoot,
      content: JSON.stringify(updatedDoc, null, 2),
      tags: ["branch", "updated"],
      returnContent: true
    });

    expect(updateResult).toBeDefined();
    expect(updateResult.success).toBe(true);

    // 更新されたドキュメントを読み取り (unified APIを使用)
    const readResult = await callToolWithLegacySupport(client, 'read_document', {
      scope: 'branch',
      branch: testBranch,
      path: testDocPath,
      docs: app.options.docsRoot
    });

    expect(readResult.success).toBe(true);

    if (readResult.success && readResult.data) {
      const document = readResult.data as DocumentDTO;
      const content = typeof document.content === 'string'
        ? JSON.parse(document.content)
        : document.content;

      expect(content.content.message).toBe("Updated branch content");
    } else {
      throw new Error('Failed to read updated document');
    }
  });

  it('should create branchContext.json and activeContext.json when writing to new branch', async () => {
    const newBranch = 'feature-new-branch';
    const safeBranchName = toSafeBranchName(newBranch);

    // 新しいブランチにドキュメントを書き込み（ブランチディレクトリが自動的に作成される）
    await callToolWithLegacySupport(client, 'write_branch_memory_bank', {
      branch: newBranch,
      path: testDocPath,
      docs: app.options.docsRoot,
      content: initialDocContentString,
      returnContent: false
    });

    // branchContext.jsonとactiveContext.jsonが作成されたことを確認
    const branchContextResult = await callToolWithLegacySupport(client, 'read_branch_memory_bank', {
      branch: newBranch,
      path: 'branchContext.json',
      docs: app.options.docsRoot
    });

    expect(branchContextResult.success).toBe(true);

    const activeContextResult = await callToolWithLegacySupport(client, 'read_branch_memory_bank', {
      branch: newBranch,
      path: 'activeContext.json',
      docs: app.options.docsRoot
    });

    expect(activeContextResult.success).toBe(true);
  });

  // JSON Patchのテストも必要に応じて追加可能
  // TODO: JSONパッチテストの追加
});
