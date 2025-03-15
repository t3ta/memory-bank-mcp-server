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
import { WorkspaceManager } from './managers/WorkspaceManager.js';
import { GlobalMemoryBank } from './managers/GlobalMemoryBank.js';
import { BranchMemoryBank } from './managers/BranchMemoryBank.js';
import { Language, BRANCH_CORE_FILES } from './models/types.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

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

// Initialize managers
const workspaceManager = new WorkspaceManager();
let globalMemoryBank: GlobalMemoryBank | null = null;
let branchMemoryBank: BranchMemoryBank | null = null;

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
    tools: [
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
      }
    ]
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
    case "write_branch_memory_bank": {
      const path = params.path as string;
      const content = params.content as string | undefined;
      const branch = (params.branch as string);

      if (!path) {
        throw new Error('Invalid arguments for write_branch_memory_bank');
      }

      const config = await workspaceManager.initialize(undefined, branch);
      branchMemoryBank = new BranchMemoryBank(
        workspaceManager.getBranchMemoryPath(branch),
        branch,
        config
      );
      await branchMemoryBank.initialize();

      if (!content) {
        return { content: [{ type: "text", text: "Branch memory bank initialized successfully" }] };
      }

      await branchMemoryBank.writeDocument(path, content);
      return { content: [{ type: "text", text: "Document written successfully" }] };
    }

    case "read_branch_memory_bank": {
      const path = params.path as string;
      const branch = (params.branch as string);

      if (!path) {
        throw new Error('Invalid arguments for read_branch_memory_bank');
      }

      const config = await workspaceManager.initialize(undefined, branch);
      branchMemoryBank = new BranchMemoryBank(
        workspaceManager.getBranchMemoryPath(branch),
        branch,
        config
      );
      await branchMemoryBank.initialize();

      const doc = await branchMemoryBank.readDocument(path);
      return {
        content: [{ type: "text", text: doc.content }],
        _meta: { lastModified: doc.lastModified.toISOString() }
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

      await globalMemoryBank?.writeDocument(path, content);
      await globalMemoryBank?.updateTagsIndex();
      return { content: [{ type: "text", text: "Document written successfully" }] };
    }

    case "read_global_memory_bank": {
      const path = params.path as string;

      if (!path) {
        throw new Error('Invalid arguments for read_global_memory_bank');
      }

      const doc = await globalMemoryBank?.readDocument(path);
      if (!doc) {
        throw new Error(`Document not found: ${path}`);
      }

      return {
        content: [{ type: "text", text: doc.content }],
        _meta: { lastModified: doc.lastModified.toISOString() }
      };
    }

    case "read_branch_core_files": {
      const branch = params.branch as string;

      if (!branch) {
        throw new Error('Invalid arguments for read_branch_core_files');
      }

      const config = await workspaceManager.initialize(undefined, branch);
      branchMemoryBank = new BranchMemoryBank(
        workspaceManager.getBranchMemoryPath(branch),
        branch,
        config
      );
      await branchMemoryBank.initialize();

      if (!branchMemoryBank) {
        throw new Error('Branch memory bank not initialized');
      }

      const results = await Promise.all(
        BRANCH_CORE_FILES.map(async (file) => {
          try {
            const doc = await branchMemoryBank!.readDocument(file);
            return {
              path: file,
              content: doc.content,
              lastModified: doc.lastModified.toISOString()
            };
          } catch (error: any) {
            return {
              path: file,
              error: `Failed to read ${file}: ${error?.message || 'Unknown error'}`
            };
          }
        })
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  logger.info('Starting Memory Bank MCP Server...');
  const transport = new StdioServerTransport();

  logger.debug('Connecting transport...');
  await server.connect(transport);

  logger.debug('Initializing workspace...');
  const config = await workspaceManager.initialize({
    memoryRoot: argv.docs as string,
    language: 'ja'
  });

  logger.debug('Initializing global memory bank...');
  globalMemoryBank = new GlobalMemoryBank(
    workspaceManager.getGlobalMemoryPath(),
    config
  );
  await globalMemoryBank.initialize();

  logger.info(`Memory Bank MCP Server running on stdio (language: ${config.language})`);
  logger.info(`Using docs directory: ${config.memoryBankRoot}`);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  console.error("Fatal error in main():", error);
  process.exit(1);
});
