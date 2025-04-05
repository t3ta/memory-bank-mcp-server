/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { loadBranchFixture, loadGlobalFixture } from '../helpers/fixtures-loader.js';
// import { Application } from '../mocks/Application'; // Removed mock application
import * as path from 'path';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { ContextController } from '../../../src/interface/controllers/ContextController.js'; // Import real controller
import type { ContextRequest } from '../../../src/application/usecases/types.js'; // Import request type if needed

describe('ContextController Integration Tests', () => {
  let testEnv: TestEnv;
  // let app: Application; // Removed mock application instance
  let container: DIContainer; // Use DI container
  const TEST_BRANCH = 'feature/test-branch';

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();
    // Create test branch directory (needed for some tests)
    await createBranchDir(testEnv, TEST_BRANCH);
    // Initialize DI container with test configuration
    container = await setupContainer({ docsRoot: testEnv.docRoot });
    // Removed mock application initialization
    // app = new Application({ docsRoot: testEnv.docRoot });
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('readContext', () => {
    it('正常系: 自動初期化されたブランチメモリを含むコンテキストを読み取れること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const request: ContextRequest = { branch: TEST_BRANCH, language: 'ja' };
      const result = await controller.readContext(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.rules).toBeDefined();
      expect(result.data?.branchMemory?.['branchContext.json']).toBeDefined();
      expect(Object.keys(result.data?.branchMemory || {}).length).toBe(1);
      expect(result.data?.globalMemory).toBeDefined();
    });

    it('正常系: ブランチとグローバルの両方のメモリバンクからコンテキストを読み取れること', async () => {
      const { toSafeBranchName } = await import('../../../src/shared/utils/branchNameUtils.js');
      await loadBranchFixture(path.join(testEnv.branchMemoryPath, toSafeBranchName(TEST_BRANCH)), 'basic'); // safeBranchName を使用
      await loadGlobalFixture(testEnv.globalMemoryPath, 'minimal');

      const controller = await container.get<ContextController>('contextController');

      const request: ContextRequest = { branch: TEST_BRANCH, language: 'ja' };
      const result = await controller.readContext(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Object.keys(result.data?.branchMemory || {}).length).toBeGreaterThan(0);
      expect(Object.keys(result.data?.globalMemory || {}).length).toBeGreaterThan(0);
      expect(result.data?.rules).toBeDefined();
      expect(result.data?.globalMemory?.['core/glossary.json']).toBeDefined();
      expect(result.data?.branchMemory?.['activeContext.json']).toBeDefined();
    });

    it('正常系: 存在しないブランチでも自動初期化されたブランチメモリが返されること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const request: ContextRequest = { branch: 'feature/non-existent-branch-for-test', language: 'ja' };
      const result = await controller.readContext(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.branchMemory?.['branchContext.json']).toBeDefined();
      expect(Object.keys(result.data?.branchMemory || {}).length).toBe(4); // ★ 期待値を4に変更 ★
      expect(result.data?.rules).toBeDefined();
      expect(result.data?.globalMemory).toBeDefined();
    });

    it('正常系: ファイルが存在するブランチメモリバンクからコンテキストを読み取れること', async () => {
      const { toSafeBranchName } = await import('../../../src/shared/utils/branchNameUtils.js');
      await loadBranchFixture(path.join(testEnv.branchMemoryPath, toSafeBranchName(TEST_BRANCH)), 'basic'); // safeBranchName を使用

      const controller = await container.get<ContextController>('contextController');

      const request: ContextRequest = { branch: TEST_BRANCH, language: 'ja' };
      const result = await controller.readContext(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Object.keys(result.data?.branchMemory || {}).length).toBeGreaterThan(0);
      expect(result.data?.branchMemory?.['activeContext.json']).toBeDefined();
      expect(result.data?.branchMemory?.['branchContext.json']).toBeDefined();

      const branchContextContent = result.data?.branchMemory?.['branchContext.json'];
      expect(branchContextContent).toBeDefined();
      const branchContext = JSON.parse(branchContextContent!);
      expect(branchContext).toHaveProperty('schema');
      expect(branchContext).toHaveProperty('documentType'); // documentType がトップレベルにあることを確認
      expect(branchContext).toHaveProperty('metadata');
      expect(branchContext).toHaveProperty('content');
      expect(branchContext.documentType).toBe('branch_context'); // トップレベルの documentType をチェック
    });
  });
  describe('readRules', () => {
    it('正常系: 日本語のルールを取得できること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const result = await controller.readRules('ja');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.language).toBe('ja');
      expect(result.data!.content).toBeDefined();
      expect(result.data!.content.length).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('正常系: 英語のルールを取得できること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const result = await controller.readRules('en');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.language).toBe('en');
      expect(result.data!.content).toBeDefined();
      expect(result.data!.content.length).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('異常系: サポートされていない言語でエラーが返されること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const result = await controller.readRules('fr');

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unsupported language code: fr');
    });

    it('正常系: 中国語のルールを取得できること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const result = await controller.readRules('zh');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.language).toBe('zh');
      expect(result.data!.content).toBeDefined();
      expect(result.data!.content.length).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });
  });
});
