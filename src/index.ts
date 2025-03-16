#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Language, BRANCH_CORE_FILES, GLOBAL_CORE_FILES } from './shared/types/index.js';
import { MemoryBankError } from './errors/MemoryBankError.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// 新しいインポート
import createApplication from './main/index.js';
import { Application } from './main/index.js';
import { CoreFilesDTO } from './application/dtos/CoreFilesDTO.js';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('docs', {
    alias: 'd',
    type: 'string',
    description: 'Path to docs directory',
    default: './docs'
  })
  .help()
  .parseSync();

// Logger setup
const logger = {
  debug: (...args: any[]) => console.error('[DEBUG]', ...args),
  info: (...args: any[]) => console.error('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args)
};

// 新しいアプリケーションインスタンス
let app: Application | null;

// Available tools definition
const AVAILABLE_TOOLS = [
  {
    name: "create_pull_request",
    description: "Creates a pull request based on branch memory bank information",
    inputSchema: {
      type: "object",
      properties: {
        branch: {
          type: "string",
          description: "Branch name"
        },
        title: {
          type: "string",
          description: "Custom PR title (optional)"
        },
        base: {
          type: "string",
          description: "Target branch for the PR (default: develop for feature branches, master for fix branches)"
        },
        language: {
          type: "string",
          enum: ["en", "ja"],
          description: "Language for PR (en or ja)"
        },
        push: {
          type: "boolean",
          description: "Whether to automatically push the changes"
        }
      },
      required: ["branch"]
    }
  },
  {
    name: "list_tools",
    description: "List all available tools",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "write_branch_memory_bank",
    description: "Write a document to the current branch's memory bank",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
        branch: {
          type: "string",
          description: "Branch name"
        }
      },
      required: ["path"]
    }
  },
  {
    name: "read_branch_memory_bank",
    description: "Read a document from the current branch's memory bank",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        branch: {
          type: "string",
          description: "Branch name"
        }
      },
      required: ["path"]
    }
  },
  {
    name: "write_global_memory_bank",
    description: "Write a document to the global memory bank",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" }
      },
      required: ["path"]
    }
  },
  {
    name: "read_global_memory_bank",
    description: "Read a document from the global memory bank",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      required: ["path"]
    }
  },
  {
    name: "read_branch_core_files",
    description: "Read all core files from the branch memory bank",
    inputSchema: {
      type: "object",
      properties: {
        branch: {
          type: "string",
          description: "Branch name"
        }
      },
      required: ["branch"]
    }
  },
  {
    name: "write_branch_core_files",
    description: "Write multiple core files at once",
    inputSchema: {
      type: "object",
      properties: {
        branch: {
          type: "string",
          description: "Branch name"
        },
        files: {
          type: "object",
          properties: {
            activeContext: {
              type: "object",
              properties: {
                currentWork: { type: "string" },
                recentChanges: { type: "array", items: { type: "string" } },
                activeDecisions: { type: "array", items: { type: "string" } },
                considerations: { type: "array", items: { type: "string" } },
                nextSteps: { type: "array", items: { type: "string" } }
              }
            },
            progress: {
              type: "object",
              properties: {
                workingFeatures: { type: "array", items: { type: "string" } },
                pendingImplementation: { type: "array", items: { type: "string" } },
                status: { type: "string" },
                knownIssues: { type: "array", items: { type: "string" } }
              }
            },
            systemPatterns: {
              type: "object",
              properties: {
                technicalDecisions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      context: { type: "string" },
                      decision: { type: "string" },
                      consequences: { type: "array", items: { type: "string" } }
                    },
                    required: ["title", "context", "decision", "consequences"]
                  }
                }
              }
            }
          }
        }
      },
      required: ["branch", "files"]
    }
  },
  {
    name: "read_global_core_files",
    description: "Read all core files from the global memory bank",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "read_rules",
    description: "Read the memory bank rules in specified language",
    inputSchema: {
      type: "object",
      properties: {
        language: {
          type: "string",
          enum: ["en", "ja"],
          description: "Language code (en or ja)"
        }
      },
      required: ["language"]
    }
  },
  {
    name: "get_recent_branches",
    description: "Get recently updated branch memory banks",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of branches to return (default: 10, max: 100)",
          minimum: 1,
          maximum: 100
        }
      }
    }
  }
];

// Create a server
const server = new Server(
  {
    name: "memory-bank-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Set up tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: AVAILABLE_TOOLS
  };
});

// Add tool request handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.debug('Tool call received:', { name, args });

  if (!args || typeof args !== 'object') {
    logger.error('Invalid arguments:', { name, args });
    throw new Error(`No arguments provided for tool: ${name}`);
  }

  const params = args as Record<string, unknown>;
  logger.debug('Parsed params:', params);

  switch (name) {
    case "list_tools": {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(AVAILABLE_TOOLS, null, 2)
          }
        ]
      };
    }

    case "write_branch_memory_bank": {
      const path = params.path as string;
      const content = params.content as string | undefined;
      const branch = (params.branch as string);

      if (!path) {
        throw new Error('Invalid arguments for write_branch_memory_bank');
      }

      if (!content) {
        return { content: [{ type: "text", text: "Branch memory bank initialized successfully" }] };
      }

      if (!app) {
        throw new Error('Application not initialized');
      }
      await app.getBranchController().writeDocument(branch, path, content);
      return { content: [{ type: "text", text: "Document written successfully" }] };
    }

    case "read_branch_memory_bank": {
      const path = params.path as string;
      const branch = (params.branch as string);

      if (!path) {
        throw new Error('Invalid arguments for read_branch_memory_bank');
      }

      if (!app) {
        throw new Error('Application not initialized');
      }
      const response = await app.getBranchController().readDocument(branch, path);
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return {
        content: [{ type: "text", text: response.data?.content || '' }],
        _meta: { lastModified: response.data?.lastModified || new Date().toISOString() }
      };
    }

    case "read_rules": {
      const language = params.language as string;

      if (!language || !["en", "ja"].includes(language)) {
        throw new Error('Invalid arguments for read_rules');
      }

      const validLanguage = language as Language;

      const dirname = path.dirname(fileURLToPath(import.meta.url));
      const filePath = path.join(dirname, 'templates', `rules-${language}.md`);
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        content: [{ type: "text", text: content }],
        _meta: { lastModified: new Date().toISOString() }
      };
    }

    case "write_global_memory_bank": {
      const path = params.path as string;
      const content = params.content as string | undefined;

      if (!path) {
        throw new Error('Invalid arguments for write_global_memory_bank');
      }

      if (!content) {
        return { content: [{ type: "text", text: "Global memory bank initialized successfully" }] };
      }

      if (!app) {
        throw new Error('Application not initialized');
      }
      await app.getGlobalController().writeDocument(path, content);
      return { content: [{ type: "text", text: "Document written successfully" }] };
    }

    case "read_global_memory_bank": {
      const path = params.path as string;

      if (!path) {
        throw new Error('Invalid arguments for read_global_memory_bank');
      }

      if (!app) {
        throw new Error('Application not initialized');
      }
      const response = await app.getGlobalController().readDocument(path);
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return {
        content: [{ type: "text", text: response.data?.content || '' }],
        _meta: { lastModified: response.data?.lastModified || new Date().toISOString() }
      };
    }

    case "read_branch_core_files": {
      const branch = params.branch as string;

      if (!branch) {
        throw new Error('Invalid arguments for read_branch_core_files');
      }

      if (!app) {
        throw new Error('Application not initialized');
      }
      const response = await app.getBranchController().readCoreFiles(branch);
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.success ? response.data : {}, null, 2)
          }
        ]
      };
    }

    case "write_branch_core_files": {
      const branch = params.branch as string;
      const files = params.files as Record<string, unknown>;

      if (!branch || !files) {
        throw new Error('Invalid arguments for write_branch_core_files');
      }

      if (!app) {
        throw new Error('Application not initialized');
      }
      await app.getBranchController().writeCoreFiles(branch, files);
      return { content: [{ type: "text", text: "Core files updated successfully" }] };
    }

    case "read_global_core_files": {
      if (!app) {
        throw new Error('Application not initialized');
      }
      const response = await app.getGlobalController().readCoreFiles();
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.success ? response.data : {}, null, 2)
          }
        ]
      };
    }

    case "get_recent_branches": {
      const limit = params.limit as number | undefined;

      if (!app) {
        throw new Error('Application not initialized');
      }
      const response = await app.getBranchController().getRecentBranches(limit);
      if (!response.success) {
        throw new Error(response.error.message);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.success ? response.data : {}, null, 2)
          }
        ]
      };
    }

    case "create_pull_request": {
      const branch = params.branch as string;
      const title = params.title as string | undefined;
      const baseBranch = params.base as string | undefined;
      const language = params.language as string || 'ja';

      if (!branch) {
        throw new Error('Invalid arguments for create_pull_request');
      }

      // Use the new pull request tool
      if (!app) {
        throw new Error('Application not initialized');
      }
      const pullRequestTool = app.getPullRequestTool();
      const pullRequest = await pullRequestTool.createPullRequest(
        branch,
        title,
        baseBranch,
        language
      );

      // Set up response message based on language
      const isJapanese = language !== 'en';
      let responseMessage = isJapanese
        ? `pullRequest.md ファイルを作成しました。\n\n`
        : `pullRequest.md file has been created.\n\n`;

      if (isJapanese) {
        responseMessage += `このファイルをコミットしてプッシュすると、GitHub Actionsによって自動的にPull Requestが作成されます。\n\n`;
        responseMessage += `以下のコマンドを実行してください:\n`;
        responseMessage += `git add ${pullRequest.filePath}\n`;
        responseMessage += `git commit -m "chore: PR作成準備"\n`;
        responseMessage += `git push\n\n`;
        responseMessage += `PR情報:\n`;
        responseMessage += `タイトル: ${pullRequest.title}\n`;
        responseMessage += `ターゲットブランチ: ${pullRequest.baseBranch}\n`;
        responseMessage += `ラベル: ${pullRequest.labels.join(', ')}\n`;
      } else {
        responseMessage += `Commit and push this file to automatically create a Pull Request via GitHub Actions.\n\n`;
        responseMessage += `Run the following commands:\n`;
        responseMessage += `git add ${pullRequest.filePath}\n`;
        responseMessage += `git commit -m "chore: prepare PR"\n`;
        responseMessage += `git push\n\n`;
        responseMessage += `PR Information:\n`;
        responseMessage += `Title: ${pullRequest.title}\n`;
        responseMessage += `Target branch: ${pullRequest.baseBranch}\n`;
        responseMessage += `Labels: ${pullRequest.labels.join(', ')}\n`;
      }

      return { content: [{ type: "text", text: responseMessage }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
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
      // アプリケーションが保持するリソースを解放
      // 例: データベース接続、ファイルハンドルなど
      logger.info('Releasing application resources');

      // appをnullに設定してGCの対象にする
      app = null;
    }
  } catch (error) {
    logger.error('Error during server cleanup:', error);
  }

  // 明示的にGCを促す（Node.jsの場合）
  if (global.gc) {
    logger.info('Forcing garbage collection');
    global.gc();
  }
}

// Start the server
async function main() {
  logger.info('Starting Memory Bank MCP Server...');
  const transport = new StdioServerTransport();

  logger.debug('Connecting transport...');
  await server.connect(transport);

  logger.debug('Initializing application...');
  // 新しいアプリケーションの初期化
  app = await createApplication({
    memoryRoot: argv.docs as string,
    language: 'ja',
    verbose: false
  });

  logger.info(`Memory Bank MCP Server running on stdio`);
  logger.info(`Using new clean architecture implementation`);
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception:', error);
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  await cleanup();
  process.exit(1);
});

main().catch(async (error) => {
  logger.error('Fatal error:', error);
  console.error("Fatal error in main():", error);
  await cleanup();
  process.exit(1);
});
