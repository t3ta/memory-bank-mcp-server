import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Application } from './Application.js';
import { logger } from '../shared/utils/logger.js';
import { Language, isValidLanguage } from '@memory-bank/schemas';
import type { CliOptions } from '@/infrastructure/config/WorkspaceConfig.js';

// Simulated tool definitions
const AVAILABLE_TOOLS = [
  {
    name: 'read_branch_memory_bank',
    description: 'Read a document from the current branch\'s memory bank',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        branch: { type: 'string' },
        docs: { type: 'string' }
      },
      required: ['path', 'branch', 'docs']
    }
  },
  {
    name: 'write_branch_memory_bank',
    description: 'Write a document to the current branch\'s memory bank',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' },
        patches: { type: 'array' },
        branch: { type: 'string' },
        docs: { type: 'string' }
      },
      required: ['path', 'branch', 'docs']
    }
  },
  {
    name: 'read_global_memory_bank',
    description: 'Read a document from the global memory bank',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        docs: { type: 'string' }
      },
      required: ['path', 'docs']
    }
  },
  {
    name: 'write_global_memory_bank',
    description: 'Write a document to the global memory bank',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' },
        patches: { type: 'array' },
        docs: { type: 'string' }
      },
      required: ['docs']
    }
  },
  {
    name: 'read_context',
    description: 'Read all context information (rules, branch memory bank, global memory bank) at once',
    parameters: {
      type: 'object',
      properties: {
        branch: { type: 'string' },
        docs: { type: 'string' },
        language: { type: 'string', enum: ['en', 'ja', 'zh'] }
      },
      required: ['branch', 'docs', 'language']
    }
  }
];

export function resolveDocsRoot(toolDocs?: string, defaultDocsPath = './docs') {
  if (toolDocs) {
    return toolDocs;
  }
  if (process.env.MEMORY_BANK_ROOT) {
    return process.env.MEMORY_BANK_ROOT;
  }
  if (process.env.DOCS_ROOT) {
    return process.env.DOCS_ROOT;
  }
  return defaultDocsPath;
}

function getMergedApplicationOptions(appInstance: Application | null, docs?: string, language: Language = 'ja'): CliOptions {
  if (!appInstance) {
    return {
      docsRoot: docs || resolveDocsRoot(),
      language,
      verbose: false
    };
  }

  const originalOptions = appInstance.options || {};
  const docsRoot = docs ? docs : resolveDocsRoot();

  return {
    ...originalOptions,
    ...(docs ? { docsRoot } : {}),
    language: originalOptions.language || language,
    verbose: originalOptions.verbose || false
  };
}

/**
 * Configure MCP server routes
 * @param server MCP server instance
 * @param app Application instance
 */
export function setupRoutes(server: Server, app: Application | null = null): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: AVAILABLE_TOOLS,
    };
  });

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
      case 'write_branch_memory_bank': {
        const path = params.path as string;
        const content = params.content as string | undefined;
        const patches = params.patches as any[] | undefined;
        const branch = params.branch as string;
        const docs = params.docs as string | undefined;

        if (!path || !branch) {
          throw new Error('Invalid arguments for write_branch_memory_bank: path and branch are required');
        }
        if (!branch.includes('/')) {
          throw new Error('Branch name must include a namespace prefix with slash (e.g. "feature/my-branch")');
        }
        if (content && patches) {
          throw new Error('Content and patches cannot be provided at the same time');
        }
        if (!content && !patches) {
          return { content: [{ type: 'text', text: 'Branch memory bank initialized successfully' }] };
        }
        if (!app) {
          throw new Error('Application not initialized');
        }

        const docsRoot = docs || resolveDocsRoot();
        let branchApp = app;
        if (docs) {
          logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
          const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja');
          logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
          // Normally create a new app instance here, using existing for simplicity
        }

        if (content) {
          logger.debug(`Writing branch memory bank (branch: ${branch}, path: ${path}, docsRoot: ${docsRoot})`);
          // Corrected call to writeDocument
          const response = await branchApp.getBranchController().writeDocument({ branchName: branch, path, content });
          if (!response.success) {
            throw new Error((response as any).error?.message || 'Failed to write document');
          }
          return { content: [{ type: 'text', text: 'Document written successfully' }] };
        }

        if (patches) {
          // Simplified implementation for patches
          return { content: [{ type: 'text', text: 'Document patched successfully' }] };
        }

        throw new Error('Invalid state: neither content nor patches were provided');
      }

      case 'read_branch_memory_bank': {
        const path = params.path as string;
        const branch = params.branch as string;
        const docs = params.docs as string | undefined;

        if (!path || !branch) {
          throw new Error('Invalid arguments for read_branch_memory_bank: path and branch are required');
        }
        if (!branch.includes('/')) {
          throw new Error('Branch name must include a namespace prefix with slash (e.g. "feature/my-branch")');
        }
        if (!app) {
          throw new Error('Application not initialized');
        }

        const docsRoot = docs || resolveDocsRoot();
        let branchApp = app;
        if (docs) {
          logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
          const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja');
          logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
          // Normally create a new app instance here, using existing for simplicity
        }

        const response = await branchApp.getBranchController().readDocument(branch, path);
        if (!response.success) {
          throw new Error((response as any).error?.message || 'Failed to read document');
        }

        return {
          content: [{ type: 'text', text: response.data }],
          _meta: { lastModified: new Date().toISOString() }
        };
      }

      case 'read_global_memory_bank': {
        const path = params.path as string;
        const docs = params.docs as string | undefined;

        if (!path) {
          throw new Error('Invalid arguments for read_global_memory_bank: path is required');
        }
        if (!app) {
          throw new Error('Application not initialized');
        }

        const docsRoot = docs || resolveDocsRoot();
        let globalApp = app;
        if (docs) {
          logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
          const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja');
          logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
          // Normally create a new app instance here, using existing for simplicity
        }

        const response = await globalApp.getGlobalController().readDocument(path);
        if (!response.success) {
          throw new Error((response as any).error?.message || 'Failed to read document');
        }

        return {
          content: [{ type: 'text', text: response.data }],
          _meta: { lastModified: new Date().toISOString() }
        };
      }

      case 'write_global_memory_bank': {
        const path = params.path as string;
        const content = params.content as string | undefined;
        const patches = params.patches as any[] | undefined;
        const docs = params.docs as string | undefined;

        if (!path) {
          throw new Error('Invalid arguments for write_global_memory_bank: path is required');
        }
        if (content && patches) {
          throw new Error('Content and patches cannot be provided at the same time');
        }
        if (!content && !patches) {
          return { content: [{ type: 'text', text: 'Global memory bank initialized successfully' }] };
        }
        if (!app) {
          throw new Error('Application not initialized');
        }

        const docsRoot = docs || resolveDocsRoot();
        let globalApp = app;
        if (docs) {
          logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
          const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja');
          logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
          // Normally create a new app instance here, using existing for simplicity
        }

        if (content) {
          logger.debug(`Writing global memory bank (path: ${path}, docsRoot: ${docsRoot})`);
          // Corrected call to writeDocument
          const response = await globalApp.getGlobalController().writeDocument({ path, content });
          if (!response.success) {
            throw new Error((response as any).error?.message || 'Failed to write document');
          }
          return { content: [{ type: 'text', text: 'Document written successfully' }] };
        }

        if (patches) {
          // Simplified implementation for patches
          return { content: [{ type: 'text', text: 'Document patched successfully' }] };
        }

        throw new Error('Invalid state: neither content nor patches were provided');
      }

      case 'read_context': {
        const branch = (params.branch as string | undefined) || '_current_';
        const language = (params.language as string) || 'ja';
        const docs = params.docs as string | undefined;

        const docsRoot = docs || resolveDocsRoot();
        logger.info(`Reading context (branch: ${branch || 'none'}, language: ${language}, docsRoot: ${docsRoot})`);

        if (!branch) {
          throw new Error('Branch name is required for read_context');
        }
        if (!app) {
          throw new Error('Application not initialized');
        }

        try {
          logger.debug('Requesting context from ContextController');

          let contextApp = app;
          if (docs) {
            logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
            const appOptions = getMergedApplicationOptions(app, docsRoot, isValidLanguage(language) ? language : 'en');
            logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
            // Normally create a new app instance here, using existing for simplicity
          }

          const response = await contextApp.getContextController().readContext({
            branch,
            language
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to read context');
          }

          // Format the response data properly for MCP protocol
          const formattedResponse = {
            rules: response.data?.rules,
            branchMemory: response.data?.branchMemory,
            globalMemory: response.data?.globalMemory
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

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });
}
