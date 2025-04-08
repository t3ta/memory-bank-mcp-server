import { setupE2ETestEnv } from './helpers/e2e-test-env';
import type { Application } from '../../src/main/Application.js'; // .js拡張子を修正
import type { ContextResult } from '../../src/application/usecases/types.js';

describe('MCP E2E Context Tests', () => {
  let app: Application;
  let cleanup: () => Promise<void>;

  const testBranchName = 'feature/e2e-context-test';
  const branchCoreDocPath = 'branchContext.json';
  const branchDocPath = 'branch-context-doc.json';
  const globalDocPath = 'core/global-context-doc.json';

  const branchCoreContent = {
    schema: "branch_context_v1",
    documentType: "branch_context",
    metadata: { title: "Branch Context" },
    content: { key: "branch-core-value" }
  };

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
    app = setup.app;
    cleanup = setup.cleanup;

    const branchController = app.getBranchController();

    // コアファイルを書き込む
    await branchController.writeDocument({
      branchName: testBranchName,
      path: branchCoreDocPath,
      content: JSON.stringify(branchCoreContent, null, 2)
    });

    // 追加ドキュメントを書き込む
    await branchController.writeDocument({
      branchName: testBranchName,
      path: branchDocPath,
      content: JSON.stringify(branchDocContent, null, 2),
      tags: ["context", "branch"]
    });

    const globalController = app.getGlobalController();
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
    const contextResult = await contextController.readContext({
      branch: testBranchName,
      language: 'ja'
    });

    expect(contextResult).toBeDefined();
    expect(contextResult.success).toBe(true);
    expect(contextResult.data).toBeDefined();

    if (contextResult.success && contextResult.data) {
      const data = contextResult.data as ContextResult;

      // ルールのテスト
      expect(data.rules).toBeDefined();
      expect(data.rules?.content).toBeDefined();

      // ブランチメモリのテスト
      expect(data.branchMemory).toBeDefined();
      const branchMemory = data.branchMemory!;

      // コアファイルの確認
      expect(branchMemory.coreFiles[branchCoreDocPath]).toBeDefined();
      expect(branchMemory.coreFiles[branchCoreDocPath]?.documentType).toBe('branch_context');

      // 追加ドキュメントの確認
      expect(branchMemory.availableFiles).toContain(branchDocPath);

      // グローバルメモリのテスト
      expect(data.globalMemory).toBeDefined();
      const globalMemory = data.globalMemory!;
      expect(globalMemory.availableFiles).toContain(globalDocPath);
    } else {
      fail('readContext should return success: true with data');
    }
  });

  // ...他のテストケースは変更なし...
});
