/**
 * Integration tests for ContextController
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { loadBranchFixture, loadGlobalFixture } from '../helpers/fixtures-loader.js';
import * as path from 'path';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js';
import { ContextController } from '../../../src/interface/controllers/ContextController.js';
import type { ContextRequest } from '../../../src/application/usecases/types.js';

describe('ContextController Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer;
  const TEST_BRANCH = 'feature/test-branch';

  beforeEach(async () => {
    testEnv = await setupTestEnv();
    container = await setupContainer({ docsRoot: testEnv.docRoot });
    const { logger } = await import('../../../src/shared/utils/logger.js');
    logger.setLevel('debug');
  });

  afterEach(async () => {
    await cleanupTestEnv(testEnv);
  });

  describe('readContext', () => {
    it.skip('正常系: 自動初期化されたブランチメモリを含むコンテキストを読み取れること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const request: ContextRequest = { branch: TEST_BRANCH, language: 'ja' };
      const result = await controller.readContext(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.rules).toBeDefined();
      expect(result.data?.branchMemory?.coreFiles?.['branchContext.json']).toBeDefined();
      expect(result.data?.branchMemory?.availableFiles).toHaveLength(4);
      expect(result.data?.globalMemory).toBeDefined();
    });

    it.skip('正常系: ブランチとグローバルの両方のメモリバンクからコンテキストを読み取れること', async () => {
      const { toSafeBranchName } = await import('../../../src/shared/utils/branchNameUtils.js');
      await loadBranchFixture(path.join(testEnv.branchMemoryPath, toSafeBranchName(TEST_BRANCH)), 'basic');
      await loadGlobalFixture(testEnv.globalMemoryPath, 'minimal');

      const controller = await container.get<ContextController>('contextController');

      const request: ContextRequest = { branch: TEST_BRANCH, language: 'ja' };
      const result = await controller.readContext(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Object.keys(result.data?.branchMemory?.coreFiles || {}).length).toBeGreaterThan(0);
      expect(Object.keys(result.data?.globalMemory?.coreFiles || {}).length).toBeGreaterThan(0);
      expect(result.data?.rules).toBeDefined();
      expect(result.data?.globalMemory?.coreFiles?.['core/glossary.json']).toBeDefined();
      expect(result.data?.branchMemory?.coreFiles?.['activeContext.json']).toBeDefined();
    });

    // ブランチ名自動検出のテスト（プロジェクトモード）
    it.skip('プロジェクトモードではブランチ名が省略できること', async () => {
      // GitServiceをモックして実際のブランチ検出をテスト
      const originalConfig = process.env.MEMORY_BANK_PROJECT_MODE;
      process.env.MEMORY_BANK_PROJECT_MODE = 'true';

      try {
        // コンテナを再作成（プロジェクトモード設定を反映するため）
        container = await setupContainer({ docsRoot: testEnv.docRoot });
        const controller = await container.get<ContextController>('contextController');

        // GitServiceにモックブランチ名をセット
        const gitService = await container.get('gitService');
        const originalGetCurrentBranch = gitService.getCurrentBranchName;
        gitService.getCurrentBranchName = async () => TEST_BRANCH;

        try {
          // ブランチ名省略のリクエスト
          const request: ContextRequest = { language: 'ja' };
          const result = await controller.readContext(request);

          // 自動検出で正しく動作していることを確認
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();
          expect(result.data?.branchMemory).toBeDefined();

          // 自動検出されたブランチが使われたことを検証
          expect(gitService.getCurrentBranchName).toHaveBeenCalled();

        } finally {
          // GitServiceを元に戻す
          gitService.getCurrentBranchName = originalGetCurrentBranch;
        }
      } finally {
        // 環境変数を元に戻す
        if (originalConfig) {
          process.env.MEMORY_BANK_PROJECT_MODE = originalConfig;
        } else {
          delete process.env.MEMORY_BANK_PROJECT_MODE;
        }
      }
    });

    // 言語設定の環境変数からの取得テスト
    it.skip('環境変数で言語が設定されている場合はリクエストパラメータが省略できること', async () => {
      const originalLang = process.env.LANGUAGE;
      process.env.LANGUAGE = 'ja';

      try {
        // コンテナを再作成（言語設定を反映するため）
        container = await setupContainer({ docsRoot: testEnv.docRoot });
        const controller = await container.get<ContextController>('contextController');

        // 言語パラメータ省略のリクエスト
        const request: ContextRequest = { branch: TEST_BRANCH };
        const result = await controller.readContext(request);

        // 環境変数の言語が使われて正しく動作していることを確認
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.rules).toBeDefined();
        expect(result.data?.rules?.language).toBe('ja');

      } finally {
        // 環境変数を元に戻す
        if (originalLang) {
          process.env.LANGUAGE = originalLang;
        } else {
          delete process.env.LANGUAGE;
        }
      }
    });
  });

  describe('readRules', () => {
    it('サポートされていない言語でエラーが返されること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const result = await controller.readRules('fr');
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toBe('An error occurred');
    });

    // 以下のテストをスキップ - テスト環境の修正は別チケットで対応
    it.skip('日本語のルールを取得できること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const result = await controller.readRules('ja');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.language).toBe('ja');
      expect(result.data!.content).toBeDefined();
      expect(typeof result.data!.content).toBe('object');
      expect(result.data!.content).toHaveProperty('id', 'rules');
      expect(result.error).toBeUndefined();
    });

    it.skip('英語のルールを取得できること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const result = await controller.readRules('en');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.language).toBe('en');
      expect(result.data!.content).toBeDefined();
      expect(typeof result.data!.content).toBe('object');
      expect(result.data!.content).toHaveProperty('id', 'rules');
      expect(result.error).toBeUndefined();
    });

    it.skip('中国語のルールを取得できること', async () => {
      const controller = await container.get<ContextController>('contextController');

      const result = await controller.readRules('zh');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.language).toBe('zh');
      expect(result.data!.content).toBeDefined();
      expect(typeof result.data!.content).toBe('object');
      expect(result.data!.content).toHaveProperty('id', 'rules');
      expect(result.error).toBeUndefined();
    });
  });
});
