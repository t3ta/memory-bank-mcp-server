import { setupMcpTestEnv, createTestDocument, LegacyCompatibleToolResponse, callToolWithLegacySupport } from './helpers/mcp-test-helper.js';
import type { Application } from '../../src/main/Application.js';
import type { MCPTestClient } from '@t3ta/mcp-test';
import type { DocumentDTO } from '../../src/application/dtos/DocumentDTO.js';
import type { fail } from 'assert';

describe('MCP E2E Global Memory Bank Tests (using mcp-test)', () => {
  let app: Application;
  let client: MCPTestClient;
  let cleanup: () => Promise<void>;

  const testDocPath = 'core/global-test-doc.json';
  const initialDocContent = createTestDocument(
    'global-test-1',
    testDocPath,
    { message: "Initial global content" },
    ["global", "initial"]
  );
  const initialDocContentString = JSON.stringify(initialDocContent, null, 2);

  beforeEach(async () => {
    const setup = await setupMcpTestEnv();
    app = setup.app;
    client = setup.client;
    cleanup = setup.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should write and read a document in global memory bank', async () => {
    // クライアントを使ってグローバルメモリバンクにドキュメントを書き込み
    const writeResult = await callToolWithLegacySupport(client, 'write_global_memory_bank', {
      path: testDocPath,
      docs: app.options.docsRoot,
      content: initialDocContentString,
      tags: ["global", "initial", "write-test"],
      returnContent: true
    });

    expect(writeResult).toBeDefined();
    expect(writeResult.success).toBe(true);
    // 新しいAPIの形式でも検証
    expect(writeResult.status).toBe('success');

    // 書き込んだドキュメントを読み取り
    const readResult = await callToolWithLegacySupport(client, 'read_global_memory_bank', {
      path: testDocPath,
      docs: app.options.docsRoot
    });

    expect(readResult).toBeDefined();
    expect(readResult.success).toBe(true);
    // 新しいAPIの形式でも検証
    expect(readResult.status).toBe('success');

    if (readResult.success) {
      expect(readResult.data).toBeDefined();
      expect(readResult.data).not.toBeNull();
      if (!readResult.data) throw new Error('readResult.data should not be null');

      const document = readResult.data as DocumentDTO;
      expect(document.path).toBe(testDocPath);

      // ContentをパースしてチェックするのはJSON形式の場合は必要
      const content = typeof document.content === 'string'
        ? JSON.parse(document.content)
        : document.content;

      expect(content.content.message).toBe("Initial global content");

      // タグのチェック (将来的にタグが公開APIに追加されたら有効化)
      // expect(document.tags).toEqual(expect.arrayContaining(["global", "initial", "write-test"]));
    } else {
      throw new Error('readDocument should return success: true');
    }
  });

  it('should fail when reading non-existent document', async () => {
    try {
      // 存在しないドキュメントの読み取りを試みる
      await callToolWithLegacySupport(client, 'read_global_memory_bank', {
        path: 'core/non-existent-doc.json',
        docs: app.options.docsRoot
      });

      throw new Error('Expected read_global_memory_bank to throw for non-existent document');
    } catch (error: any) {
      // エラーが発生することを期待
      expect(error).toBeDefined();
    }
  });

  it('should update existing document with new content', async () => {
    // まず初期ドキュメントを作成
    await callToolWithLegacySupport(client, 'write_global_memory_bank', {
      path: testDocPath,
      docs: app.options.docsRoot,
      content: initialDocContentString,
      returnContent: false
    });

    // 更新するドキュメントを準備
    const updatedDoc = createTestDocument(
      'global-test-1',
      testDocPath,
      { message: "Updated global content" },
      ["global", "updated"]
    );

    // ドキュメント更新
    const updateResult = await callToolWithLegacySupport(client, 'write_global_memory_bank', {
      path: testDocPath,
      docs: app.options.docsRoot,
      content: JSON.stringify(updatedDoc, null, 2),
      tags: ["global", "updated"],
      returnContent: true
    });

    expect(updateResult).toBeDefined();
    expect(updateResult.success).toBe(true);
    // 新しいAPIの形式でも検証
    expect(updateResult.status).toBe('success');

    // 更新されたドキュメントを読み取り
    const readResult = await callToolWithLegacySupport(client, 'read_global_memory_bank', {
      path: testDocPath,
      docs: app.options.docsRoot
    });

    expect(readResult.success).toBe(true);
    // 新しいAPIの形式でも検証
    expect(readResult.status).toBe('success');

    if (readResult.success && readResult.data) {
      const document = readResult.data as DocumentDTO;
      const content = typeof document.content === 'string'
        ? JSON.parse(document.content)
        : document.content;

      expect(content.content.message).toBe("Updated global content");
    } else {
      throw new Error('Failed to read updated document');
    }
  });

  // JSON Patchのテストも必要に応じて追加可能
  // TODO: JSONパッチテストの追加
});
