import { setupMcpTestEnv } from './helpers/mcp-test-helper.js';
import type { Application } from '../../src/main/Application.js';
import type { MCPTestClient } from '@t3ta/mcp-test';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('MCP E2E Initialization Tests (using mcp-test)', () => {
  let app: Application;
  let client: MCPTestClient;
  let cleanup: () => Promise<void>;
  let testEnv: any;

  beforeEach(async () => {
    const setup = await setupMcpTestEnv();
    app = setup.app;
    client = setup.client;
    cleanup = setup.cleanup;
    testEnv = setup.testEnv;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('application initialization', () => {
    it('should create required directory structure during initialization', async () => {
      // テスト環境は setupMcpTestEnv でセットアップ済み
      // ディレクトリ構造の確認

      // メモリバンクのルートディレクトリが存在すること
      const docsRoot = testEnv.docRoot;
      expect(await fs.pathExists(docsRoot)).toBe(true);

      // ブランチメモリバンクディレクトリが存在すること
      const branchMemoryPath = testEnv.branchMemoryPath;
      expect(await fs.pathExists(branchMemoryPath)).toBe(true);

      // グローバルメモリバンクディレクトリが存在すること
      const globalMemoryPath = testEnv.globalMemoryPath;
      expect(await fs.pathExists(globalMemoryPath)).toBe(true);

      // 翻訳ディレクトリが存在すること
      const translationsDir = path.join(docsRoot, 'translations');
      expect(await fs.pathExists(translationsDir)).toBe(true);

      // テンプレートディレクトリが存在すること
      const templatesDir = path.join(docsRoot, 'templates');
      expect(await fs.pathExists(templatesDir)).toBe(true);
    });

    it('should create necessary rule files during initialization', async () => {
      // ルールファイルの存在確認
      const templatesDir = path.join(testEnv.docRoot, 'templates');

      // 基本ルールファイルの確認
      const rulesPath = path.join(templatesDir, 'rules.json');
      expect(await fs.pathExists(rulesPath)).toBe(true);

      // 言語別ルールファイルの確認
      const languages = ['en', 'ja', 'zh'];
      for (const lang of languages) {
        const langRulesPath = path.join(templatesDir, `rules-${lang}.json`);
        expect(await fs.pathExists(langRulesPath)).toBe(true);

        // ファイルの内容確認（基本的な構造のみ）
        const content = await fs.readJson(langRulesPath);
        expect(content.schema).toBe('template_v1');
        expect(content.metadata).toBeDefined();
        expect(content.metadata.id).toBe(`rules-${lang}`);
      }
    });

    it('should initialize git repository during initialization', async () => {
      // Gitリポジトリの存在確認
      const gitDir = path.join(testEnv.tempDir, '.git');
      expect(await fs.pathExists(gitDir)).toBe(true);
    });
  });
});
