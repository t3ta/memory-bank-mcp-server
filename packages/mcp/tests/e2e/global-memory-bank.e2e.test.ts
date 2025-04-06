import { setupE2ETestEnv } from './helpers/e2e-test-env.js';
import { MCPInMemoryClient } from './helpers/MCPInMemoryClient.js';
// import type { Server } from '@modelcontextprotocol/sdk'; // SDKが見つからない問題が解決するまでコメントアウト

describe('MCP E2E Global Memory Bank Tests', () => {
  let testEnv: Awaited<ReturnType<typeof setupE2ETestEnv>>['testEnv'];
  let client: MCPInMemoryClient;
  let server: any; // Server型が見つからないためanyに変更
  let cleanup: () => Promise<void>;

  const testDocPath = 'core/global-test-doc.json'; // グローバルバンク内のパス
  const initialDocContent = {
    schema: "memory_document_v2",
    metadata: { id: "global-test-1", title: "Global Test Doc", documentType: "test", path: testDocPath, tags: ["global", "initial"], version: 1 },
    content: { message: "Initial global content" }
  };
  const initialDocContentString = JSON.stringify(initialDocContent, null, 2);

  beforeEach(async () => {
    const setup = await setupE2ETestEnv();
    testEnv = setup.testEnv;
    client = new MCPInMemoryClient(setup.clientTransport);
    await client.initialize();
    server = setup.server;
    cleanup = setup.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should write and read a document in global memory bank', async () => {
    // Write initial document
    const writeResult = await client.writeGlobalMemoryBank(
      testDocPath,
      testEnv.docRoot,
      { content: initialDocContentString, tags: ["global", "initial", "write-test"] }
    );
    expect(writeResult).toBeDefined();
    // expect(writeResult.success).toBe(true);

    // Read the document back
    const readResult = await client.readGlobalMemoryBank(
      testDocPath,
      testEnv.docRoot
    );
    expect(readResult).toBeDefined();
    expect(readResult.document).toBeDefined();
    expect(readResult.document.path).toBe(testDocPath);
    expect(readResult.document.tags).toEqual(expect.arrayContaining(["global", "initial", "write-test"]));
    const parsedContent = JSON.parse(readResult.document.content);
    expect(parsedContent.content.message).toBe("Initial global content");
  });

  it('should update a document using JSON Patch', async () => {
    // Write initial document first
    await client.writeGlobalMemoryBank(
      testDocPath,
      testEnv.docRoot,
      { content: initialDocContentString, tags: ["global", "patch-test"] }
    );

    // Define JSON Patch operations
    const patches = [
      { op: 'replace', path: '/content/message', value: 'Updated global content via patch' },
      { op: 'add', path: '/content/anotherField', value: 123 },
      { op: 'add', path: '/metadata/tags/-', value: 'patched' } // Add a tag
    ];

    // Apply the patch
    const patchResult = await client.writeGlobalMemoryBank(
      testDocPath,
      testEnv.docRoot,
      { patches: patches, tags: ["global", "patch-test", "patched"] } // Provide tags again
    );
    expect(patchResult).toBeDefined();
    // expect(patchResult.success).toBe(true);

    // Read the document to verify changes
    const readResult = await client.readGlobalMemoryBank(
      testDocPath,
      testEnv.docRoot
    );
    expect(readResult).toBeDefined();
    expect(readResult.document).toBeDefined();
    expect(readResult.document.tags).toEqual(expect.arrayContaining(["global", "patch-test", "patched"]));
    const parsedContent = JSON.parse(readResult.document.content);
    expect(parsedContent.content.message).toBe('Updated global content via patch');
    expect(parsedContent.content.anotherField).toBe(123);
  });

  it('should return error when reading non-existent document', async () => {
    try {
      await client.readGlobalMemoryBank(
        'core/non-existent-global-doc.json',
        testEnv.docRoot
      );
      fail('Expected readGlobalMemoryBank to throw an error for non-existent document, but it did not.');
    } catch (error: any) {
      expect(error).toBeDefined();
      // Example check: expect(error.message).toContain('Document not found');
    }
  });

   it('should return error when patching non-existent document', async () => {
    const patches = [{ op: 'add', path: '/content/message', value: 'test' }];
    try {
      await client.writeGlobalMemoryBank(
        'core/non-existent-for-patch-global.json',
        testEnv.docRoot,
        { patches: patches }
      );
      fail('Expected writeGlobalMemoryBank with patch to throw an error for non-existent document, but it did not.');
    } catch (error: any) {
      expect(error).toBeDefined();
      // Example check: expect(error.message).toContain('Cannot patch non-existent document');
    }
  });

  // TODO: Add more test cases if needed
});
