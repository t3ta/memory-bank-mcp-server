import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Application } from './Application.js';
import { logger } from '../shared/utils/logger.js';
import { Language, isValidLanguage } from '@memory-bank/schemas';
import type { CliOptions } from '../infrastructure/config/WorkspaceConfig.js'; // Use relative path
import { generateToolDefinitions } from '../tools/dynamic-definitions.js';

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
    // Convert parameters to inputSchema for MCP compatibility
    const toolsWithSchema = dynamicTools.map(tool => ({
      ...tool,
      inputSchema: {
        type: "object",
        schema: tool.parameters
      }
    }));

    // Log the tools being returned for debugging
    logger.debug(`[setupRoutes] Returning ${toolsWithSchema.length} tools via MCP SDK`);

    return {
      tools: toolsWithSchema,
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
      // 旧APIのケースハンドラは削除済み - v3.0.0から統合APIのみサポート

      case 'read_document': {
        const scope = params.scope as 'branch' | 'global';
        const path = params.path as string;
        const branch = params.branch as string | undefined;
        const docs = params.docs as string | undefined;

        if (!path || !scope) {
          throw new Error('Invalid arguments for read_document: path and scope are required');
        }

        // ブランチスコープの場合のみブランチ名が必要（プロジェクトモードでは自動検出可能）
        if (scope === 'branch' && !branch) {
          const isProjectMode = app?.configProvider.getConfig().isProjectMode || false;
          if (!isProjectMode) {
            throw new Error('Branch name is required when not running in project mode');
          }
          // プロジェクトモードの場合は、ブランチ名はコントローラー内で自動検出される
          logger.debug('Branch name not provided but in project mode, will use auto-detection');
        }

        if (!app) {
          throw new Error('Application not initialized');
        }

        const docsRoot = docs || resolveDocsRoot();
        let controllerApp = app;
        if (docs) {
          logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
          const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja');
          logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
          // Normally create a new app instance here, using existing for simplicity
        }

        // scopeに応じて適切なコントローラーを呼び出す
        let response;
        if (scope === 'branch') {
          response = await controllerApp.getDocumentController().readDocument({
            scope,
            branchName: branch,
            path
          });
        } else if (scope === 'global') {
          response = await controllerApp.getDocumentController().readDocument({
            scope,
            path
          });
        } else {
          throw new Error(`Invalid scope: ${scope}, must be 'branch' or 'global'`);
        }

        if (!response.success) {
          throw new Error((response as any).error?.message || 'Failed to read document');
        }

        return {
          content: [{ type: 'text', text: response.data }],
          _meta: { lastModified: new Date().toISOString() }
        };
      }

      case 'write_document': {
        const scope = params.scope as 'branch' | 'global';
        const path = params.path as string;
        const branch = params.branch as string | undefined;
        const content = params.content as string | undefined;
        const patches = params.patches as any[] | undefined;
        const tags = params.tags as string[] | undefined;
        const returnContent = params.returnContent as boolean | undefined;
        const docs = params.docs as string | undefined;

        if (!path || !scope) {
          throw new Error('Invalid arguments for write_document: path and scope are required');
        }

        // ブランチスコープの場合のみブランチ名が必要（プロジェクトモードでは自動検出可能）
        if (scope === 'branch' && !branch) {
          const isProjectMode = app?.configProvider.getConfig().isProjectMode || false;
          if (!isProjectMode) {
            throw new Error('Branch name is required when not running in project mode');
          }
          // プロジェクトモードの場合は、ブランチ名はコントローラー内で自動検出される
          logger.debug('Branch name not provided but in project mode, will use auto-detection');
        }

        if (content && patches) {
          throw new Error('Content and patches cannot be provided at the same time');
        }

        if (!app) {
          throw new Error('Application not initialized');
        }

        const docsRoot = docs || resolveDocsRoot();
        let controllerApp = app;
        if (docs) {
          logger.debug(`Creating new application instance with docsRoot: ${docsRoot}`);
          const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja');
          logger.debug(`Using merged application options: ${JSON.stringify(appOptions)}`);
          // Normally create a new app instance here, using existing for simplicity
        }

        const response = await controllerApp.getDocumentController().writeDocument({
          scope,
          branchName: branch,
          path,
          content,
          patches,
          tags,
          returnContent
        });

        if (!response.success) {
          throw new Error((response as any).error?.message || 'Failed to write document');
        }

        return {
          content: [{ type: 'text', text: response.data ? JSON.stringify(response.data, null, 2) : 'Document written successfully' }],
          _meta: { lastModified: new Date().toISOString() }
        };
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
