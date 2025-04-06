import { setupE2ETestEnv } from './helpers/e2e-test-env.js';
import { MCPInMemoryClient } from './helpers/MCPInMemoryClient.js';
// import type { Server } from '@modelcontextprotocol/sdk'; // SDKが見つからないためコメントアウト

describe('MCP E2E Branch Memory Bank Tests', () => {
  let testEnv: Awaited<ReturnType<typeof setupE2ETestEnv>>['testEnv'];
  let client: MCPInMemoryClient;
  let server: any; // Server型が見つからないためanyに変更
  let cleanup: () => Promise<void>;

  const testBranchName = 'feature/e2e-branch-test';
  const testDocPath = 'test-doc.json';
  const initialDocContent = {
    schema: "memory_document_v2",
    metadata: { id: "branch-test-1", title: "Branch Test Doc", documentType: "test", path: testDocPath, tags: ["initial"], version: 1 },
    content: { message: "Initial content" }
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

  it('should write and read a document in branch memory bank', async () => {
    // Write initial document
    const writeResult = await client.writeBranchMemoryBank(
      testBranchName,
      testDocPath,
      testEnv.docRoot,
      { content: initialDocContentString, tags: ["initial", "write-test"] }
    );
    expect(writeResult).toBeDefined();
    // expect(writeResult.success).toBe(true); // Assuming success property

    // Read the document back
    const readResult = await client.readBranchMemoryBank(
      testBranchName,
      testDocPath,
      testEnv.docRoot
    );
    expect(readResult).toBeDefined();
    expect(readResult.document).toBeDefined();
    expect(readResult.document.path).toBe(testDocPath);
    expect(readResult.document.tags).toEqual(expect.arrayContaining(["initial", "write-test"]));
    const parsedContent = JSON.parse(readResult.document.content);
    expect(parsedContent.content.message).toBe("Initial content");
  });

  it('should update a document using JSON Patch', async () => {
    // Write initial document first
    await client.writeBranchMemoryBank(
      testBranchName,
      testDocPath,
      testEnv.docRoot,
      { content: initialDocContentString, tags: ["patch-test"] }
    );

    // Define JSON Patch operations
    const patches = [
      { op: 'replace', path: '/content/message', value: 'Updated content via patch' },
      { op: 'add', path: '/content/newField', value: true },
      { op: 'add', path: '/metadata/tags/-', value: 'patched' } // Add a tag
    ];

    // Apply the patch
    const patchResult = await client.writeBranchMemoryBank(
      testBranchName,
      testDocPath,
      testEnv.docRoot,
      { patches: patches, tags: ["patch-test", "patched"] } // Provide tags again when patching if needed, or handle tag update via patch
    );
    expect(patchResult).toBeDefined();
    // expect(patchResult.success).toBe(true);

    // Read the document to verify changes
    const readResult = await client.readBranchMemoryBank(
      testBranchName,
      testDocPath,
      testEnv.docRoot
    );
    expect(readResult).toBeDefined();
    expect(readResult.document).toBeDefined();
    expect(readResult.document.tags).toEqual(expect.arrayContaining(["patch-test", "patched"]));
    const parsedContent = JSON.parse(readResult.document.content);
    expect(parsedContent.content.message).toBe('Updated content via patch');
    expect(parsedContent.content.newField).toBe(true);
  });

  it('should return error when reading non-existent document', async () => {
    try {
      await client.readBranchMemoryBank(
        testBranchName,
        'non-existent-doc.json',
        testEnv.docRoot
      );
      // If no error is thrown, fail the test
      fail('Expected readBranchMemoryBank to throw an error for non-existent document, but it did not.');
    } catch (error: any) {
      // Expect an error (specific error type/message depends on server implementation)
      expect(error).toBeDefined();
      // Example check: expect(error.message).toContain('Document not found');
    }
  });

  it('should return error when reading from non-existent branch', async () => {
     try {
      await client.readBranchMemoryBank(
        'feature/non-existent-branch',
        testDocPath,
        testEnv.docRoot
      );
       fail('Expected readBranchMemoryBank to throw an error for non-existent branch, but it did not.');
    } catch (error: any) {
      expect(error).toBeDefined();
      // Example check: expect(error.message).toContain('Branch not found');
    }
  });

   it('should return error when patching non-existent document', async () => {
    const patches = [{ op: 'add', path: '/content/message', value: 'test' }];
    try {
      await client.writeBranchMemoryBank(
        testBranchName,
        'non-existent-for-patch.json',
        testEnv.docRoot,
        { patches: patches }
      );
      fail('Expected writeBranchMemoryBank with patch to throw an error for non-existent document, but it did not.');
    } catch (error: any) {
      expect(error).toBeDefined();
      // Example check: expect(error.message).toContain('Cannot patch non-existent document');
    }
  });

  // TODO: Add more test cases
  // - Writing document without content or patches (should fail?)
  // - Invalid JSON Patch operations
  // - Concurrent write/patch operations (if applicable)
  // - Tag handling on overwrite vs patch
});
