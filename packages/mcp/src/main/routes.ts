import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Application } from './Application.js';
import { logger } from '../shared/utils/logger.js';
import { Language, isValidLanguage } from '@memory-bank/schemas';
import type { CliOptions } from '../infrastructure/config/WorkspaceConfig.js'; // Use relative path
import type { IConfigProvider } from '../infrastructure/config/interfaces/IConfigProvider.js';

/**
 * Generates tool definitions based on current environment settings
 *
 * This function dynamically creates tool definitions for the MCP server,
 * taking into account environment variables and configuration settings.
 * It allows hiding parameters that are already defined via CLI options.
 */
function generateToolDefinitions(configProvider: IConfigProvider | null = null) {
  // Determine which parameters should be required vs. optional
  const isProjectMode = configProvider?.getConfig().isProjectMode || false;
  const hasDocsPathEnv = !!process.env.MEMORY_BANK_ROOT || !!process.env.DOCS_ROOT;
  const hasLanguageEnv = !!process.env.LANGUAGE;

  logger.debug(`Generating tool definitions:`, {
    isProjectMode,
    hasDocsPathEnv,
    hasLanguageEnv
  });

  // Common tool properties
  const branchRequired = !isProjectMode;
  const docsRequired = !hasDocsPathEnv;
  const languageRequired = !hasLanguageEnv;

  // Read Context Tool: Dynamic required parameters
  const readContextRequired = ['docs', 'language', 'branch'].filter(param => {
    if (param === 'branch') return branchRequired;
    if (param === 'docs') return docsRequired;
    if (param === 'language') return languageRequired;
    return true;
  });

  logger.debug(`Read context required parameters:`, readContextRequired);

  return [
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
        required: ['path', ...(branchRequired ? ['branch'] : []), ...(docsRequired ? ['docs'] : [])]
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
        required: ['path', ...(branchRequired ? ['branch'] : []), ...(docsRequired ? ['docs'] : [])]
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
        required: ['path', ...(docsRequired ? ['docs'] : [])]
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
        required: [...(docsRequired ? ['docs'] : [])]
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
        required: readContextRequired
      }
    }
  ];
}

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
  // Get config provider from the app if available
  const configProvider = app ? app.configProvider : null;

  // Generate tool definitions dynamically based on environment
  const dynamicTools = generateToolDefinitions(configProvider);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: dynamicTools,
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
        // Add logging here to inspect params
        logger.debug(`Executing write_branch_memory_bank with params: ${JSON.stringify(params)}`);
        const path = params.path as string;
        const content = params.content as string | undefined;
        const patches = params.patches as any[] | undefined;
        // Log the value of patches right after extraction
        logger.debug(`Extracted patches value: ${JSON.stringify(patches)}`);
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
          // Return debug info in the response when this unexpected branch is taken
          const patchesType = typeof patches;
          const patchesValue = JSON.stringify(patches);
          const paramsKeys = JSON.stringify(Object.keys(params));
          // デバッグ情報をレスポンスに含める
          return { content: [{ type: 'text', text: `DEBUG: Entered init branch unexpectedly. params keys: ${paramsKeys}, patches type: ${patchesType}, patches value: ${patchesValue}` }] };
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

        // Check if content is provided (not undefined and not null)
        if (content !== undefined && content !== null) {
          logger.debug(`Writing branch memory bank (branch: ${branch}, path: ${path}, docsRoot: ${docsRoot})`);
          // content がオブジェクトだったら stringify する！
          const contentToWrite = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
          // Corrected call to writeDocument (Object argument is correct)
          const response = await branchApp.getBranchController().writeDocument({ branchName: branch, path, content: contentToWrite });
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
        // Get parameters from request or use environment/config defaults if available
        const providedBranch = params.branch as string | undefined;
        const providedLanguage = params.language as string | undefined;
        const providedDocs = params.docs as string | undefined;

        // Resolve final values with fallbacks
        const docsRoot = providedDocs || resolveDocsRoot();
        const language = providedLanguage ||
                        process.env.LANGUAGE ||
                        (app ? app.options.language : 'ja');

        // Branch can be auto-detected in project mode
        const isProjectMode = app?.configProvider.getConfig().isProjectMode || false;
        let branch = providedBranch;

        logger.info(`Reading context (providedBranch: ${providedBranch || 'none'}, providedLanguage: ${providedLanguage || 'none'}, docsRoot: ${docsRoot}, isProjectMode: ${isProjectMode})`);

        // Check if we need branch auto-detection
        if (!branch && isProjectMode) {
          logger.debug('Branch not provided but in project mode, will use auto-detection');
          // Actual auto-detection happens in the UseCase, no need to do it here
        } else if (!branch && !isProjectMode) {
          // Only throw if branch is truly required (not in project mode and not provided)
          throw new Error('Branch name is required for read_context when not in project mode');
        }

        if (!app) {
          throw new Error('Application not initialized');
        }

        try {
          logger.debug('Requesting context from ContextController');

          let contextApp = app;
          if (providedDocs) {
            logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
            const appOptions = getMergedApplicationOptions(app, docsRoot, isValidLanguage(language as Language) ? (language as Language) : 'en');
            logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
            // Normally create a new app instance here, using existing for simplicity
          }

          // Pass parameters to readContext, even if some are undefined
          // The ContextController and ReadContextUseCase will handle auto-detection
          const response = await contextApp.getContextController().readContext({
            branch,  // This might be undefined, which is OK for auto-detection
            language: language || 'en' // Provide default language if undefined
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
