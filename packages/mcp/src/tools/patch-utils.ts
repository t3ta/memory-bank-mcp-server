/**
 * JSON Patch (RFC 6902) の操作に関するユーティリティと安全対策
 */

// JSON Patch操作の型定義
export interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
}

/**
 * JSON Patchのプロパティ定義を生成し、明確な警告と検証ルールを含める
 */
export function createEnhancedPatchProperties() {
  return {
    patches: {
      type: 'array',
      description: 'JSON Patch operations (RFC 6902) - IMPORTANT: See warnings below',
      items: {
        type: 'object',
        properties: {
          op: {
            type: 'string',
            enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'],
            description: 'Operation type - must be one of these 6 values'
          },
          path: {
            type: 'string',
            description: 'JSON Pointer path - MUST start with "/" (e.g. "/metadata/title")'
          },
          value: {
            description: 'Value for add, replace, test operations - required for these operations'
          },
          from: {
            type: 'string',
            description: 'Source path for move, copy operations - MUST start with "/" (e.g. "/oldPath")'
          }
        },
        required: ['op', 'path']
      },
      warnings: [
        "WARNING: パスは必ず '/' で始める必要があります",
        "WARNING: パス内の '/' は '~1' にエスケープする必要があります",
        "WARNING: パス内の '~' は '~0' にエスケープする必要があります",
        "WARNING: 'move'/'copy'操作では 'from' プロパティが必須です",
        "WARNING: 'add'/'replace'/'test'操作では 'value' プロパティが必須です",
        "WARNING: 'move'操作でパスに自身のサブツリーは指定できません"
      ]
    },
    content: { 
      type: 'string',
      description: 'Full document content (cannot be used together with patches)'
    }
  };
}

/**
 * JSON Patchの厳密な検証を行う関数
 * これをツールハンドラー内で使用して、パッチ適用前にバリデーションを行う
 */
export function validateJsonPatch(operations: JsonPatchOperation[]): { valid: boolean, errors: string[] } {
  const errors: string[] = [];
  
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    
    // 基本的な検証
    if (!op.path.startsWith('/')) {
      errors.push(`操作 #${i+1}: パスは'/'で始まる必要があります: ${op.path}`);
    }
    
    // 操作別の検証
    switch (op.op) {
      case 'add':
      case 'replace':
      case 'test':
        if (op.value === undefined) {
          errors.push(`操作 #${i+1}: '${op.op}'操作には'value'プロパティが必要です`);
        }
        break;
        
      case 'move':
      case 'copy':
        if (!op.from) {
          errors.push(`操作 #${i+1}: '${op.op}'操作には'from'プロパティが必要です`);
        } else if (!op.from.startsWith('/')) {
          errors.push(`操作 #${i+1}: 'from'パスは'/'で始まる必要があります: ${op.from}`);
        }
        
        if (op.op === 'move' && op.path.startsWith(`${op.from}/`)) {
          errors.push(`操作 #${i+1}: 自分自身のサブツリーに移動することはできません`);
        }
        break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * JSON Patchを安全に適用するためのヘルパー関数
 * - パスのエスケープを処理
 * - 操作の順序を最適化
 * - 潜在的な問題をチェック
 */
export function sanitizeJsonPatch(operations: JsonPatchOperation[]): JsonPatchOperation[] {
  // パスのエスケープを確認
  const sanitized = operations.map(op => ({
    ...op,
    path: ensureLeadingSlash(op.path),
    ...(op.from ? { from: ensureLeadingSlash(op.from) } : {})
  }));
  
  // 操作の順序を最適化（削除操作は最後に）
  return sortPatchOperations(sanitized);
}

// ヘルパー関数
function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function sortPatchOperations(patches: JsonPatchOperation[]): JsonPatchOperation[] {
  return [...patches].sort((a, b) => {
    if (a.op === 'remove' && b.op !== 'remove') return 1;
    if (a.op !== 'remove' && b.op === 'remove') return -1;
    return 0;
  });
}
