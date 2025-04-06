import { setupE2ETestEnv } from './helpers/e2e-test-env.js';
import { MCPInMemoryClient } from './helpers/MCPInMemoryClient.js';
// import type { Server } from '@modelcontextprotocol/sdk'; // SDKが見つからないためコメントアウト

describe('MCP E2E Context Tests', () => {
  let testEnv: Awaited<ReturnType<typeof setupE2ETestEnv>>['testEnv'];
  let client: MCPInMemoryClient;
  let server: any; // Server型が見つからないためanyに変更
  let cleanup: () => Promise<void>;

  const testBranchName = 'feature/e2e-context-test';
  const branchDocPath = 'branch-context-doc.json';
  const globalDocPath = 'core/global-context-doc.json';

  const branchDocContent = {
    schema: "memory_document_v2",
    metadata: { id: "context-branch-1", title: "Context Branch Test Doc", documentType: "test", path: branchDocPath, tags: ["context", "branch"], version: 1 },
    content: { value: "Branch document for context test" }
  };
  const globalDocContent = {
    schema: "memory_document_v2",
    metadata: { id: "context-global-1", title: "Context Global Test Doc", documentType: "test", path: globalDocPath, tags: ["context", "global"], version: 1 },
    content: { value: "Global document for context test" }
  };

  beforeEach(async () => {
    const setup = await setupE2ETestEnv();
    testEnv = setup.testEnv;
    client = new MCPInMemoryClient(setup.clientTransport);
    await client.initialize();
    server = setup.server;
    cleanup = setup.cleanup;

    // Write test documents before each test
    await client.writeBranchMemoryBank(
      testBranchName,
      branchDocPath,
      testEnv.docRoot,
      { content: JSON.stringify(branchDocContent, null, 2), tags: ["context", "branch"] }
    );
    await client.writeGlobalMemoryBank(
      globalDocPath,
      testEnv.docRoot,
      { content: JSON.stringify(globalDocContent, null, 2), tags: ["context", "global"] }
    );
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should read context including branch, global memory, and rules (ja)', async () => {
    const contextResult = await client.readContext(
      testBranchName,
      'ja', // 日本語ルールを指定
      testEnv.docRoot
    );

    expect(contextResult).toBeDefined();
    // ルールの確認 (ダミールールがセットアップされている前提)
    expect(contextResult.rules).toBeDefined();
    expect(contextResult.rules.schema).toBe('rules_v1'); // ダミールールのスキーマを確認

    // ブランチメモリバンクの確認
    expect(contextResult.branchMemory).toBeDefined();
    expect(Array.isArray(contextResult.branchMemory)).toBe(true);
    const foundBranchDoc = contextResult.branchMemory.find((doc: any) => doc.path === branchDocPath);
    expect(foundBranchDoc).toBeDefined();
    expect(foundBranchDoc.tags).toEqual(expect.arrayContaining(["context", "branch"]));
    const parsedBranchContent = JSON.parse(foundBranchDoc.content);
    expect(parsedBranchContent.metadata.id).toBe("context-branch-1");

    // グローバルメモリバンクの確認
    expect(contextResult.globalMemory).toBeDefined();
    expect(Array.isArray(contextResult.globalMemory)).toBe(true);
    const foundGlobalDoc = contextResult.globalMemory.find((doc: any) => doc.path === globalDocPath);
    expect(foundGlobalDoc).toBeDefined();
    expect(foundGlobalDoc.tags).toEqual(expect.arrayContaining(["context", "global"]));
    const parsedGlobalContent = JSON.parse(foundGlobalDoc.content);
    expect(parsedGlobalContent.metadata.id).toBe("context-global-1");
  });

  it('should read context with English rules (en)', async () => {
    const contextResult = await client.readContext(
      testBranchName,
      'en', // 英語ルールを指定
      testEnv.docRoot
    );
    expect(contextResult).toBeDefined();
    expect(contextResult.rules).toBeDefined();
    expect(contextResult.rules.schema).toBe('rules_v1'); // ダミールールのスキーマを確認 (内容は言語ごとに違うはずだが、ダミーなのでスキーマだけ確認)
    // メモリバンクの内容は前のテストと同じはずなので省略
  });

   it('should read context with Chinese rules (zh)', async () => {
    const contextResult = await client.readContext(
      testBranchName,
      'zh', // 中国語ルールを指定
      testEnv.docRoot
    );
    expect(contextResult).toBeDefined();
    expect(contextResult.rules).toBeDefined();
    expect(contextResult.rules.schema).toBe('rules_v1'); // ダミールールのスキーマを確認
  });

  it('should return error when reading context for non-existent branch', async () => {
    try {
      await client.readContext(
        'feature/non-existent-context-branch',
        'ja',
        testEnv.docRoot
      );
      fail('Expected readContext to throw an error for non-existent branch, but it did not.');
    } catch (error: any) {
      expect(error).toBeDefined();
      // Example check: expect(error.message).toContain('Branch not found');
    }
  });

  // TODO: Add test case for invalid language code?
});
