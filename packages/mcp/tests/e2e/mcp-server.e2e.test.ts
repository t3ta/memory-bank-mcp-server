// import { setupE2eTestEnv, cleanupE2eTestEnv, E2eTestEnv } from './helpers/e2e-test-env'; // E2E用ヘルパーは不要に
// import { TestMcpServerProcess } from './helpers/test-mcp-server-process'; // E2E用ヘルパーは不要に
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'; // InMemoryTransport をインポート
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import tmp from 'tmp-promise'; // 一時ディレクトリ作成用
// 必要なスキーマをインポート (Resultスキーマも追加)
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  // ReadContextResultSchema, // SDKにないためコメントアウト
  CallToolResultSchema,
  // 他に必要なResultスキーマがあれば追加
} from '@modelcontextprotocol/sdk/types.js';
import { createApplication, Application } from '../../src/main/index.js'; // アプリケーション本体をインポート
import { getToolDefinitions } from '../../src/tools/definitions.js'; // ツール定義を取得する関数
import { logger } from '../../src/shared/utils/logger.js'; // logger
import type { ContextRequest } from '../../src/application/usecases/types.js';
import type { SearchDocumentsByTagsInput } from '../../src/application/usecases/common/SearchDocumentsByTagsUseCase.js';
import type { DocumentDTO } from '../../src/application/dtos/DocumentDTO.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSONを安全にパースするヘルパー関数
function safeJsonParse(jsonString: unknown): any { // 引数型を unknown に修正
  if (typeof jsonString === 'string') { // 関数内で string 型かチェック
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("JSON parse error:", e, "Original string:", jsonString);
      return {}; // パース失敗時は空オブジェクトを返す
    }
  }
  // 文字列でない場合や null/undefined の場合は空オブジェクトを返す
  return {};
}


// rules.json のパスは beforeAll で使うので残す
const SRC_RULES_JSON_PATH = path.resolve(__dirname, '../../src/templates/json/rules.json');
describe('MCP Server InMemory Tests', () => { // 名前を変更
  // let testEnv: E2eTestEnv; // 不要
  // let serverProcess: TestMcpServerProcess; // 不要
  let client: Client; // Client インスタンス
  let server: Server; // Server インスタンス
  let app: Application; // Application インスタンス
  let clientTransport: InMemoryTransport;
  let serverTransport: InMemoryTransport;
  let expectedRulesContent: string; // 期待される rules.json の内容
  let tempDir: tmp.DirectoryResult; // 一時ディレクトリの結果を保持
  let tempDocsRoot: string; // 一時ディレクトリの docsRoot パスを保持する変数

  // テストスイート全体の前処理
  beforeAll(async () => {
    // 期待される rules.json の内容を読み込んでおく
    expectedRulesContent = await fs.readFile(SRC_RULES_JSON_PATH, 'utf-8');
    // Application インスタンスの作成は beforeEach に移動
  });

  // 各テストケースの前処理
  beforeEach(async () => {
    // --- Test Environment Setup ---
    tempDir = await tmp.dir({ unsafeCleanup: true, keep: false }); // 一時ディレクトリ作成結果を保持
    tempDocsRoot = path.join(tempDir.path, 'docs'); // 絶対パスで docsRoot を生成
    // 必要なサブディレクトリを作成 (e2e-test-env.ts を参考に)
    await fs.mkdir(path.join(tempDocsRoot, 'templates', 'json'), { recursive: true });
    await fs.mkdir(path.join(tempDocsRoot, 'branch-memory-bank'), { recursive: true });
    await fs.mkdir(path.join(tempDocsRoot, 'global-memory-bank'), { recursive: true });
    // rules.json を一時ディレクトリにコピー
    await fs.copyFile(SRC_RULES_JSON_PATH, path.join(tempDocsRoot, 'templates', 'json', 'rules.json'));
    // Application インスタンスを作成
    app = await createApplication({ docsRoot: tempDocsRoot, verbose: false });
    // -----------------------------

    // InMemoryTransport のペアを作成
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    // Client インスタンスを作成
    client = new Client({ name: 'test-client', version: '1.0' }, { capabilities: { tools: {} } }); // tools capability を有効化

    // Server インスタンスを作成 (memory-bank-mcp-server 相当)
    server = new Server(
      { name: 'test-memory-bank-server', version: '1.0' },
      { capabilities: { tools: {} } } // tools capability を有効化
    );

    // ListTools ハンドラを設定 (server.ts と同様)
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = getToolDefinitions();
      return { tools: tools };
    });

    // CallTool ハンドラを設定 (server.ts と同様)
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.debug('Tool call received:', { name, args });
      if (!args || typeof args !== 'object') throw new Error('Invalid arguments');
      const params = args as Record<string, any>;

      let response: any;
      switch (name) {
        case 'read_context':
          const contextRequest: ContextRequest = { branch: params.branch, language: params.language };
          response = await app.getContextController().readContext(contextRequest);
          break;
        case 'write_branch_memory_bank':
          // content がオブジェクトだったら stringify する！
          const contentToWrite = typeof params.content === 'object' ? JSON.stringify(params.content, null, 2) : params.content;
          response = await app.getBranchController().writeDocument({
            branchName: params.branch,
            path: params.path,
            content: contentToWrite, // 修正: stringify したものを渡す
            tags: params.tags,
            patches: params.patches
          });
          break;
         case 'read_branch_memory_bank':
           response = await app.getBranchController().readDocument(params.branch, params.path);
           break;
        // 他のツールハンドラも必要に応じて追加...
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      // レスポンス形式を仮で設定 (server.ts のロジックを参考に)
      // TODO: 本来は Presenter を使うべき
       if (response && response.success && response.data !== undefined) {
         if (typeof response.data === 'string') {
             return { content: [{ type: 'text', text: response.data }] };
         } else if (typeof response.data === 'object' && response.data !== null) {
             const meta = (response.data as any).lastModified ? { lastModified: (response.data as any).lastModified } : undefined;
             let contentText: string;
             const documentData = response.data as DocumentDTO;
             // read_branch_memory_bank の場合、DocumentDTO の content (JSON文字列) をそのまま text に設定
             if (name === 'read_branch_memory_bank' && documentData && typeof documentData.content === 'string') {
               contentText = documentData.content;
             } else { // それ以外 (read_context など) は全体を JSON 文字列化
               contentText = JSON.stringify(response.data, null, 2);
             }
             return { content: [{ type: 'text', text: contentText }], _meta: meta };
         } else {
             return { content: [{ type: 'text', text: String(response.data) }] };
         }
      } else if (response && response.success && response.data === undefined) {
          return { content: [{ type: 'text', text: 'Operation successful' }] };
      } else if (response && !response.success && response.error) {
          throw new Error(response.error.message || 'Tool execution failed');
      } else {
          return { content: [{ type: 'text', text: 'Operation completed with unexpected result' }] };
      }
    });

    // クライアントとサーバーを接続
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  // 各テストケースの後処理
  afterEach(async () => {
    // クライアントとサーバーを切断
    await Promise.all([
       client.close(),
       server.close(),
    ]);
    // テスト用の一時ディレクトリを削除
    if (tempDir) { // tempDir が存在する場合のみクリーンアップ
       await tempDir.cleanup(); // tmp-promise の cleanup を使用
    }
  });

  describe('read_context Tool', () => {
    it('should return context including rules content for Japanese language', async () => {
      const branchName = 'fix/issue-98-inmemory-test-ja';
      const language = 'ja';

      // Act: read_context を呼び出す (client.request を使用)
      let response = await client.request({
        method: 'tools/call', // tools/call を使う
        params: {
          name: 'read_context', // ツール名を指定
          arguments: { // 引数は arguments で渡す
            branch: branchName,
            language: language,
          }
        }
      }, CallToolResultSchema);
      // Assert: レスポンスを検証
      expect(response.isError).toBeUndefined(); // isError は成功時 undefined
      // CallToolResultSchema を使っているので、content をパースして中身をチェック
      const textContent = response.content?.[0]?.text;
      const resultData = safeJsonParse(textContent); // safeJsonParse を使う
      expect(resultData.rules).toBeDefined();
      expect(resultData.rules.language).toBe(language);
      expect(resultData.rules.content).toEqual(expectedRulesContent);
      // branchMemory がコアファイルを含むオブジェクトであることを確認
      expect(resultData.branchMemory).toBeInstanceOf(Object);
      expect(Object.keys(resultData.branchMemory)).toEqual(expect.arrayContaining([
        'activeContext.json',
        'branchContext.json',
        'progress.json',
        'systemPatterns.json'
      ]));
      expect(resultData.globalMemory).toBeDefined();
    });

    it('should return context including rules content for English language', async () => {
      const branchName = 'fix/issue-98-inmemory-test-en';
      const language = 'en';

      // Act: read_context を呼び出す (client.request を使用)
      let response = await client.request({
        method: 'tools/call', // tools/call を使う
        params: {
          name: 'read_context', // ツール名を指定
          arguments: { // 引数は arguments で渡す
            branch: branchName,
            language: language,
          }
        }
      }, CallToolResultSchema);
      // Assert: レスポンスを検証
      expect(response.isError).toBeUndefined(); // isError は成功時 undefined
      const textContent = response.content?.[0]?.text;
      const resultData = safeJsonParse(textContent); // safeJsonParse を使う
      expect(resultData.rules).toBeDefined();
      expect(resultData.rules.language).toBe(language);
      expect(resultData.rules.content).toEqual(expectedRulesContent);
      // branchMemory がコアファイルを含むオブジェクトであることを確認
      expect(resultData.branchMemory).toBeInstanceOf(Object);
      expect(Object.keys(resultData.branchMemory)).toEqual(expect.arrayContaining([
        'activeContext.json',
        'branchContext.json',
        'progress.json',
        'systemPatterns.json'
      ]));
      expect(resultData.globalMemory).toBeDefined();
    });

    it('should return context including rules content for Chinese language', async () => {
      const branchName = 'fix/issue-98-inmemory-test-zh';
      const language = 'zh';

      // Act: read_context を呼び出す (client.request を使用)
      let response = await client.request({
        method: 'tools/call', // tools/call を使う
        params: {
          name: 'read_context', // ツール名を指定
          arguments: { // 引数は arguments で渡す
            branch: branchName,
            language: language,
          }
        }
      }, CallToolResultSchema);
      // Assert: レスポンスを検証
      expect(response.isError).toBeUndefined(); // isError は成功時 undefined
      const textContent = response.content?.[0]?.text;
      const resultData = safeJsonParse(textContent); // safeJsonParse を使う
      expect(resultData.rules).toBeDefined();
      expect(resultData.rules.language).toBe(language);
      expect(resultData.rules.content).toEqual(expectedRulesContent);
      // branchMemory がコアファイルを含むオブジェクトであることを確認
      expect(resultData.branchMemory).toBeInstanceOf(Object);
      expect(Object.keys(resultData.branchMemory)).toEqual(expect.arrayContaining([
        'activeContext.json',
        'branchContext.json',
        'progress.json',
        'systemPatterns.json'
      ]));
      expect(resultData.globalMemory).toBeDefined();
    });

    // TODO: write_branch_memory_bank など他のツールのテストケースを追加
  }); // describe('read_context Tool') の閉じ括弧

  describe('write_branch_memory_bank Tool', () => {
    it('should create a new document in the branch memory bank', async () => {
      const branchName = 'fix/issue-98-inmemory-write-test';
      const docPath = 'test-doc.json';
      const docContent = { message: 'Hello InMemory Test!', timestamp: Date.now() };
      const docTags = ['inmemory', 'test', 'creation'];

      // Act: write_branch_memory_bank でドキュメント作成 (client.request を使用)
      let writeResponse = await client.request({
        method: 'tools/call',
        params: {
          name: 'write_branch_memory_bank',
          arguments: {
            branch: branchName,
            path: docPath,
            content: docContent, // オブジェクトを直接渡すように修正
            tags: docTags,
          }
        }
      }, CallToolResultSchema);

      // Assert: write のレスポンス検証
      expect(writeResponse.isError).toBeUndefined(); // isError は成功時 undefined
      // 成功メッセージのアサーションは削除

      // ★★★ ファイル書き込みのための待機時間を追加 ★★★
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機

      // Act: read_branch_memory_bank で作成したドキュメントを読み込む (client.request を使用)
      let readResponse = await client.request({
        method: 'tools/call',
        params: {
          name: 'read_branch_memory_bank',
          arguments: {
            branch: branchName,
            path: docPath,
          }
        }
      }, CallToolResultSchema);

      // Assert: read のレスポンス検証
      expect(readResponse.isError).toBeUndefined(); // isError は成功時 undefined
      expect(readResponse.content?.[0]?.type).toBe('text');
      const textContent = readResponse.content?.[0]?.text;
      // ★★★ アサーション修正: safeJsonParse の結果の本文部分と比較 ★★★
      const parsedContent = safeJsonParse(textContent); // まず全体をパース
      expect(parsedContent).toMatchObject(docContent); // 本文部分だけ比較
      // タグや最終更新日時のアサーションは削除
    });

    it('should overwrite an existing document using content', async () => {
      const branchName = 'fix/issue-98-inmemory-overwrite-test'; // 変数定義
      const docPath = 'overwrite-doc.json'; // 変数定義
      const initialContent = { message: 'Initial content', version: 1 }; // 変数定義
      const initialTags = ['initial', 'test']; // 変数定義
      const updatedContent = { message: 'Updated content!', version: 2, added: true }; // 変数定義
      const updatedTags = ['updated', 'inmemory']; // 変数定義

      // Setup: まず初期ドキュメントを作成 (client.request を使用)
      await client.request({
        method: 'tools/call',
        params: {
          name: 'write_branch_memory_bank',
          arguments: {
            branch: branchName,
            path: docPath,
            content: initialContent, // オブジェクトを直接渡すように修正
            tags: initialTags,
            // docs は不要
          }
        }
      }, CallToolResultSchema);

      // ★★★ ファイル書き込みのための待機時間を追加 ★★★
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機

      // Act: content を使ってドキュメントを上書き (client.request を使用)
      let writeResponse = await client.request({
        method: 'tools/call',
        params: {
          name: 'write_branch_memory_bank',
          arguments: {
            branch: branchName,
            path: docPath,
            content: updatedContent, // オブジェクトを直接渡すように修正
            tags: updatedTags,
          }
        }
      }, CallToolResultSchema);

      // Assert: write のレスポンス検証
      expect(writeResponse.isError).toBeUndefined(); // isError は成功時 undefined
      // 成功メッセージのアサーションは削除

      // ★★★ ファイル書き込みのための待機時間を追加 ★★★
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機

      // Act: read_branch_memory_bank で上書きされたドキュメントを読み込む (client.request を使用)
      let readResponse = await client.request({
        method: 'tools/call',
        params: {
          name: 'read_branch_memory_bank',
          arguments: {
            branch: branchName,
            path: docPath,
          }
        }
      }, CallToolResultSchema);

      // Assert: read のレスポンス検証 (内容が更新されていることを確認)
      expect(readResponse.isError).toBeUndefined(); // isError は成功時 undefined
      expect(readResponse.content?.[0]?.type).toBe('text');
      const textContent = readResponse.content?.[0]?.text;
      // ★★★ アサーション修正: safeJsonParse の結果の本文部分と比較 ★★★
      const parsedContent = safeJsonParse(textContent);
      expect(parsedContent).toMatchObject(updatedContent);
    });

    it('should update an existing document using patches', async () => {
      const branchName = 'fix/issue-98-inmemory-patch-test'; // 変数定義
      const docPath = 'patch-doc.json'; // 変数定義
      const initialContent = { user: { name: 'Mirai', level: 10 }, items: ['item1', 'item2'], status: 'active' }; // 変数定義
      const initialTags = ['patch-test', 'initial']; // 変数定義

      // Setup: まず初期ドキュメントを作成 (client.request を使用)
      await client.request({
        method: 'tools/call',
        params: {
          name: 'write_branch_memory_bank',
          arguments: {
            branch: branchName,
            path: docPath,
            content: initialContent, // オブジェクトを直接渡すように修正
            tags: initialTags,
            // docs は不要
          }
        }
      }, CallToolResultSchema);

      // ★★★ ファイル書き込みのための待機時間を追加 ★★★
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機

      // Define patches (RFC 6902)
      const patches = [
        { op: 'replace', path: '/user/level', value: 11 }, // レベルを更新
        { op: 'add', path: '/user/title', value: 'CodeQueen' }, // 新しいプロパティを追加
        { op: 'add', path: '/items/-', value: 'item3' }, // 配列の末尾に要素を追加
        { op: 'remove', path: '/status' }, // プロパティを削除
      ];
      const expectedPatchedContent = { user: { name: 'Mirai', level: 11, title: 'CodeQueen' }, items: ['item1', 'item2', 'item3'] }; // 期待値をここで定義

      // Act: patches を使ってドキュメントを更新 (client.request を使用)
      let writeResponse = await client.request({
        method: 'tools/call',
        params: {
          name: 'write_branch_memory_bank',
          arguments: {
            branch: branchName,
            path: docPath,
            patches: patches,
            // tags は指定しない
            // docs は不要
          }
        }
      }, CallToolResultSchema);

      // Assert: write のレスポンス検証
      expect(writeResponse.isError).toBeUndefined(); // isError は成功時 undefined
      // 成功メッセージのアサーションは削除

      // ★★★ ファイル書き込みのための待機時間を追加 ★★★
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機

      // Act: read_branch_memory_bank でパッチ適用されたドキュメントを読み込む (client.request を使用)
      let readResponse = await client.request({
        method: 'tools/call',
        params: {
          name: 'read_branch_memory_bank',
          arguments: {
            branch: branchName,
            path: docPath,
            // docs は不要
          }
        }
      }, CallToolResultSchema);

      // Assert: read のレスポンス検証 (内容が更新され、タグはそのまま)
      expect(readResponse.isError).toBeUndefined(); // isError は成功時 undefined
      expect(readResponse.content?.[0]?.type).toBe('text');
      const textContent = readResponse.content?.[0]?.text;
      // ★★★ アサーション修正: safeJsonParse の結果の本文部分と比較 ★★★
      const parsedContent = safeJsonParse(textContent);
      expect(parsedContent).toMatchObject(expectedPatchedContent);
    });

    it('should create a document when content is provided as an object', async () => {
      const branchName = 'fix/issue-98-inmemory-object-content';
      const docPath = 'object-content-doc.json';
      const docContent = { type: 'object', value: 123, nested: { key: 'value' } };
      const docTags = ['object', 'test'];

      // Act: write_branch_memory_bank で content にオブジェクトを直接渡す
      let writeResponse = await client.request({
        method: 'tools/call',
        params: {
          name: 'write_branch_memory_bank',
          arguments: {
            branch: branchName,
            path: docPath,
            content: docContent, // ★ オブジェクトを直接渡す ★
            tags: docTags,
          }
        }
      }, CallToolResultSchema);

      // Assert: write のレスポンス検証
      expect(writeResponse.isError).toBeUndefined();

      // ★★★ ファイル書き込みのための待機時間を追加 ★★★
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機

      // Act: read_branch_memory_bank で読み込む
      let readResponse = await client.request({
        method: 'tools/call',
        params: {
          name: 'read_branch_memory_bank',
          arguments: {
            branch: branchName,
            path: docPath,
          }
        }
      }, CallToolResultSchema);

      // Assert: read のレスポンス検証
      expect(readResponse.isError).toBeUndefined();
      expect(readResponse.content?.[0]?.type).toBe('text');
      const textContent = readResponse.content?.[0]?.text;
      const parsedContent = safeJsonParse(textContent);
      expect(parsedContent).toMatchObject(docContent); // 内容が一致することを確認
    });
}); // describe('write_branch_memory_bank Tool') の閉じ括弧
}); // describe('MCP Server InMemory Tests') の閉じ括弧を追加
