#!/usr/bin/env node

// import { promises as fs } from 'fs'; // 未使用のためコメントアウト
// import path from 'path'; // 未使用のためコメントアウト
// import { fileURLToPath } from 'url'; // 未使用のためコメントアウト
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// アプリケーションのインポート
import { createApplication, Application } from './main/index.js';
import { logger } from './shared/utils/logger.js';
import { Language, isValidLanguage } from '@memory-bank/schemas/v2/i18n-schema';
import { setupRoutes } from './main/routes.js'; // routes.ts から setupRoutes 関数をインポート

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
    version: '3.0.0', // package.json のバージョンと合わせる
  },
  {
    capabilities: {
      tools: {}, // ツール機能は有効
      // resources: {} // リソース機能が必要なら追加
    },
  }
);

// サーバーの基本設定
// ここでは、リクエストハンドラの設定は routes.ts に委譲する

// Error handling
server.onerror = (error: unknown) => {
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
        docsRoot: argv.docs,
        verbose: argv.verbose,
        language: safeLanguage,
    });
    logger.info('Application initialized successfully');

    // ルーティングの設定をroutes.tsに委譲
    setupRoutes(server, app);
    logger.info('MCP Server routes configured');

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
