import { setupE2ETestEnv } from './helpers/e2e-test-env.js';
import type { Application } from '../../src/main/Application.js';
// DocumentDTO and MCPSuccessResponse are not used
import type { ContextResult } from '../../src/application/usecases/types.js'; // Remove unused RulesResult

describe('MCP E2E Context Tests', () => {
  // let testEnv: Awaited<ReturnType<typeof setupE2ETestEnv>>['testEnv']; // Not used
  let app: Application;
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
    // testEnv = setup.testEnv; // Not used
    app = setup.app;
    cleanup = setup.cleanup;

    const branchController = app.getBranchController();
    const globalController = app.getGlobalController();
    await branchController.writeDocument({
      branchName: testBranchName,
      path: branchDocPath,
      content: JSON.stringify(branchDocContent, null, 2),
      tags: ["context", "branch"]
    });
    await globalController.writeDocument({
      path: globalDocPath,
      content: JSON.stringify(globalDocContent, null, 2),
      tags: ["context", "global"]
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should read context including branch, global memory, and rules (ja)', async () => {
    const contextController = app.getContextController();
    const contextResult = await contextController.readContext({ branch: testBranchName, language: 'ja' });

    expect(contextResult).toBeDefined();
    expect(contextResult.success).toBe(true);
    expect(contextResult.data).toBeDefined();

    if (contextResult.success && contextResult.data) {
      const data = contextResult.data as ContextResult;
      expect(data.rules).toBeDefined();
      expect(data.rules?.content).toBeDefined();

      expect(data.branchMemory).toBeDefined();
      expect(typeof data.branchMemory).toBe('object');
      expect(data.branchMemory?.[branchDocPath]).toBeDefined();
      const branchDocContentString = data.branchMemory?.[branchDocPath];
      expect(typeof branchDocContentString).toBe('string');
      const parsedBranchContent = JSON.parse(branchDocContentString ?? '{}');
      expect(parsedBranchContent.metadata.id).toBe("context-branch-1");

      expect(data.globalMemory).toBeDefined();
      expect(typeof data.globalMemory).toBe('object');
      expect(data.globalMemory?.[globalDocPath]).toBeDefined();
      const globalDocContentString = data.globalMemory?.[globalDocPath];
      expect(typeof globalDocContentString).toBe('string');
      const parsedGlobalContent = JSON.parse(globalDocContentString ?? '{}');
      expect(parsedGlobalContent.metadata.id).toBe("context-global-1");
    } else {
      fail('readContext should return success: true with data');
    }
  });

  it('should read context with English rules (en)', async () => {
    const contextController = app.getContextController();
    const contextResult = await contextController.readContext({ branch: testBranchName, language: 'en' });
    expect(contextResult).toBeDefined();
    expect(contextResult.success).toBe(true);
    if (contextResult.success && contextResult.data) {
      const data = contextResult.data as ContextResult;
      expect(data.rules).toBeDefined();
      expect(data.rules?.content).toBeDefined();
    } else {
      fail('readContext should return success: true with data');
    }
  });

   it('should read context with Chinese rules (zh)', async () => {
    const contextController = app.getContextController();
    const contextResult = await contextController.readContext({ branch: testBranchName, language: 'zh' });
    expect(contextResult).toBeDefined();
    expect(contextResult.success).toBe(true);
    if (contextResult.success && contextResult.data) {
      const data = contextResult.data as ContextResult;
      expect(data.rules).toBeDefined();
      expect(data.rules?.content).toBeDefined();
    } else {
      fail('readContext should return success: true with data');
    }
  });

  it('should return error when reading context for non-existent branch', async () => {
    try {
      const contextController = app.getContextController();
      await contextController.readContext({
        branch: 'feature/non-existent-context-branch',
        language: 'ja'
      });
      fail('Expected readContext to throw an error for non-existent branch, but it did not.');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  // TODO: Add test case for invalid language code?
});
