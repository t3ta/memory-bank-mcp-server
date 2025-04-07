import { setupE2ETestEnv } from './helpers/e2e-test-env.js';
import type { Application } from '../../src/main/Application.js';
import type { DocumentDTO } from '../../src/application/dtos/DocumentDTO.js';
// MCPSuccessResponse is not used, remove its import if present

describe('MCP E2E Branch Memory Bank Tests', () => {
  // let testEnv: Awaited<ReturnType<typeof setupE2ETestEnv>>['testEnv']; // Not used
  let app: Application;
  let cleanup: () => Promise<void>;

  const testBranchName = 'feature/e2e-branch-test';
  const testDocPath = 'test-doc.json';
  const initialDocContent = {
    schema: 'memory_document_v2',
    metadata: {
      id: 'branch-test-1',
      title: 'Branch Test Doc',
      documentType: 'test',
      path: testDocPath,
      tags: ['initial'],
      version: 1,
    },
    content: { message: 'Initial content' },
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

  it('should write and read a document in branch memory bank', async () => {
    const branchController = app.getBranchController();
    const writeResult = await branchController.writeDocument({
      branchName: testBranchName,
      path: testDocPath,
      content: initialDocContentString,
      tags: ['initial', 'write-test'],
    });
    expect(writeResult).toBeDefined();

    const readResult = await branchController.readDocument(
      testBranchName,
      testDocPath
    );
    expect(readResult).toBeDefined();
    expect(readResult.success).toBe(true);

    if (readResult.success) {
      expect(readResult.data).toBeDefined();
      expect(readResult.data).not.toBeNull();
      if (!readResult.data) return fail('readResult.data should not be null');

      const document = (readResult.data as any).document as DocumentDTO;
      expect(document.path).toBe(testDocPath);
      expect(document.tags).toEqual(expect.arrayContaining(['initial', 'write-test']));
      const parsedContent = JSON.parse(document.content);
      expect(parsedContent.content.message).toBe('Initial content');
    } else {
      fail('readDocument should return success: true');
    }
  });

  it('should update a document using JSON Patch', async () => {
    const branchController = app.getBranchController();
    await branchController.writeDocument({
      branchName: testBranchName,
      path: testDocPath,
      content: initialDocContentString,
      tags: ['patch-test'],
    });

    const patches = [
      { op: 'replace', path: '/content/message', value: 'Updated content via patch' },
      { op: 'add', path: '/content/newField', value: true },
      { op: 'add', path: '/metadata/tags/-', value: 'patched' },
    ];

    const patchResult = await branchController.writeDocument({
      branchName: testBranchName,
      path: testDocPath,
      patches: patches,
      tags: ['patch-test', 'patched'],
    });
    expect(patchResult).toBeDefined();

    const readResult = await branchController.readDocument(testBranchName, testDocPath);

    expect(readResult).toBeDefined();
    expect(readResult.success).toBe(true);

    if (readResult.success) {
      expect(readResult.data).toBeDefined();
      expect(readResult.data).not.toBeNull();
      if (!readResult.data) return fail('readResult.data should not be null');

      const document = (readResult.data as any).document as DocumentDTO;
      expect(document.tags).toEqual(expect.arrayContaining(['patch-test', 'patched']));
      const parsedContent = JSON.parse(document.content);
      expect(parsedContent.content.newField).toBe(true);
    } else {
      fail('readDocument should return success: true');
    }
  });

  it('should return error when reading non-existent document', async () => {
    try {
      const branchController = app.getBranchController();
      await branchController.readDocument(testBranchName, 'non-existent-doc.json');
      fail('Expected readDocument to throw an error for non-existent document, but it did not.');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it('should return error when reading from non-existent branch', async () => {
    try {
      const branchController = app.getBranchController();
      await branchController.readDocument('feature/non-existent-branch', testDocPath);
      fail('Expected readDocument to throw an error for non-existent branch, but it did not.');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it('should return error when patching non-existent document', async () => {
    const patches = [{ op: 'add', path: '/content/message', value: 'test' }];
    try {
      const branchController = app.getBranchController();
      await branchController.writeDocument({
        branchName: testBranchName,
        path: 'non-existent-for-patch.json',
        patches: patches,
      });
      fail('Expected writeDocument with patch to throw an error for non-existent document, but it did not.');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  // TODO: Add more test cases
  // - Writing document without content or patches (should fail?)
  // - Invalid JSON Patch operations
  // - Concurrent write/patch operations (if applicable)
  // - Tag handling on overwrite vs patch
});
