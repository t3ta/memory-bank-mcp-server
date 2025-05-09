import { LanguageCode } from '../domain/i18n/Language.js';
import { createEnhancedPatchProperties } from './patch-utils.js';

/**
 * Common interface for MCP tool definitions
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Generate common properties required for branch operations
 */
export function createBranchProperties() {
  return {
    path: {
      type: 'string',
      description: 'Document path to write (e.g. "progress.json")'
    },
    branch: {
      type: 'string',
      description: 'Branch name (e.g., "feature/my-branch"). Optional: If not provided in project mode, it will be auto-detected from the current Git branch.',
    },
    docs: {
      type: 'string',
      description: 'Path to docs directory',
    },
  };
}

/**
 * Generate common properties required for global memory bank operations
 */
export function createGlobalProperties() {
  return {
    path: {
      type: 'string',
      description: 'Document path to write (e.g. "core/config.json")'
    },
    docs: {
      type: 'string',
      description: 'Path to docs directory',
    },
  };
}

/**
 * List of tool definitions
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    createReadContextTool(),
    createSearchDocumentsByTagsTool(),
    createWriteDocumentTool(),
    createReadDocumentTool()
  ];
}

// 旧APIの定義関数を削除（write/read_branch_memory_bank, write/read_global_memory_bank）

/**
 * Definition for the read_context tool
 */
function createReadContextTool(): ToolDefinition {
  return {
    name: 'read_context',
    description: 'Read all context information (rules, branch memory bank, global memory bank) at once',
    inputSchema: {
      type: 'object',
      properties: {
        branch: {
          type: 'string',
          description: 'Branch name. Optional: If not provided in project mode, it will be auto-detected.',
        },
        language: {
          type: 'string',
          enum: ['en', 'ja', 'zh'] as LanguageCode[],
          description: 'Language code (en, ja, or zh)',
        },
        docs: {
          type: 'string',
          description: 'Path to docs directory',
        },
      },
      required: ['docs', 'language'], // Removed 'branch' as it's optional in project mode
    },
  };
}

/**
 * Definition for the search_documents_by_tags tool
 */
function createSearchDocumentsByTagsTool(): ToolDefinition {
  return {
    name: 'search_documents_by_tags',
    description: 'Search documents in memory banks by tags',
    inputSchema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tags to search for (e.g., ["architecture", "refactoring"])',
        },
        match: {
          type: 'string',
          enum: ['and', 'or'],
          default: 'or',
          description: 'Match type: "and" requires all tags, "or" requires any tag',
        },
        scope: {
          type: 'string',
          enum: ['branch', 'global', 'all'],
          default: 'all',
          description: 'Search scope: "branch", "global", or "all"',
        },
        branch: {
          type: 'string',
          description: 'Branch name. Required if scope is "branch" or "all", but optional in project mode (will be auto-detected).',
        },
        docs: {
          type: 'string',
          description: 'Path to docs directory',
        },
      },
      required: ['tags', 'docs'],
    },
  };
}

/**
 * Definition for the write_document tool
 */
function createWriteDocumentTool(): ToolDefinition {
  const patchProps = createEnhancedPatchProperties();

  return {
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
        ...patchProps,
        tags: {
          type: 'array',
          items: {
            type: 'string'
          },
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
        },
        _patchNotes: {
          type: 'string',
          description: 'JSON Patch Implementation Notes (RFC 6902)',
          notes: [
            '1. Paths MUST start with "/"',
            '2. Cannot specify both content and patches simultaneously',
            '3. "add"/"replace"/"test" operations require a value property',
            '4. "move"/"copy" operations require a from property',
            '5. Special characters in paths need escaping: "/" → "~1", "~" → "~0"',
            '6. Use "/array/-" to append to an array (adds to the end)',
            '7. "remove" operation on a non-existent path will result in an error'
          ]
        }
      },
      required: ['scope', 'path', 'docs']
    }
  };
}

/**
 * Definition for the read_document tool
 */
function createReadDocumentTool(): ToolDefinition {
  return {
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
      required: ['scope', 'path', 'docs']
    }
  };
}
