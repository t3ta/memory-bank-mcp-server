#!/usr/bin/env node

// import { promises as fs } from 'fs'; // 未使用のためコメントアウト
// import path from 'path'; // 未使用のためコメントアウト
// import { fileURLToPath } from 'url'; // 未使用のためコメントアウト
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// アプリケーションのインポート (パスを src からの相対パスに修正)
import { createApplication, Application } from './main/index.js';
import { logger } from './shared/utils/logger.js'; // logger もインポート
import { getToolDefinitions } from './tools/definitions.js'; // 関数をインポート
import { Language, isValidLanguage } from '@memory-bank/schemas'; // Language 型とヘルパーをインポート
import type { ContextRequest } from './application/usecases/types.js'; // 正しいパスからインポート
import type { SearchDocumentsByTagsInput } from './application/usecases/common/SearchDocumentsByTagsUseCase.js'; // 正しいパスからインポート
// import { applyPatch } from './tools/patch-utils.js'; // 不要なインポートを削除

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('docs', { // Changed from docsRoot
    alias: 'd',
    type: 'string',
    description: 'Path to the documentation root directory',
    default: './docs',
  })
  .option('verbose', {
    type: 'boolean',
    description: 'Enable verbose logging',
    default: false,
  })
  .option('language', {
    type: 'string',
    description: 'Preferred language (e.g., en, ja)',
    // default は Application 側で設定される想定
  })
  .help()
  .parseSync();

// Logger setup (Application内で設定されるので、ここでは不要かも？一旦残す)
// const logger = {
//   debug: (...args: any[]) => console.error('[DEBUG]', ...args),
//   info: (...args: any[]) => console.error('[INFO]', ...args),
//   error: (...args: any[]) => console.error('[ERROR]', ...args),
// };

// 新しいアプリケーションインスタンス
let app: Application;

// Create a server
const server = new Server(
  {
    name: 'memory-bank-mcp-server',
    version: '2.3.0', // package.json のバージョンと合わせる
  },
  {
    capabilities: {
      tools: {}, // ツール機能は有効
      // resources: {} // リソース機能が必要なら追加
    },
  }
);

// Set up tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => { // 元のスキーマ指定に戻す
  const tools = getToolDefinitions(); // 関数を呼び出してツールリストを取得
  return {
    tools: tools,
  };
});

// Add tool request handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.debug('Tool call received:', { name, args });

  if (!app) {
    logger.error('Application not initialized when tool call received.');
    throw new Error('Application not initialized');
  }
  if (!args || typeof args !== 'object') {
    logger.error('Invalid arguments:', { name, args });
    throw new Error(`No arguments provided for tool: ${name}`);
  }
  const params = args as Record<string, any>;
  logger.debug('Parsed params:', params);

  try {
    let response: any; // コントローラーからのレスポンスを格納する変数

    // ツール名に応じて適切なコントローラーを呼び出す
    switch (name) {
      case 'write_branch_memory_bank':
        // tags は params にあれば渡す (なければ undefined)
        // patches はインターフェースにないので削除
        response = await app.getBranchController().writeDocument({
          branchName: params.branch, // インターフェースに合わせて branchName に
          path: params.path,
          content: params.content,
          tags: params.tags, // tags を追加 (オプション)
          patches: params.patches // patches を追加！
        });
        break;
      case 'read_branch_memory_bank':
        response = await app.getBranchController().readDocument(params.branch, params.path); // これは変更なし
        break;
      case 'write_global_memory_bank':
        // patches はインターフェースにないので削除
        response = await app.getGlobalController().writeDocument({
          path: params.path,
          content: params.content,
          tags: params.tags // tags を追加 (オプション)
        });
        break;
      case 'read_global_memory_bank':
        response = await app.getGlobalController().readDocument(params.path); // これは変更なし
        break;
      case 'read_context':
        // ContextRequest オブジェクトを作成して渡す
        // language は main 関数でチェック済みのものを渡す
        // docs は ContextRequest に不要なので削除
        const contextRequest: ContextRequest = {
          branch: params.branch,
          language: params.language, // main でチェック済みの language を渡す想定
        };
        response = await app.getContextController().readContext(contextRequest);
        break;
      case 'search_documents_by_tags':
         // SearchDocumentsByTagsInput オブジェクトを作成して渡す
         // branch を branchName に修正
         const searchInput: SearchDocumentsByTagsInput = {
           tags: params.tags,
           match: params.match, // 'and' or 'or'
           scope: params.scope, // 'branch', 'global', 'all'
           branchName: params.branch, // branch を branchName に修正
           docs: argv.docs // Changed from docsRoot
         };
         response = await app.getGlobalController().searchDocumentsByTags(searchInput);
         break;
      // 他のツールも同様に修正...
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // コントローラーからのレスポンスをMCP形式に変換して返す
    // (JsonResponsePresenter や MCPResponsePresenter を使うのが理想)
    // TODO: Refactor response handling using presenters
    if (response && response.success && response.data !== undefined) { // data の存在もチェック
       // 成功時のレスポンス形式を調整 (仮)
       if (typeof response.data === 'string') {
           return { content: [{ type: 'text', text: response.data }] };
       } else if (typeof response.data === 'object' && response.data !== null) { // null チェック追加
           // DocumentDTO など、lastModified を持つ可能性のあるオブジェクト
           const meta = (response.data as any).lastModified ? { lastModified: (response.data as any).lastModified } : undefined;
           // content プロパティがあるか、なければ全体をJSON化
           const contentText = (response.data as any).content ?? JSON.stringify(response.data, null, 2);
           return { content: [{ type: 'text', text: contentText }], _meta: meta };
       } else {
           // 文字列でもオブジェクトでもない成功データ (例: boolean)
           return { content: [{ type: 'text', text: String(response.data) }] };
       }
    } else if (response && response.success && response.data === undefined) {
        // データなしの成功レスポンス (例: write操作)
        return { content: [{ type: 'text', text: 'Operation successful' }] };
    } else if (response && !response.success && response.error) {
        // エラーレスポンス
        throw new Error(response.error.message || 'Tool execution failed');
    } else {
        // 予期せぬレスポンス
        logger.warn('Unexpected response from controller:', response);
        return { content: [{ type: 'text', text: 'Operation completed with unexpected result' }] };
    }

  } catch (error: any) {
    logger.error(`Error executing tool ${name}:`, error);
    throw new Error(`Tool execution failed: ${error.message}`);
  }
});

// Error handling
server.onerror = (error) => {
  logger.error('[MCP Server Error]', error);
};

// Process termination handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal, shutting down...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down...');
  await cleanup();
  process.exit(0);
});

// Cleanup function to properly release resources
async function cleanup() {
  logger.info('Cleaning up resources...');
  try {
    // Close the server connection if it's open
    await server.close();
    logger.info('Server connection closed');
    // Release application resources if available
    if (app) {
      // アプリケーションが保持するリソースを解放 (もしあれば)
      // await app.dispose(); // 仮のメソッド
      logger.info('Releasing application resources');
    }
  } catch (error) {
    logger.error('Error during server cleanup:', error);
  }
  // 明示的にGCを促す（Node.jsの場合、通常は不要）
  // if (global.gc) {
  //   logger.info('Forcing garbage collection');
  //   global.gc();
  // }
}

// Main function to initialize and start the server
async function main() {
  try {
    // language を安全に処理
    let safeLanguage: Language | undefined = undefined;
    if (argv.language) {
      if (isValidLanguage(argv.language)) {
        safeLanguage = argv.language;
      } else {
        logger.warn(`Invalid language code "${argv.language}" provided. Defaulting based on application logic or to 'en'.`);
        // デフォルトは Application 側で処理される想定なので undefined のまま渡す
      }
    }

    // Initialize application
    app = await createApplication({
        docsRoot: argv.docs, // Changed from docsRoot
        verbose: argv.verbose,
        language: safeLanguage, // 安全な型を渡す
    });
    logger.info('Application initialized successfully');

    // Connect the server to the Stdio transport
    await server.connect(new StdioServerTransport());
    logger.info('MCP Server connected to stdio transport');
  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Run the main function
main();
