/**
 * Utilities and safety measures for JSON Patch (RFC 6902) operations
 */

// Type definition for JSON Patch operation
export interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
}

/**
 * Generate JSON Patch property definitions, including clear warnings and validation rules
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
        "WARNING: Paths MUST start with '/'",
        "WARNING: '/' within paths MUST be escaped as '~1'",
        "WARNING: '~' within paths MUST be escaped as '~0'",
        "WARNING: 'move'/'copy' operations require a 'from' property",
        "WARNING: 'add'/'replace'/'test' operations require a 'value' property",
        "WARNING: 'move' operation cannot target a descendant of its source path"
      ]
    },
    content: {
      type: 'string',
      description: 'Full document content (JSON string or plain text, cannot be used together with patches)'
    }
  };
}

/**
 * Function to perform strict validation of JSON Patch
 * Use this within tool handlers to validate before applying patches
 */
export function validateJsonPatch(operations: JsonPatchOperation[]): { valid: boolean, errors: string[] } {
  const errors: string[] = [];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    // Basic validation
    if (!op.path.startsWith('/')) {
      errors.push(`Operation #${i + 1}: Path must start with '/': ${op.path}`);
    }

    // Operation-specific validation
    switch (op.op) {
      case 'add':
      case 'replace':
      case 'test':
        if (op.value === undefined) {
          errors.push(`Operation #${i + 1}: '${op.op}' operation requires a 'value' property`);
        }
        break;

      case 'move':
      case 'copy':
        if (!op.from) {
          errors.push(`Operation #${i + 1}: '${op.op}' operation requires a 'from' property`);
        } else if (!op.from.startsWith('/')) {
          errors.push(`Operation #${i + 1}: 'from' path must start with '/': ${op.from}`);
        }

        if (op.op === 'move' && op.path.startsWith(`${op.from}/`)) {
          errors.push(`Operation #${i + 1}: Cannot move to a path that is a child of the source path`);
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
 * Helper function to safely apply JSON Patch
 * - Handles path escaping
 * - Optimizes operation order
 * - Checks for potential issues
 */
export function sanitizeJsonPatch(operations: JsonPatchOperation[]): JsonPatchOperation[] {
  // Ensure path escaping
  const sanitized = operations.map(op => ({
    ...op,
    path: ensureLeadingSlash(op.path),
    ...(op.from ? { from: ensureLeadingSlash(op.from) } : {})
  }));

  // Optimize operation order (remove operations last)
  return sortPatchOperations(sanitized);
}

// Helper function
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
