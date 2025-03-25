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
  .option('workspace', {
    alias: 'w',
    type: 'string',
    description: 'Path to workspace directory'
  })
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

// Helper function to resolve workspace and docs paths
export function resolveWorkspaceAndDocs(toolWorkspace?: string, toolDocs?: string) {
  // 1. Tool parameters (highest priority)
  // 2. Command line arguments
  // 3. Environment variables
  // 4. Default values
  const workspace = toolWorkspace || argv.workspace || process.env.WORKSPACE_ROOT || process.cwd();
  const docs = toolDocs || argv.docs || process.env.MEMORY_BANK_ROOT ||
    (typeof workspace === 'string' ? path.join(workspace, 'docs') : './docs');

  return { workspace, docs };
}

// New application instance
let app: Application | null = null;
const AVAILABLE_TOOLS = [
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
        patches: {
          type: 'array',
          description: 'JSON Patch operations to apply (RFC 6902)',
          items: {
            type: 'object',
            properties: {
              op: {
                type: 'string',
                enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'],
                description: 'Operation type'
              },
              path: {
                type: 'string',
                description: 'JSON Pointer path (e.g. /metadata/title)'
              },
              value: {
                description: 'Value for add, replace, test operations'
              },
              from: {
                type: 'string',
                description: 'Source path for move, copy operations'
              }
            },
            required: ['op', 'path']
          }
        },
        branch: {
          type: 'string',
          description: 'Branch name',
        },
        workspace: {
          type: 'string',
          description: 'Path to workspace directory',
        },
        docs: {
          type: 'string',
          description: 'Path to docs directory',
        },
      },
      required: ['path', 'branch'],
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
        workspace: {
          type: 'string',
          description: 'Path to workspace directory',
        },
        docs: {
          type: 'string',
          description: 'Path to docs directory',
        },
      },
      required: ['path', 'branch'],
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
        patches: {
          type: 'array',
          description: 'JSON Patch operations to apply (RFC 6902)',
          items: {
            type: 'object',
            properties: {
              op: {
                type: 'string',
                enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'],
                description: 'Operation type'
              },
              path: {
                type: 'string',
                description: 'JSON Pointer path (e.g. /metadata/title)'
              },
              value: {
                description: 'Value for add, replace, test operations'
              },
              from: {
                type: 'string',
                description: 'Source path for move, copy operations'
              }
            },
            required: ['op', 'path']
          }
        },
        workspace: {
          type: 'string',
          description: 'Path to workspace directory',
        },
        docs: {
          type: 'string',
          description: 'Path to docs directory',
        },
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
        workspace: {
          type: 'string',
          description: 'Path to workspace directory',
        },
        docs: {
          type: 'string',
          description: 'Path to docs directory',
        },
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
        workspace: {
          type: 'string',
          description: 'Path to workspace directory',
        },
        docs: {
          type: 'string',
          description: 'Path to docs directory',
        },
      },
      required: ['language'],
    },
  },
  // get_recent_branches tools removed
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
        workspace: {
          type: 'string',
          description: 'Path to workspace directory',
        },
        docs: {
          type: 'string',
          description: 'Path to docs directory',
        },
      },
      required: ['branch'],
    },
  },
  {
    name: 'get_template',
    description: 'Get a template by ID and language',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Template ID to retrieve'
        },
        language: {
          type: 'string',
          enum: ['en', 'ja', 'zh'],
          description: 'Language code (en, ja, or zh)'
        },
        variables: {
          type: 'object',
          description: 'Optional variables for template substitution'
        },
        workspace: {
          type: 'string',
          description: 'Path to workspace directory'
        },
        docs: {
          type: 'string',
          description: 'Path to docs directory'
        }
      },
      required: ['id', 'language']
    }
  },
];

// Create a server
const server = new MCPServer(
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
      const patches = params.patches as any[] | undefined;
      const branch = params.branch as string;
      const workspace = params.workspace as string | undefined;
      const docs = params.docs as string | undefined;

      if (!path || !branch) {
        throw new Error('Invalid arguments for write_branch_memory_bank: path and branch are required');
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

      // Resolve workspace and docs directories
      const paths = resolveWorkspaceAndDocs(workspace, docs);
      
      // デバッグログはリリース時には削除
      // logger.info(`DEBUG [write_branch_memory_bank]: パラメータ値 - workspace: "${workspace}", docs: "${docs}"`);
      // logger.info(`DEBUG [write_branch_memory_bank]: resolveWorkspaceAndDocs結果 - workspace: "${paths.workspace}", docs: "${paths.docs}"`);

      // Create a new application instance if needed
      let branchApp = app;
      if (workspace || docs) {
        logger.debug(`Creating new application instance with workspace: ${paths.workspace}, docs: ${paths.docs}`);
        
        const appOptions = {
          workspace: paths.workspace,
          memoryRoot: paths.docs,
          language: 'ja' as Language,
          verbose: false,
        };
        
        // logger.info(`DEBUG [write_branch_memory_bank]: createApplication引数 - ${JSON.stringify(appOptions)}`);
        branchApp = await createApplication(appOptions);
      }

      // Case 1: Content provided - use normal write operation
      if (content) {
        logger.debug(`Writing branch memory bank (branch: ${branch}, path: ${path}, workspace: ${paths.workspace})`);
        const response = await branchApp.getBranchController().writeDocument(branch, path, content);
        if (!response.success) {
          throw new Error((response as any).error?.message || 'Failed to write document');
        }
        return { content: [{ type: 'text', text: 'Document written successfully' }] };
      }

      // Case 2: Patches provided - apply JSON Patch operations
      if (patches) {
        logger.debug(`Applying patches to branch memory bank (branch: ${branch}, path: ${path}, workspace: ${paths.workspace})`);
        
        try {
          // Import necessary classes
          const { JsonPatchOperation } = await import('./domain/jsonpatch/JsonPatchOperation.js');
          const { FastJsonPatchAdapter } = await import('./domain/jsonpatch/FastJsonPatchAdapter.js');

          // Create adapter for patch application
          const patchService = new FastJsonPatchAdapter();

          // First, read the document
          const readResult = await branchApp.getBranchController().readDocument(branch, path);
          if (!readResult.success) {
            throw new Error(`Document not found: ${path} in branch ${branch}. Create the document first before applying patches.`);
          }

          const document = readResult.data?.content;
          if (!document) {
            throw new Error(`Document is empty or invalid: ${path} in branch ${branch}`);
          }

          // Parse document content to JSON if it's a string
          const docContent = typeof document === 'string' ? JSON.parse(document) : document;

          // Convert patch operations to domain model
          const patchOperations = patches.map(patch => {
            return JsonPatchOperation.create(
              patch.op,
              patch.path,
              patch.value,
              patch.from
            );
          });

          // Apply patches
          logger.debug(`Applying ${patchOperations.length} JSON Patch operations`);
          
          // Execute validation
          const isValid = patchService.validate(docContent, patchOperations);
          if (!isValid) {
            throw new Error('Invalid JSON Patch operations');
          }

          // Apply patches
          const updatedContent = patchService.apply(docContent, patchOperations);
          
          // Save the updated document
          const jsonString = JSON.stringify(updatedContent, null, 2);
          const writeResult = await branchApp.getBranchController().writeDocument(branch, path, jsonString);
          
          if (!writeResult.success) {
            throw new Error((writeResult as any).error?.message || 'Failed to save patched document');
          }
          
          return { content: [{ type: 'text', text: 'Document patched successfully' }] };
        } catch (error) {
          logger.error('Error applying JSON Patch:', error);
          throw error instanceof Error ? error : new Error(String(error));
        }
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

      if (!app) {
        throw new Error('Application not initialized');
      }

      // Resolve workspace and docs directories
      const paths = resolveWorkspaceAndDocs(workspace, docs);
      logger.debug(`Reading branch memory bank (branch: ${branch}, path: ${path}, workspace: ${paths.workspace})`);

      // Create a new application instance if needed
      let branchApp = app;
      if (workspace || docs) {
        logger.debug(`Creating new application instance with workspace: ${paths.workspace}, docs: ${paths.docs}`);
        branchApp = await createApplication({
          workspace: paths.workspace,
          memoryRoot: paths.docs,
          language: 'ja',
          verbose: false,
        });
      }

      const response = await branchApp.getBranchController().readDocument(branch, path);
      if (!response.success) {
        throw new Error((response as any).error.message);
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

      // Resolve workspace and docs directories
      const paths = resolveWorkspaceAndDocs(workspace, docs);

      // Create a new application instance if needed
      let globalApp = app;
      if (workspace || docs) {
        logger.debug(`Creating new application instance with workspace: ${paths.workspace}, docs: ${paths.docs}`);
        globalApp = await createApplication({
          workspace: paths.workspace,
          memoryRoot: paths.docs,
          language: 'ja',
          verbose: false,
        });
      }

      // Case 1: Content provided - use normal write operation
      if (content) {
        logger.debug(`Writing global memory bank (path: ${path}, workspace: ${paths.workspace})`);
        const response = await globalApp.getGlobalController().writeDocument(path, content);
        if (!response.success) {
          throw new Error((response as any).error?.message || 'Failed to write document');
        }
        return { content: [{ type: 'text', text: 'Document written successfully' }] };
      }

      // Case 2: Patches provided - apply JSON Patch operations
      if (patches) {
        logger.debug(`Applying patches to global memory bank (path: ${path}, workspace: ${paths.workspace})`);
        
        try {
          // Import necessary classes
          const { JsonPatchOperation } = await import('./domain/jsonpatch/JsonPatchOperation.js');
          const { FastJsonPatchAdapter } = await import('./domain/jsonpatch/FastJsonPatchAdapter.js');

          // Create adapter for patch application
          const patchService = new FastJsonPatchAdapter();

          // First, read the document
          const readResult = await globalApp.getGlobalController().readDocument(path);
          if (!readResult.success) {
            throw new Error(`Document not found: ${path}. Create the document first before applying patches.`);
          }

          const document = readResult.data?.content;
          if (!document) {
            throw new Error(`Document is empty or invalid: ${path}`);
          }

          // Parse document content to JSON if it's a string
          const docContent = typeof document === 'string' ? JSON.parse(document) : document;

          // Convert patch operations to domain model
          const patchOperations = patches.map(patch => {
            return JsonPatchOperation.create(
              patch.op,
              patch.path,
              patch.value,
              patch.from
            );
          });

          // Apply patches
          logger.debug(`Applying ${patchOperations.length} JSON Patch operations`);
          
          // Execute validation
          const isValid = patchService.validate(docContent, patchOperations);
          if (!isValid) {
            throw new Error('Invalid JSON Patch operations');
          }

          // Apply patches
          const updatedContent = patchService.apply(docContent, patchOperations);
          
          // Save the updated document
          const jsonString = JSON.stringify(updatedContent, null, 2);
          const writeResult = await globalApp.getGlobalController().writeDocument(path, jsonString);
          
          if (!writeResult.success) {
            throw new Error((writeResult as any).error?.message || 'Failed to save patched document');
          }
          
          return { content: [{ type: 'text', text: 'Document patched successfully' }] };
        } catch (error) {
          logger.error('Error applying JSON Patch:', error);
          throw error instanceof Error ? error : new Error(String(error));
        }
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

      if (!app) {
        throw new Error('Application not initialized');
      }

      // Resolve workspace and docs directories
      const paths = resolveWorkspaceAndDocs(workspace, docs);
      logger.debug(`Reading global memory bank (path: ${path}, workspace: ${paths.workspace})`);

      // Create a new application instance if needed
      let globalApp = app;
      if (workspace || docs) {
        logger.debug(`Creating new application instance with workspace: ${paths.workspace}, docs: ${paths.docs}`);
        globalApp = await createApplication({
          workspace: paths.workspace,
          memoryRoot: paths.docs,
          language: 'ja',
          verbose: false,
        });
      }

      const response = await globalApp.getGlobalController().readDocument(path);
      if (!response.success) {
        throw new Error((response as any).error.message);
      }

      return {
        content: [{ type: 'text', text: response.data?.content || '' }],
        _meta: { lastModified: response.data?.lastModified || new Date().toISOString() },
      };
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

      // Resolve workspace and docs directories
      const paths = resolveWorkspaceAndDocs(workspace, docs);

      logger.info(`Reading context (branch: ${branch || 'none'}, language: ${language}, workspace: ${paths.workspace})`)

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

        // Create a new application instance with the specified workspace and docs if different from the default
        let contextApp = app;
        if (workspace || docs) {
          logger.debug(`Creating new application instance with workspace: ${paths.workspace}, docs: ${paths.docs}`);
          contextApp = await createApplication({
            workspace: paths.workspace,
            memoryRoot: paths.docs,
            language: isValidLanguage(language) ? language : 'en',
            verbose: false,
          });
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

      // Resolve workspace and docs directories
      const paths = resolveWorkspaceAndDocs(workspace, docs);
      logger.debug(`Getting template (id: ${id}, language: ${language}, workspace: ${paths.workspace})`);

      // Create a new application instance if needed
      let templateApp = app;
      if (workspace || docs) {
        logger.debug(`Creating new application instance with workspace: ${paths.workspace}, docs: ${paths.docs}`);
        templateApp = await createApplication({
          workspace: paths.workspace,
          memoryRoot: paths.docs,
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
    workspace: argv.workspace as string,
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
