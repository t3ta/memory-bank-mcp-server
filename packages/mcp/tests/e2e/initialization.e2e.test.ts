import { setupE2ETestEnv } from './helpers/e2e-test-env.js';
import type { Application } from '../../src/main/Application.js';
import type { DocumentDTO } from '../../src/application/dtos/DocumentDTO.js';

describe('MCP E2E Initialization Tests', () => {
  // let testEnv: Awaited<ReturnType<typeof setupE2ETestEnv>>['testEnv']; // Not used
  let app: Application;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const setup = await setupE2ETestEnv();
    // testEnv = setup.testEnv; // Not used
    app = setup.app;
    cleanup = setup.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should establish connection successfully and perform basic operations', async () => {
    const branchName = 'feature/init-test-branch';
    const documentPath = 'init-test-doc.json';
    const docContent = JSON.stringify({
      schema: "memory_document_v2",
      metadata: {
        id: "test-e2e-init-doc",
        title: "E2E Initialization Test Document", // Changed to English
        documentType: "test",
        path: documentPath,
        tags: ["test", "e2e", "init"],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        value: "Document content for E2E initialization test" // Changed to English
      }
    }, null, 2);

    const branchController = app.getBranchController();
    const writeResult = await branchController.writeDocument({
      branchName: branchName,
      path: documentPath,
      content: docContent,
      tags: ["test", "e2e", "init"]
    });

    expect(writeResult).toBeDefined();

    const readResult = await branchController.readDocument(
      branchName,
      documentPath
    );


    expect(readResult).toBeDefined();
    expect(readResult.success).toBe(true);

    if (readResult.success) {
      expect(readResult.data).toBeDefined();
      expect(readResult.data).not.toBeNull();
      if (!readResult.data) return fail('readResult.data should not be null');

      expect((readResult.data as any).document).toBeDefined();
      const document = (readResult.data as any).document as DocumentDTO;

      expect(document.content).toBeDefined();
      expect(typeof document.content).toBe('string');

      const parsedContent = JSON.parse(document.content);
      expect(parsedContent.metadata.id).toBe('test-e2e-init-doc');
      expect(parsedContent.content.value).toBe('Document content for E2E initialization test'); // Match the actual written content
      expect(document.tags).toEqual(expect.arrayContaining(["test", "e2e", "init"]));
    } else {
      fail('readDocument should return success: true');
    }
  });

  // TODO: Add more initialization related test cases
  // - Basic ping request to the server (if implemented)
  // - Behavior check on client disconnection
});
