/**
 * Shared module for dynamic tool definitions generation
 * Used by both list-tools.ts and routes.ts
 */
import { logger } from '../shared/utils/logger.js';
import type { IConfigProvider } from '../infrastructure/config/interfaces/IConfigProvider.js';

/**
 * Generates tool definitions based on current environment settings
 *
 * This function dynamically creates tool definitions for the MCP server,
 * taking into account environment variables and configuration settings.
 * It allows hiding parameters that are already defined via CLI options.
 */
export function generateToolDefinitions(configProvider: IConfigProvider | null = null) {
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
      parameters: {
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
      parameters: {
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
      parameters: {
        type: 'object',
        properties: {
          branch: {
            type: 'string',
            description: 'Branch name'
          },
          docs: {
            type: 'string',
            description: 'Path to docs directory'
          },
          language: {
            type: 'string',
            enum: ['en', 'ja', 'zh'],
            description: 'Language code (en, ja, or zh)'
          }
        },
        required: readContextRequired
      }
    },
    {
      name: 'search_documents_by_tags',
      description: 'Search documents in memory banks by tags',
      parameters: {
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
