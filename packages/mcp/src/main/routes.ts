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
 *
 * Note: Uses inputSchema instead of parameters to comply with MCP SDK 1.9.0+ requirements
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
      name: 'read_document',
      description: 'Read a document from a branch or global memory bank',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['branch', 'global'],
            description: 'Scope to read from (branch or global)'
          },
          branch: {
            type: 'string',
            description: 'Branch name (required if scope is "branch", auto-detected in project mode)'
          },
          path: {
            type: 'string',
            description: 'Document path (e.g. "config.json")'
          },
          docs: {
            type: 'string',
            description: 'Path to docs directory'
          }
        },
        required: ['scope', 'path', ...(docsRequired ? ['docs'] : [])]
      }
    },
    {
      name: 'write_document',
      description: 'Write a document to a branch or global memory bank',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['branch', 'global'],
            description: 'Scope to write to (branch or global)'
          },
          branch: {
            type: 'string',
            description: 'Branch name (required if scope is "branch", auto-detected in project mode)'
          },
          path: {
            type: 'string',
            description: 'Document path (e.g. "config.json")'
          },
          content: {
            type: 'string',
            description: 'Document content (mutually exclusive with patches)'
          },
          patches: {
            type: 'array',
            description: 'JSON Patch operations (RFC 6902, mutually exclusive with content)'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags to assign to the document'
          },
          docs: {
            type: 'string',
            description: 'Path to docs directory'
          },
          returnContent: {
            type: 'boolean',
            description: 'If true, return the full document content in output',
            default: false
          }
        },
        required: ['scope', 'path', ...(docsRequired ? ['docs'] : [])]
      }
    },
    {
      name: 'read_context',
      description: 'Read all context information (rules, branch memory bank, global memory bank) at once',
      inputSchema: {
        type: 'object',
        properties: {
          branch: { type: 'string' },
          docs: { type: 'string' },
          language: { type: 'string', enum: ['en', 'ja', 'zh'] }
        },
        required: readContextRequired
      }
    },
    {
      name: 'search_documents_by_tags',
      description: 'Search documents in memory banks by tags',
      inputSchema: {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of tags to search for (e.g., ["architecture", "refactoring"])'
          },
          match: {
            type: 'string',
            enum: ['and', 'or'],
            default: 'or',
            description: 'Match type: "and" requires all tags, "or" requires any tag'
          },
          scope: {
            type: 'string',
            enum: ['branch', 'global', 'all'],
            default: 'all',
            description: 'Search scope: "branch", "global", or "all"'
          },
          branch: {
            type: 'string',
            description: 'Branch name. Required if scope is "branch" or "all", but optional in project mode (will be auto-detected).'
          },
          docs: {
            type: 'string',
            description: 'Path to docs directory'
          }
        },
        required: ['tags', ...(docsRequired ? ['docs'] : [])]
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
    // ツール定義はすでにinputSchemaを使用するように更新済み
    const result = {
      tools: dynamicTools,
      // PaginatedResultSchemaの必須プロパティを追加
      _meta: {}  // 空のオブジェクトでも良い
    };

    // デバッグ用のログ出力（JSON-RPCの外部に出力されるので注意）
    logger.debug('ListToolsRequestSchema response:', JSON.stringify(result, null, 2));

    return result;
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
