import { Language } from '../schemas/v2/i18n-schema.js';
import { createEnhancedPatchProperties } from './patch-utils.js';

/**
 * MCPツール定義の共通インターフェース
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
 * ブランチ操作に必要な共通プロパティを生成
 */
export function createBranchProperties() {
  return {
    path: { 
      type: 'string',
      description: 'Document path to write (e.g. "progress.json")'
    },
    branch: {
      type: 'string',
      description: 'Branch name - must include namespace prefix with slash (e.g. "feature/my-branch")',
    },
    docs: {
      type: 'string',
      description: 'Path to docs directory',
    },
  };
}

/**
 * グローバルメモリバンク操作に必要な共通プロパティを生成
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
 * ツール定義一覧
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    createListToolsTool(),
    createWriteBranchMemoryBankTool(),
    createReadBranchMemoryBankTool(),
    createWriteGlobalMemoryBankTool(),
    createReadGlobalMemoryBankTool(),
    createReadContextTool()
  ];
}

/**
 * list_toolsツールの定義
 */
function createListToolsTool(): ToolDefinition {
  return {
    name: 'list_tools',
    description: 'List all available tools',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  };
}

/**
 * write_branch_memory_bankツールの定義
 */
function createWriteBranchMemoryBankTool(): ToolDefinition {
  const branchProps = createBranchProperties();
  const patchProps = createEnhancedPatchProperties(); // 強化されたパッチプロパティを使用
  
  return {
    name: 'write_branch_memory_bank',
    description: "Write a document to the current branch's memory bank. If using JSON Patch, follow RFC 6902 strictly.",
    inputSchema: {
      type: 'object',
      properties: {
        ...branchProps,
        ...patchProps,
        _patchNotes: {
          type: 'string',
          description: 'JSON Patch Implementation Notes (RFC 6902)',
          notes: [
            '1. パスは必ず "/" で始めなければなりません',
            '2. content と patches は同時に指定できません',
            '3. "add"/"replace"/"test" 操作では value プロパティが必須です',
            '4. "move"/"copy" 操作では from プロパティが必須です',
            '5. パス内の特殊文字はエスケープが必要: "/" → "~1", "~" → "~0"',
            '6. 配列への追加は "/array/-" を使用します (最後に追加)',
            '7. 存在しないパスへの "remove" 操作はエラーになります'
          ]
        }
      },
      required: ['path', 'branch', 'docs'],
    },
  };
}

/**
 * read_branch_memory_bankツールの定義
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
      required: ['path', 'branch', 'docs'],
    },
  };
}

/**
 * write_global_memory_bankツールの定義
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
        _patchNotes: {
          type: 'string',
          description: 'JSON Patch Implementation Notes (RFC 6902)',
          notes: [
            '1. パスは必ず "/" で始めなければなりません',
            '2. content と patches は同時に指定できません',
            '3. "add"/"replace"/"test" 操作では value プロパティが必須です',
            '4. "move"/"copy" 操作では from プロパティが必須です',
            '5. パス内の特殊文字はエスケープが必要: "/" → "~1", "~" → "~0"',
            '6. 配列への追加は "/array/-" を使用します (最後に追加)',
            '7. 存在しないパスへの "remove" 操作はエラーになります'
          ]
        }
      },
      required: ['docs'],
    },
  };
}

/**
 * read_global_memory_bankツールの定義
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
 * read_contextツールの定義
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
          enum: ['en', 'ja', 'zh'] as Language[],
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
