#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { createApplication, Application } from './main/index.js';
import { logger } from './shared/utils/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Server } from 'node:http';
import { Language, isValidLanguage } from './schemas/v2/i18n-schema.js';
import type { CliOptions } from './shared/types/index.js';

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
    description: 'Path to docs directory (memory bank root)',
    default: './docs',
  })
  .option('workspace', {
    alias: 'w',
    type: 'string',
    description: 'Path to workspace directory (deprecated, use docs instead)',
    deprecated: true,
    hidden: true
  })
  .help()
  .parseSync();

// Get directory paths with ESM support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to resolve docs root path
export function resolveDocsRoot(toolDocs?: string) {
  // 1. Tool parameter (highest priority)
  // 2. Command line arguments
  // 3. Environment variables
  // 4. Default value
  if (toolDocs) {
    return toolDocs;
  }

  if (argv.docs) {
    return argv.docs as string;
  }

  if (process.env.MEMORY_BANK_ROOT) {
    return process.env.MEMORY_BANK_ROOT;
  }

  if (process.env.DOCS_ROOT) {
    return process.env.DOCS_ROOT;
  }

  // For backward compatibility, check workspace if it exists
  if (argv.workspace) {
    logger.warn('workspace parameter is deprecated and will be removed in a future release. Use docs parameter instead.');
    return path.join(argv.workspace as string, 'docs');
  }

  return './docs';
}

// Helper function to get merged application options
function getMergedApplicationOptions(appInstance: Application | null, docs?: string, language: Language = 'ja'): CliOptions {
  if (!appInstance) {
    // 初期アプリケーションでは通常の処理
    return {
      docsRoot: docs || resolveDocsRoot(),
      language,
      verbose: false
    };
  }

  // 既存のアプリケーションのオプションを取得
  const originalOptions = appInstance.options || {};

  // 解決されたパス
  const docsRoot = docs ? docs : resolveDocsRoot();

  // 明示的に指定された値のみを上書き
  return {
    ...originalOptions,
    ...(docs ? { docsRoot } : {}),
    language: originalOptions.language || language,
    verbose: originalOptions.verbose || false
  };
}

// Import tool definitions from the new modules
import { getToolDefinitions } from './tools/index.js';

// New application instance
let app: Application | null = null;

// Use the improved tool definitions from the tools module
const AVAILABLE_TOOLS = getToolDefinitions();

// Create a server
const server = new MCPServer(
  {
    name: 'memory-bank-mcp-server',
    version: '2.2.1',
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
      const patches = params.patches as any[] | undefined;
      const branch = params.branch as string;
      const workspace = params.workspace as string | undefined;
      const docs = params.docs as string | undefined;

      if (!path || !branch) {
        throw new Error('Invalid arguments for write_branch_memory_bank: path and branch are required');
      }

      // Make sure branch name includes namespace prefix
      if (!branch.includes('/')) {
        throw new Error('Branch name must include a namespace prefix with slash (e.g. "feature/my-branch")');
      }

      // Content and patches cannot be provided at the same time
      if (content && patches) {
        throw new Error('Content and patches cannot be provided at the same time');
      }

      // Initialize a new branch without content
      if (!content && !patches) {
        return { content: [{ type: 'text', text: 'Branch memory bank initialized successfully' }] };
      }

      if (!app) {
        throw new Error('Application not initialized');
      }

      // Resolve docs root
      const docsRoot = docs || resolveDocsRoot();

      // Create a new application instance if needed
      let branchApp = app;
      if (workspace || docs) {
        logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);

        // マージされた設定オプションを取得
        const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja');

        logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
        branchApp = await createApplication(appOptions);
      }

      // Case 1: Content provided - use normal write operation
      if (content) {
        logger.debug(`Writing branch memory bank (branch: ${branch}, path: ${path}, docsRoot: ${docsRoot})`);
        const response = await branchApp.getBranchController().writeDocument(branch, path, content);
        if (!response.success) {
          throw new Error((response as any).error?.message || 'Failed to write document');
        }
        return { content: [{ type: 'text', text: 'Document written successfully' }] };
      }

      // Case 2: Patches provided - use our improved JSON Patch handler
      if (patches) {
        const { processJsonPatch } = await import('./tools/handlers.js');
        
        return processJsonPatch(
          app,
          patches,
          async (docPath) => branchApp.getBranchController().readDocument(branch, docPath),
          async (docPath, content) => branchApp.getBranchController().writeDocument(branch, docPath, content),
          path,
          `branch memory bank (branch: ${branch})`
        );
      }

      // Should never reach here
      throw new Error('Invalid state: neither content nor patches were provided');
    }

    case 'read_branch_memory_bank': {
      const path = params.path as string;
      const branch = params.branch as string;
      const workspace = params.workspace as string | undefined;
      const docs = params.docs as string | undefined;

      if (!path || !branch) {
        throw new Error('Invalid arguments for read_branch_memory_bank: path and branch are required');
      }

      // Make sure branch name includes namespace prefix
      if (!branch.includes('/')) {
        throw new Error('Branch name must include a namespace prefix with slash (e.g. "feature/my-branch")');
      }

      // Use our improved read handler
      const { readBranchDocument } = await import('./tools/handlers.js');
      return readBranchDocument(app, path, branch, docs);
    }

    case 'read_rules': {
      const language = params.language as string;

      if (!language || !['en', 'ja', 'zh'].includes(language)) {
        throw new Error('Invalid arguments for read_rules');
      }

      const dirname = __dirname;

      try {
        // Load template structure
        const templatePath = path.join(dirname, 'templates', 'json', 'rules-template.json');
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
      const patches = params.patches as any[] | undefined;
      const workspace = params.workspace as string | undefined;
      const docs = params.docs as string | undefined;

      if (!path) {
        throw new Error('Invalid arguments for write_global_memory_bank');
      }

      // Content and patches cannot be provided at the same time
      if (content && patches) {
        throw new Error('Content and patches cannot be provided at the same time');
      }

      // Initialize a new document without content
      if (!content && !patches) {
        return { content: [{ type: 'text', text: 'Global memory bank initialized successfully' }] };
      }

      if (!app) {
        throw new Error('Application not initialized');
      }

      // Resolve docs root
      const docsRoot = docs || resolveDocsRoot();

      // Create a new application instance if needed
      let globalApp = app;
      if (workspace || docs) {
        logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);

        // マージされた設定オプションを取得
        const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja');

        logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
        globalApp = await createApplication(appOptions);
      }

      // Case 1: Content provided - use normal write operation
      if (content) {
        logger.debug(`Writing global memory bank (path: ${path}, docsRoot: ${docsRoot})`);
        const response = await globalApp.getGlobalController().writeDocument(path, content);
        if (!response.success) {
          throw new Error((response as any).error?.message || 'Failed to write document');
        }
        return { content: [{ type: 'text', text: 'Document written successfully' }] };
      }

      // Case 2: Patches provided - use our improved JSON Patch handler
      if (patches) {
        const { processJsonPatch } = await import('./tools/handlers.js');
        
        return processJsonPatch(
          app,
          patches,
          async (docPath) => globalApp.getGlobalController().readDocument(docPath),
          async (docPath, content) => globalApp.getGlobalController().writeDocument(docPath, content),
          path,
          `global memory bank`
        );
      }

      // Should never reach here
      throw new Error('Invalid state: neither content nor patches were provided');
    }

    case 'read_global_memory_bank': {
      const path = params.path as string;
      const workspace = params.workspace as string | undefined;
      const docs = params.docs as string | undefined;

      if (!path) {
        throw new Error('Invalid arguments for read_global_memory_bank');
      }

      // Use our improved read handler
      const { readGlobalDocument } = await import('./tools/handlers.js');
      return readGlobalDocument(app, path, docs);
    }

    case 'read_context': {
      const branch = (params.branch as string | undefined) || '_current_';
      const language = (params.language as string) || 'ja';
      const workspace = params.workspace as string | undefined;
      const docs = params.docs as string | undefined;
      // Include options are always true now, but kept for backwards compatibility
      const includeRules = true;
      const includeBranchMemory = true;
      const includeGlobalMemory = true;

      // Resolve docs root
      const docsRoot = docs || resolveDocsRoot(workspace ? docs : undefined);

      logger.info(`Reading context (branch: ${branch || 'none'}, language: ${language}, docsRoot: ${docsRoot})`)

      // オプションが指定されていても無視される（オプション自体が廃止されたため）
      logger.debug('All context components are always included regardless of include options.');

      // Branch name is required
      if (!branch) {
        throw new Error('Branch name is required for read_context');
      }

      if (!app) {
        throw new Error('Application not initialized');
      }

      try {
        // Use ContextController to get all context info at once
        logger.debug('Requesting context from ContextController');

        // Create a new application instance with the specified docsRoot if different from the default
        let contextApp = app;
        if (workspace || docs) {
          logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);

          // マージされた設定オプションを取得
          const appOptions = getMergedApplicationOptions(app, docsRoot, isValidLanguage(language) ? language : 'en');

          logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
          contextApp = await createApplication(appOptions);
        }

        const response = await contextApp.getContextController().readContext({
          branch,
          language
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to read context');
        }

        // Make sure we return properly formatted data for MCP
        // The response.data is already an object, no need to stringify and then parse again
        // Format the response data properly for MCP protocol
        // We need to ensure it's valid JSON for the client to parse
        const formattedResponse = {
          rules: response.data.rules,
          branchMemory: response.data.branchMemory,
          globalMemory: response.data.globalMemory
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formattedResponse, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error reading context:', error);
        throw error;
      }
    }

    case 'get_template': {
      const id = params.id as string;
      const language = params.language as string;
      const variables = params.variables as Record<string, string> | undefined;
      const workspace = params.workspace as string | undefined;
      const docs = params.docs as string | undefined;

      if (!id || !language) {
        throw new Error('Invalid arguments for get_template');
      }

      if (!['en', 'ja', 'zh'].includes(language)) {
        throw new Error(`Invalid language code: ${language}`);
      }

      if (!app) {
        throw new Error('Application not initialized');
      }

      // Resolve docs root
      const docsRoot = docs || resolveDocsRoot(workspace ? docs : undefined);
      logger.debug(`Getting template (id: ${id}, language: ${language}, docsRoot: ${docsRoot})`);

      // Create a new application instance if needed
      let templateApp = app;
      if (workspace || docs) {
        logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
        templateApp = await createApplication({
          docsRoot,
          language: isValidLanguage(language) ? language : 'en',
          verbose: false,
        });
      }

      // Currently returns template in Markdown format
      const response = await templateApp.getTemplateController().getTemplateAsMarkdown(id, isValidLanguage(language) ? language : 'en', variables);

      return {
        content: [{ type: 'text', text: response }],
        _meta: { lastModified: new Date().toISOString() }
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Error handling
(server as any).onerror = (error: any) => {
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
    await (server as any).close();
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
  await (server as any).connect(transport);

  logger.debug('Initializing application..');
  // Initialize a new application
  app = await createApplication({
    docsRoot: resolveDocsRoot(),
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
