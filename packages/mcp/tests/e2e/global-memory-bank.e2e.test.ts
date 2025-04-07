import { setupE2ETestEnv } from './helpers/e2e-test-env.js';
import type { Application } from '../../src/main/Application.js';
// MCPSuccessResponse is not used
import type { DocumentDTO } from '../../src/application/dtos/DocumentDTO.js';

describe('MCP E2E Global Memory Bank Tests', () => {
  // let testEnv: Awaited<ReturnType<typeof setupE2ETestEnv>>['testEnv']; // Not used
  let app: Application;
  let cleanup: () => Promise<void>;

  const testDocPath = 'core/global-test-doc.json';
  const initialDocContent = {
    schema: "memory_document_v2",
    metadata: { id: "global-test-1", title: "Global Test Doc", documentType: "test", path: testDocPath, tags: ["global", "initial"], version: 1 },
    content: { message: "Initial global content" }
  };
  const initialDocContentString = JSON.stringify(initialDocContent, null, 2);

  beforeEach(async () => {
    const setup = await setupE2ETestEnv();
    // testEnv = setup.testEnv; // Not used
    app = setup.app;
    cleanup = setup.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should write and read a document in global memory bank', async () => {
    const globalController = app.getGlobalController();
    const writeResult = await globalController.writeDocument({
      path: testDocPath,
      content: initialDocContentString,
      tags: ["global", "initial", "write-test"]
    });
    expect(writeResult).toBeDefined();

    const readResult = await globalController.readDocument(
      testDocPath
    );
    expect(readResult).toBeDefined();
    expect(readResult.success).toBe(true);

    if (readResult.success) {
      expect(readResult.data).toBeDefined();
      expect(readResult.data).not.toBeNull();
      if (!readResult.data) return fail('readResult.data should not be null');

      const document = readResult.data as DocumentDTO;
      expect(document.path).toBe(testDocPath);
      // TODO: tags プロパティ確認 (DocumentDTO に tags が追加されたらコメント解除)
      // expect(document.tags).toEqual(expect.arrayContaining(["global", "initial", "write-test"]));
      const parsedContent = JSON.parse(document.content);
      expect(parsedContent.content.message).toBe("Initial global content");
    } else {
      fail('readDocument should return success: true');
    }
  });

  // TODO: GlobalController が JSON Patch に対応したら、このテストケースを有効化する

  it('should return error when reading non-existent document', async () => {
    try {
      const globalController = app.getGlobalController();
      await globalController.readDocument(
        'core/non-existent-global-doc.json'
      );
      fail('Expected readGlobalMemoryBank to throw an error for non-existent document, but it did not.');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  // TODO: GlobalController が JSON Patch に対応したら、このテストケースを有効化する

  // TODO: Add more test cases if needed
});
