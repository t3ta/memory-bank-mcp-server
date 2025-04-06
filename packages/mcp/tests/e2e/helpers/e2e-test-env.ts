import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import tmp from 'tmp-promise';
import { execSync } from 'child_process';
// --- SDKのクラスを exports フィールドに基づいてインポート (bundler設定で解決されることを期待) ---
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory';
import { Server } from '@modelcontextprotocol/sdk/server';
// -------------------------------------------------
import { logger } from '../../../src/shared/utils/logger.js';
import { toSafeBranchName } from '../../../src/shared/utils/branchNameUtils.js';
// MCPInMemoryClient は次のステップで作成するので、一旦コメントアウト or 仮定義
// import { MCPInMemoryClient } from './MCPInMemoryClient.js';
// --- コントローラーの型をインポート (パス修正、.js削除) ---
import type { BranchController } from '../../../src/interface/controllers/BranchController.js';
import type { GlobalController } from '../../../src/interface/controllers/GlobalController.js';
import type { ContextController } from '../../../src/interface/controllers/ContextController.js';
// --- DIコンテナの型をインポート ---
import type { AwilixContainer } from 'awilix';
// import type { Cradle } from '../../../src/main/di/providers.js'; // Cradleはエクスポートされていないため削除

// --- 既存の TestEnv インターフェース (コピー) ---
export interface TestEnv {
  docRoot: string;
  tempDir: string;
  branchMemoryPath: string;
  globalMemoryPath: string;
  cleanup: () => Promise<void>;
}

// --- 既存の setupTestEnv 関数 (コピー＆調整) ---
// 基本的なファイルシステム環境をセットアップする部分は流用
async function setupBaseTestEnv(): Promise<TestEnv> {
  const tempDirResult = await tmp.dir({ unsafeCleanup: true });
  const tempDir = tempDirResult.path;
  const cleanup = tempDirResult.cleanup;

  const docRoot = path.join(tempDir, 'docs');
  const branchMemoryPath = path.join(docRoot, 'branch-memory-bank');
  const globalMemoryPath = path.join(docRoot, 'global-memory-bank');

  const currentFilePath = fileURLToPath(import.meta.url);
  // パスの階層を調整 (e2e/helpers からなので ../../../../)
  const projectRoot = path.resolve(path.dirname(currentFilePath), '../../../../');
  logger.debug(`[setupBaseTestEnv] Resolved project root: ${projectRoot}`);
  const sourceTemplatesJsonDir = path.join(projectRoot, 'packages/mcp/tests/integration/fixtures/templates/json'); // integrationのfixtureを流用

  const targetTemplatesJsonDir = path.join(docRoot, 'templates/json');

  await fs.ensureDir(docRoot);
  await fs.ensureDir(branchMemoryPath);
  await fs.ensureDir(globalMemoryPath);
  await fs.ensureDir(targetTemplatesJsonDir); // templates/json も作成

  // Create dummy rules files (integration testと同様)
  const dummyRulesContent = JSON.stringify({ schema: "rules_v1", content: "Dummy rule content" }, null, 2);
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules.json'), dummyRulesContent, 'utf-8');
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-ja.json'), dummyRulesContent, 'utf-8');
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-en.json'), dummyRulesContent, 'utf-8');
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-zh.json'), dummyRulesContent, 'utf-8');
  logger.debug(`Created dummy rules files in ${targetTemplatesJsonDir}`);

  // Gitリポジトリ初期化 (integration testと同様)
  try {
    logger.debug(`[setupBaseTestEnv] Initializing Git repository in ${tempDir}...`);
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: tempDir, stdio: 'ignore' });
    logger.debug(`[setupBaseTestEnv] Git repository initialized in ${tempDir}.`);
  } catch (gitError) {
    logger.error('[setupBaseTestEnv] Error initializing Git repository:', gitError);
    await cleanup();
    throw gitError;
  }

  return {
    docRoot,
    tempDir,
    branchMemoryPath,
    globalMemoryPath,
    cleanup
  };
}

// --- E2Eテスト用のセットアップ関数 ---
/**
 * E2Eテスト環境をセットアップする
 * ファイルシステム環境に加え、インメモリのMCPサーバーとクライアントを準備する
 */
export async function setupE2ETestEnv(): Promise<{
  testEnv: TestEnv;
  // client: MCPInMemoryClient; // MCPInMemoryClient 実装後に有効化
  server: Server; // 型を元に戻す
  clientTransport: InMemoryTransport; // 型を元に戻す
  cleanup: () => Promise<void>;
}> {
  // 1. 基本的なファイルシステム環境をセットアップ
  const testEnv = await setupBaseTestEnv();

  // 2. InMemoryTransportのペアを作成
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  // 3. MCPサーバーをインメモリトランスポートで初期化
  const server = new Server(serverTransport, {
    protocolVersion: '2024-11-05', // プロジェクトのバージョンに合わせる
    capabilities: {}, // 必要に応じて機能フラグを設定
    serverInfo: {
      name: 'MemoryBankMCPServer-E2E-Test',
      version: '0.0.1' // テスト用バージョン
    }
  });

  // 4. サーバーツールの登録 (DIコンテナから実際のコントローラーを取得)
  const { setupContainer } = await import('../../../src/main/di/providers.js');
  // --- DIコンテナの型は一旦 any のまま ---
  const container: any = await setupContainer({ docsRoot: testEnv.docRoot });

  // --- 型引数は削除したまま ---
  const branchController = container.resolve('branchController');
  const globalController = container.resolve('globalController');
  const contextController = container.resolve('contextController');

  // 各コントローラーのメソッドをツールとして登録
  // --- params の any を削除 ---
  server.registerTool('read_branch_memory_bank', async (params) => {
    const { branch, path } = params as { branch: string; path: string };
    return branchController.readDocument(branch, path);
  });

  server.registerTool('write_branch_memory_bank', async (params) => {
    const { branch, path, content, patches, tags /*, returnContent */ } = params as {
      branch: string;
      path: string;
      content?: string;
      patches?: any[];
      tags?: string[];
      returnContent?: boolean;
    };
    return branchController.writeDocument({
      branchName: branch,
      path,
      content,
      patches,
      tags,
      // returnContent, // 渡さない
    });
  });

  server.registerTool('read_global_memory_bank', async (params) => {
    const { path } = params as { path: string };
    return globalController.readDocument(path);
  });

  server.registerTool('write_global_memory_bank', async (params) => {
    const { path, content, patches, tags /*, returnContent */ } = params as {
      path: string;
      content?: string;
      patches?: any[];
      tags?: string[];
      returnContent?: boolean;
    };
    return globalController.writeDocument({
      path,
      content,
      patches,
      tags,
      // returnContent, // 渡さない
    });
  });

  server.registerTool('read_context', async (params) => {
    const { branch, language } = params as { branch: string; language: string };
    // --- 引数をオブジェクトに変更していたのを元に戻す ---
    return contextController.readContext(branch, language);
  });

  // --- search_documents_by_tags の登録を修正 ---
  server.registerTool('search_documents_by_tags', async (params) => {
    const { tags, match, scope, branch } = params as {
      tags: string[];
      match?: 'and' | 'or';
      scope?: 'branch' | 'global' | 'all';
      branch?: string;
    };
    // ContextController にメソッドがないため、エラーを返すようにする
    logger.warn('[setupE2ETestEnv] search_documents_by_tags tool registration skipped as ContextController does not have the method.');
    // Jest でテストが失敗するように Promise.reject を返す
    return Promise.reject(new Error('search_documents_by_tags not implemented in ContextController'));
  });


  // 5. トランスポートを開始 (サーバー側)
  await serverTransport.start();
  logger.debug('[setupE2ETestEnv] Server transport started.');

  // 6. MCPクライアントを作成して初期化 (次のステップで実装)
  // const client = new MCPInMemoryClient(clientTransport);
  // await client.initialize();
  // logger.debug('[setupE2ETestEnv] MCPInMemoryClient initialized.');

  // 7. クリーンアップ関数を拡張
  const cleanup = async () => {
    logger.debug('[cleanupE2ETestEnv] Starting cleanup...');
    // await client.close(); // クライアント実装後に有効化
    await serverTransport.close(); // サーバーTransportも閉じる
    await clientTransport.close(); // クライアントTransportも閉じる
    await testEnv.cleanup(); // ベースのファイルシステムクリーンアップ
    logger.debug('[cleanupE2ETestEnv] Cleanup finished.');
  };

  return {
    testEnv,
    // client, // クライアント実装後に有効化
    server,
    clientTransport, // Client側Transportを返す
    cleanup,
  };
}

// --- 既存の createBranchDir 関数 (コピー) ---
export async function createBranchDir(env: TestEnv, branchName: string): Promise<string> {
  const safeBranchName = toSafeBranchName(branchName);
  const branchDir = path.join(env.branchMemoryPath, safeBranchName);
  await fs.ensureDir(branchDir);
  logger.debug(`Created branch directory: ${branchDir}`);
  return branchDir;
}

// --- 既存の cleanupTestEnv は不要になる (setupE2ETestEnv が cleanup を返すため) ---
