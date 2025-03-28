#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { createApplication, Application } from '@memory-bank/mcp'; // Assuming these are exported from the package root
import { logger } from '@memory-bank/mcp'; // Assuming logger is exported from the package root
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Server } from 'node:http';
import { Language, isValidLanguage } from '@memory-bank/schemas';
// Removed incorrect import: import type { CliOptions } from '@memory-bank/schemas';

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

  return './docs';
}

// Helper function to get merged application options
// Define the return type inline as CliOptions is no longer available/correct
function getMergedApplicationOptions(appInstance: Application | null, docs?: string, language: Language = 'ja'): { docsRoot: string; language: Language; verbose: boolean } {
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

  // Calculate the final docsRoot value, ensuring it's always a string
  const finalDocsRoot = docs || originalOptions.docsRoot || resolveDocsRoot();

  // 明示的に指定された値のみを上書きし、必須プロパティを確実に設定
  return {
    // Spread other potential properties from originalOptions if needed
    // ...originalOptions, // Avoid spreading if it causes type issues, explicitly set known properties
    language: (originalOptions.language && isValidLanguage(originalOptions.language)) ? originalOptions.language : language,
    verbose: originalOptions.verbose || false,
    docsRoot: finalDocsRoot // Explicitly set the calculated docsRoot
  };
}

// Import tool definitions from the new modules
import { getToolDefinitions } from '@memory-bank/mcp'; // Assuming getToolDefinitions is exported from the package root

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
      if (docs) {
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

      // Case 2: Patches provided - use inline logic or dedicated patch handler if available in MCP package
      if (patches) {
        // Assuming patch logic is handled within the controller or a utility in the MCP package
        // This might need adjustment based on how patching is implemented in the new structure
        logger.warn('JSON Patch handling for branch memory bank needs review/implementation based on MCP package structure.');
      // Case 2: Patches provided - use JsonPatchUseCase from MCP package
      if (patches) {
        logger.debug(`Applying JSON Patch to branch memory bank (branch: ${branch}, path: ${path}, patches: ${JSON.stringify(patches)})`);
        
        try {
          // Get the JsonPatchUseCase from the factory or create it directly
          const jsonPatchUseCase = branchApp.getUseCaseFactory().createJsonPatchUseCase();
          
          // Convert patches to the domain's JsonPatchOperation format
          const patchOperations = patches.map(patch => {
            return {
              op: patch.op,
              path: patch.path,
              value: patch.value,
              from: patch.from
            };
          });
          
          // Execute patch operations on the document
          const result = await jsonPatchUseCase.execute(path, patchOperations, branch);
          
          if (!result) {
            throw new Error(`Failed to apply JSON Patch to document: ${path} in branch ${branch}`);
          }
          
          return { content: [{ type: 'text', text: 'Patches applied successfully' }] };
        } catch (error) {
          logger.error(`Error applying JSON Patch: ${error.message}`, error);
          throw new Error(`Failed to apply JSON Patch: ${error.message}`);
        }
              op: patch.op,
              path: patch.path,
              value: patch.value,
              from: patch.from
            };
          });
          
          // Execute patch operations on the document
          const result = await jsonPatchUseCase.execute(path, patchOperations, branch);
          
          if (!result) {
            throw new Error(`Failed to apply JSON Patch to document: ${path} in branch ${branch}`);
          }
          
          return { content: [{ type: 'text', text: 'Patches applied successfully' }] };
        } catch (error) {
          logger.error(`Error applying JSON Patch: ${error.message}`, error);
          throw new Error(`Failed to apply JSON Patch: ${error.message}`);
        }
    }

    case 'read_branch_memory_bank': {
      const path = params.path as string;
      const branch = params.branch as string;
      const docs = params.docs as string | undefined;

      if (!path || !branch) {
        throw new Error('Invalid arguments for read_branch_memory_bank: path and branch are required');
      }

      // Make sure branch name includes namespace prefix
      if (!branch.includes('/')) {
        throw new Error('Branch name must include a namespace prefix with slash (e.g. "feature/my-branch")');
      }

      // Directly call the controller method
      if (!app) throw new Error('Application not initialized');
      let branchApp = app;
      if (docs) {
        const docsRoot = resolveDocsRoot(docs);
        logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
        const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja'); // Assuming default language 'ja'
        branchApp = await createApplication(appOptions);
      }
      const response = await branchApp.getBranchController().readDocument(branch, path);
      if (!response.success) {
        throw new Error((response as any).error?.message || 'Failed to read branch document');
      }
      // Need to format the response for MCP
      return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
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
      if (docs) {
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

      // Case 2: Patches provided - use inline logic or dedicated patch handler if available in MCP package
      if (patches) {
        // Assuming patch logic is handled within the controller or a utility in the MCP package
        // This might need adjustment based on how patching is implemented in the new structure
        logger.warn('JSON Patch handling for global memory bank needs review/implementation based on MCP package structure.');
        // Placeholder: Directly try writing, assuming patches might be handled internally or need a different approach
        // This likely needs a proper implementation using patch utilities or controller methods
        throw new Error('JSON Patch for global memory bank is not fully implemented in this refactored entry point yet.');
        // Example if a patch method exists on the controller:
        // const response = await globalApp.getGlobalController().patchDocument(path, patches);
        // if (!response.success) throw new Error...
        // return { content: [{ type: 'text', text: 'Patches applied successfully' }] };
      }

      // Should never reach here
      throw new Error('Invalid state: neither content nor patches were provided');
    }

    case 'read_global_memory_bank': {
      const path = params.path as string;
      const docs = params.docs as string | undefined;

      if (!path) {
        throw new Error('Invalid arguments for read_global_memory_bank');
      }

      // Directly call the controller method (assuming readGlobalDocument logic is now inline or unnecessary)
      if (!app) throw new Error('Application not initialized');
      let globalApp = app;
      if (docs) {
        const docsRoot = resolveDocsRoot(docs);
        logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
        const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja'); // Assuming default language 'ja'
        globalApp = await createApplication(appOptions);
      }
      const response = await globalApp.getGlobalController().readDocument(path);
      if (!response.success) {
        throw new Error((response as any).error?.message || 'Failed to read global document');
      }
      // Need to format the response for MCP
      return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
    }
    case 'read_context': {
      const branch = (params.branch as string | undefined) || '_current_';
      const language = (params.language as string) || 'ja';
      const docs = params.docs as string | undefined;
      // Include options are always true now, but kept for backwards compatibility
      const includeRules = true;
      const includeBranchMemory = true;
      const includeGlobalMemory = true;

      // Resolve docs root
      const docsRoot = docs || resolveDocsRoot();

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
        if (docs) {
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
      const docsRoot = docs || resolveDocsRoot();
      logger.debug(`Getting template (id: ${id}, language: ${language}, docsRoot: ${docsRoot})`);

      // Create a new application instance if needed
      let templateApp = app;
      if (docs) {
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
