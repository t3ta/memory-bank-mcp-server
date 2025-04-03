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
      description: 'Branch name - must include namespace prefix with slash (e.g. "feature/my-branch"). Optional if running in project mode (branch name will be auto-detected).',
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
    createWriteBranchMemoryBankTool(),
    createReadBranchMemoryBankTool(),
    createWriteGlobalMemoryBankTool(),
    createReadGlobalMemoryBankTool(),
    createReadContextTool(),
    createSearchDocumentsByTagsTool() // Add new tool definition
  ];
}

/**
 * Definition for the write_branch_memory_bank tool
 */
function createWriteBranchMemoryBankTool(): ToolDefinition {
  const branchProps = createBranchProperties();
  const patchProps = createEnhancedPatchProperties(); // Use enhanced patch properties

  return {
    name: 'write_branch_memory_bank',
    description: "Write a document to the current branch's memory bank. If using JSON Patch, follow RFC 6902 strictly.",
    inputSchema: {
      type: 'object',
      properties: {
        ...branchProps,
        ...patchProps,
        returnContent: {
          type: 'boolean',
          description: 'If true, return the full document content in the output. Defaults to false.',
          default: false,
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
      required: ['path', 'docs'],
    },
  };
}

/**
 * Definition for the read_branch_memory_bank tool
 */
function createReadBranchMemoryBankTool(): ToolDefinition {
  const branchProps = createBranchProperties();

  return {
    name: 'read_branch_memory_bank',
    description: "Read a document from the current branch's memory bank",
    inputSchema: {
      type: 'object',
      properties: {
        ...branchProps
      },
      required: ['path', 'docs'],
    },
  };
}

/**
 * Definition for the write_global_memory_bank tool
 */
function createWriteGlobalMemoryBankTool(): ToolDefinition {
  const globalProps = createGlobalProperties();
  const patchProps = createEnhancedPatchProperties();

  return {
    name: 'write_global_memory_bank',
    description: 'Write a document to the global memory bank',
    inputSchema: {
      type: 'object',
      properties: {
        ...globalProps,
        ...patchProps,
        returnContent: {
          type: 'boolean',
          description: 'If true, return the full document content in the output. Defaults to false.',
          default: false,
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
      required: ['docs'],
    },
  };
}

/**
 * Definition for the read_global_memory_bank tool
 */
function createReadGlobalMemoryBankTool(): ToolDefinition {
  const globalProps = createGlobalProperties();

  return {
    name: 'read_global_memory_bank',
    description: 'Read a document from the global memory bank',
    inputSchema: {
      type: 'object',
      properties: {
        ...globalProps
      },
      required: ['path', 'docs'],
    },
  };
}

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
          description: 'Branch name',
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
      required: ['branch', 'docs', 'language'],
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
          description: 'Branch name (required if scope is "branch" or "all")',
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
