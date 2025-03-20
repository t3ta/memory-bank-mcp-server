#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/dist/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/dist/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/dist/types.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Import the application
import { createApplication, Application } from './main/index.js';
import { logger } from './shared/utils/index.js';

// Helper function to render template with translations
function renderTemplate(template: any, translations: any): string {
  try {
    // Create a copy of the template to avoid modifying the original
    const result = JSON.parse(JSON.stringify(template));

    // Replace title and description with translated versions
    if (result.metadata?.titleKey && translations.translations[result.metadata.titleKey]) {
      result.metadata.title = translations.translations[result.metadata.titleKey];
    }

    if (
      result.metadata?.descriptionKey &&
      translations.translations[result.metadata.descriptionKey]
    ) {
      result.metadata.description = translations.translations[result.metadata.descriptionKey];
    }

    // Process sections
    if (Array.isArray(result.content?.sections)) {
      for (const section of result.content.sections) {
        // Replace section title with translated version
        if (section.titleKey && translations.translations[section.titleKey]) {
          section.title = translations.translations[section.titleKey];
        }

        // Replace section content with translated version
        if (section.contentKey && translations.translations[section.contentKey]) {
          section.content = translations.translations[section.contentKey];
        }
      }
    }

    return JSON.stringify(result, null, 2);
  } catch (error) {
    logger.error('Error rendering template:', error);
    return JSON.stringify(template, null, 2);
  }
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('docs', {
    alias: 'd',
    type: 'string',
    description: 'Path to docs directory',
    default: './docs',
  })
  .help()
  .parseSync();

// Get directory paths with ESM support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// New application instance
let app: Application | null = null;
const AVAILABLE_TOOLS = [
  // create_pull_request tool definition removed
  {
    name: 'list_tools',
    description: 'List all available tools',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'write_branch_memory_bank',
    description: "Write a document to the current branch's memory bank",
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' },
        branch: {
          type: 'string',
          description: 'Branch name',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_branch_memory_bank',
    description: "Read a document from the current branch's memory bank",
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        branch: {
          type: 'string',
          description: 'Branch name',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_global_memory_bank',
    description: 'Write a document to the global memory bank',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_global_memory_bank',
    description: 'Read a document from the global memory bank',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_rules',
    description: 'Read the memory bank rules in specified language',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          enum: ['en', 'ja', 'zh'],
          description: 'Language code (en, ja, or zh)',
        },
      },
      required: ['language'],
    },
  },
  {
    name: 'get_recent_branches',
    description: 'Get recently updated branch memory banks',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of branches to return (default: 10, max: 100)',
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
  {
    name: 'read_context',
    description:
      'Read all context information (rules, branch memory bank, global memory bank) at once',
    inputSchema: {
      type: 'object',
      properties: {
        branch: {
          type: 'string',
          description: 'Branch name (required if includeBranchMemory is true)',
        },
        language: {
          type: 'string',
          enum: ['en', 'ja', 'zh'],
          description: 'Language code (en, ja, or zh)',
        },
        includeRules: {
          type: 'boolean',
          description: 'Whether to include rules (default: true)',
        },
        includeBranchMemory: {
          type: 'boolean',
          description: 'Whether to include branch memory bank (default: true)',
        },
        includeGlobalMemory: {
          type: 'boolean',
          description: 'Whether to include global memory bank (default: true)',
        },
      },
    },
  },
];

// Create a server
const server = new Server(
  {
    name: 'memory-bank-mcp-server',
    version: '2.0.0',
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
    tools: AVAILABLE_TOOLS,
  };
});

// Add tool request handler
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;
  logger.debug('Tool call received:', { name, args });

  if (!args || typeof args !== 'object') {
    logger.error('Invalid arguments:', { name, args });
    throw new Error(`No arguments provided for tool: ${name}`);
  }

  const params = args as Record<string, unknown>;
  logger.debug('Parsed params:', params);

  switch (name) {
    case 'list_tools': {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(AVAILABLE_TOOLS, null, 2),
          },
        ],
      };
    }

    case 'write_branch_memory_bank': {
      const path = params.path as string;
      const content = params.content as string | undefined;
      const branch = params.branch as string;

      if (!path) {
        throw new Error('Invalid arguments for write_branch_memory_bank');
      }

      if (!content) {
        return { content: [{ type: 'text', text: 'Branch memory bank initialized successfully' }] };
      }

      if (!app) {
        throw new Error('Application not initialized');
      }
      await app.getBranchController().writeDocument(branch, path, content);
      return { content: [{ type: 'text', text: 'Document written successfully' }] };
    }

    case 'read_branch_memory_bank': {
      const path = params.path as string;
      const branch = params.branch as string;

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
        content: [{ type: 'text', text: response.data?.content || '' }],
        _meta: { lastModified: response.data?.lastModified || new Date().toISOString() },
      };
    }

    case 'read_rules': {
      const language = params.language as string;

      if (!language || !['en', 'ja', 'zh'].includes(language)) {
        throw new Error('Invalid arguments for read_rules');
      }

      const dirname = __dirname;

      try {
        // Load template structure
        const templatePath = path.join(dirname, 'templates', 'json', 'rules.json');
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const template = JSON.parse(templateContent);

        // Load language translations
        const translationsPath = path.join(
          dirname,
          'infrastructure',
          'i18n',
          'translations',
          `${language}.json`
        );
        const translationsContent = await fs.readFile(translationsPath, 'utf-8');
        const translations = JSON.parse(translationsContent);

        // Render template with translations
        const renderedContent = renderTemplate(template, translations);

        return {
          content: [{ type: 'text', text: renderedContent }],
          _meta: { lastModified: new Date().toISOString() },
        };
      } catch (error) {
        logger.error('Error reading rules:', error);

        // Fall back to legacy files if available
        try {
          // Try JSON format first
          const jsonFilePath = path.join(dirname, 'templates', 'json', `rules-${language}.json`);
          const content = await fs.readFile(jsonFilePath, 'utf-8');
          return {
            content: [{ type: 'text', text: content }],
            _meta: { lastModified: new Date().toISOString() },
          };
        } catch (jsonError) {
          // Fall back to markdown file
          try {
            const mdFilePath = path.join(dirname, 'templates', `rules-${language}.md`);
            const content = await fs.readFile(mdFilePath, 'utf-8');
            return {
              content: [{ type: 'text', text: content }],
              _meta: { lastModified: new Date().toISOString() },
            };
          } catch (mdError) {
            throw new Error(`Failed to read rules in ${language}: ${(error as Error).message}`);
          }
        }
      }
    }

    case 'write_global_memory_bank': {
      const path = params.path as string;
      const content = params.content as string | undefined;

      if (!path) {
        throw new Error('Invalid arguments for write_global_memory_bank');
      }

      if (!content) {
        return { content: [{ type: 'text', text: 'Global memory bank initialized successfully' }] };
      }

      if (!app) {
        throw new Error('Application not initialized');
      }
      await app.getGlobalController().writeDocument(path, content);
      return { content: [{ type: 'text', text: 'Document written successfully' }] };
    }

    case 'read_global_memory_bank': {
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
        content: [{ type: 'text', text: response.data?.content || '' }],
        _meta: { lastModified: response.data?.lastModified || new Date().toISOString() },
      };
    }

    case 'get_recent_branches': {
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
            type: 'text',
            text: JSON.stringify(response.success ? response.data : {}, null, 2),
          },
        ],
      };
    }

    case 'read_context': {
      const branch = params.branch as string | undefined;
      const language = (params.language as string) || 'ja';
      const includeRules = params.includeRules !== false; // デフォルトはtrue
      const includeBranchMemory = params.includeBranchMemory !== false; // デフォルトはtrue
      const includeGlobalMemory = params.includeGlobalMemory !== false; // デフォルトはtrue

      logger.info(`Reading context (branch: ${branch || 'none'}, language: ${language})`);

      // ブランチメモリバンクを含める場合は、ブランチ名が必須
      if (includeBranchMemory && !branch) {
        throw new Error('Branch name is required when includeBranchMemory is true');
      }

      if (!app) {
        throw new Error('Application not initialized');
      }

      // 結果を格納するオブジェクト
      const result: Record<string, any> = {};

      // ルールを取得
      if (includeRules) {
        logger.debug('Including rules in context');
        if (!['en', 'ja', 'zh'].includes(language)) {
          throw new Error('Invalid language for rules');
        }

        try {
          const dirname = __dirname;

          // Load template structure
          const templatePath = path.join(dirname, 'templates', 'json', 'rules.json');
          const templateContent = await fs.readFile(templatePath, 'utf-8');
          const template = JSON.parse(templateContent);

          // Load language translations
          const translationsPath = path.join(
            dirname,
            'infrastructure',
            'i18n',
            'translations',
            `${language}.json`
          );
          const translationsContent = await fs.readFile(translationsPath, 'utf-8');
          const translations = JSON.parse(translationsContent);

          // Render template with translations
          const renderedContent = renderTemplate(template, translations);

          result.rules = { content: renderedContent };
        } catch (error) {
          logger.error('Error reading rules:', error);

          // Fall back to legacy files if available
          try {
            // Try JSON format first
            const dirname = __dirname;
            const jsonFilePath = path.join(dirname, 'templates', 'json', `rules-${language}.json`);
            const content = await fs.readFile(jsonFilePath, 'utf-8');
            result.rules = { content };
          } catch (jsonError) {
            // Fall back to markdown file
            try {
              const dirname = __dirname;
              const mdFilePath = path.join(dirname, 'templates', `rules-${language}.md`);
              const content = await fs.readFile(mdFilePath, 'utf-8');
              result.rules = { content };
            } catch (mdError) {
              throw new Error(`Failed to read rules in ${language}: ${(error as Error).message}`);
            }
          }
        }
      }

      // ブランチメモリバンクを取得
      if (includeBranchMemory && branch) {
        logger.debug(`Including branch memory bank for branch: ${branch}`);
        const branchResponse = await app.getBranchController().readCoreFiles(branch);
        if (!branchResponse.success) {
          throw new Error(branchResponse.error.message);
        }
        result.branchMemory = branchResponse.data;
      }

      // グローバルメモリバンクを取得
      if (includeGlobalMemory) {
        logger.debug('Including global memory bank in context');
        const globalResponse = await app.getGlobalController().readCoreFiles();
        if (!globalResponse.success) {
          throw new Error(globalResponse.error.message);
        }
        result.globalMemory = globalResponse.data;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    // create_pull_request case removed

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Error handling
server.onerror = (error: any) => {
  logger.error('[MCP Server Error]', error);
};

// Process termination handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal, shutting down..');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down..');
  await cleanup();
  process.exit(0);
});

// Cleanup function to properly release resources
async function cleanup() {
  logger.info('Cleaning up resources..');
  try {
    // Close the server connection if it's open
    await server.close();
    logger.info('Server connection closed');

    // Release application resources if available
    if (app) {
      // Release resources held by the application
      // e.g. database connections, file handles, etc.
      logger.info('Releasing application resources');

      // Set app to null to make it eligible for garbage collection
      app = null;
    }
  } catch (error) {
    logger.error('Error during server cleanup:', error);
  }

  // Explicitly trigger garbage collection (for Node.js)
  if (global.gc) {
    logger.info('Forcing garbage collection');
    global.gc();
  }
}

// Start the server
async function main() {
  logger.info('Starting Memory Bank MCP Server..');
  const transport = new StdioServerTransport();

  logger.debug('Connecting transport..');
  await server.connect(transport);

  logger.debug('Initializing application..');
  // Initialize a new application
  app = await createApplication({
    memoryRoot: argv.docs as string,
    language: 'ja',
    verbose: false,
  });

  // Auto-migration disabled for testing
  logger.info('Auto-migration disabled for testing');

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
  console.error('Fatal error in main():', error);
  await cleanup();
  process.exit(1);
});
