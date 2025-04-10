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
import type { DocumentDTO } from './application/dtos/DocumentDTO.js'; // DocumentDTO をインポート
import type { MCPResponse } from './interface/presenters/types/MCPResponse.js'; // MCPResponse をインポート
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
  const params = args as Record<string, unknown>;
  logger.debug('Parsed params:', params);

  try {
    let response: MCPResponse; // コントローラーからのレスポンスを格納する変数

    // ツール名に応じて適切なコントローラーを呼び出す
    switch (name) {
      case 'write_branch_memory_bank':
        // tags は params にあれば渡す (なければ undefined)
        // patches はインターフェースにないので削除
        response = await app.getBranchController().writeDocument({
          branchName: params.branch as string, // 型を明示的に指定
          path: params.path as string, // 型を明示的に指定
          content: params.content as any, // IBranchController では any とされているのでそれに合わせる
          tags: params.tags as string[] | undefined, // 型を明示的に指定
          patches: params.patches as Record<string, unknown>[] | undefined // 型を明示的に指定
        });
        break;
      case 'read_branch_memory_bank':
        response = await app.getBranchController().readDocument(
          params.branch as string, 
          params.path as string
        ); // パラメータの型を明示的に指定
        break;
      case 'write_global_memory_bank':
        // patches はインターフェースにないので削除
        response = await app.getGlobalController().writeDocument({
          path: params.path as string, // 型を明示的に指定
          content: params.content as string, // 型を明示的に指定（文字列のみ）
          tags: params.tags as string[] | undefined // 型を明示的に指定
        });
        break;
      case 'read_global_memory_bank':
        response = await app.getGlobalController().readDocument(params.path as string); // 型を明示的に指定
        break;
      case 'read_context': {
        // ContextRequest オブジェクトを作成して渡す
        // language は main 関数でチェック済みのものを渡す
        // docs は ContextRequest に不要なので削除
        const contextRequest: ContextRequest = {
          branch: params.branch as string, // 型を明示的に指定
          language: params.language as string, // 型を明示的に指定
        };
        // 戻り値の型が MCPResponse と互換性を持つように適切な型変換が必要
        response = await app.getContextController().readContext(contextRequest) as MCPResponse;
        break;
      }
      case 'search_documents_by_tags': {
         // SearchDocumentsByTagsInput オブジェクトを作成して渡す
         // branch を branchName に修正
         const searchInput: SearchDocumentsByTagsInput = {
           tags: params.tags as string[], // 型を明示的に指定
           match: params.match as 'and' | 'or' | undefined, // 型を明示的に指定
           scope: params.scope as 'branch' | 'global' | 'all' | undefined, // 型を明示的に指定
           branchName: params.branch as string, // 型を明示的に指定
           docs: argv.docs // Changed from docsRoot
         };
         response = await app.getGlobalController().searchDocumentsByTags(searchInput);
         break;
      }
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
           const meta = (response.data as Record<string, unknown>).lastModified ? 
             { lastModified: (response.data as Record<string, unknown>).lastModified } 
             : undefined;
           // content プロパティがあるか、なければ全体をJSON化
           let contentText: string;
           const documentData = response.data as DocumentDTO; // 型アサーション

           // read_branch_memory_bank または read_global_memory_bank の場合のみJSONパースを試みる
           if ((name === 'read_branch_memory_bank' || name === 'read_global_memory_bank') &&
               documentData && typeof documentData.path === 'string' && documentData.path.endsWith('.json') && typeof documentData.content === 'string') {
             try {
               // JSON 文字列をパースしてオブジェクトにする
               const parsedContent = JSON.parse(documentData.content);
               // MCPレスポンスとしては整形されたJSON文字列を返す
               contentText = JSON.stringify(parsedContent, null, 2);
               logger.debug(`[Server] Parsed JSON content for response: ${documentData.path}`);
             } catch (e) {
               logger.warn('[Server] Failed to parse JSON content in response handling, returning raw string.', { path: documentData.path, error: e });
               contentText = documentData.content; // パース失敗時は元の文字列
             }
           } else if (documentData && typeof documentData.content === 'string') {
             // JSON以外、または content が文字列の場合
             contentText = documentData.content;
           } else {
             // contentがない、または文字列でない場合、全体をJSON化
             contentText = JSON.stringify(response.data, null, 2);
           }
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

  } catch (error: unknown) {
    logger.error(`Error executing tool ${name}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Tool execution failed: ${errorMessage}`);
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
