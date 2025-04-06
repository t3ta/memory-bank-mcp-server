/**
 * Tests for v2 JSON document schemas
 */
import {
  DocumentMetadataV2Schema,
  BaseJsonDocumentV2Schema,
  SCHEMA_VERSION
} from '@/v2/json-document.js'; // エイリアスパスに変更

import {
  BranchContextJsonV2Schema,
  ActiveContextJsonV2Schema,
  ProgressJsonV2Schema,
  SystemPatternsJsonV2Schema,
  GenericDocumentJsonV2Schema,
} from '@/document-types/index.js'; // エイリアスパスに変更

describe('DocumentMetadataV2Schema', () => {
  it('should validate correct metadata', () => {
    const validMetadata = {
      title: 'Test Document',
      documentType: 'test',
      id: '123e4567-e89b-12d3-a456-426614174000',
      path: 'test/document.json',
      tags: ['test', 'example'],
      lastModified: '2023-10-27T10:00:00.000Z', // Use ISO string
      createdAt: '2023-10-26T10:00:00.000Z', // Use ISO string
      version: 1
    };

    const result = DocumentMetadataV2Schema.safeParse(validMetadata);
    expect(result.success).toBe(true);
  });

  it('should accept ISO date strings for dates', () => {
    const validMetadata = {
      title: 'Test Document',
      documentType: 'test',
      id: '123e4567-e89b-12d3-a456-426614174000',
      path: 'test/document.json',
      tags: ['test', 'example'],
      lastModified: '2025-03-27T12:00:00Z',
      createdAt: '2025-03-26T10:00:00Z',
      version: 1
    };

    const result = DocumentMetadataV2Schema.safeParse(validMetadata);
    expect(result.success).toBe(true);
  });

  it('should reject metadata with missing required fields', () => {
    const invalidMetadata = {
      title: 'Test Document',
      // missing documentType, id, path, etc.
    };

    const result = DocumentMetadataV2Schema.safeParse(invalidMetadata);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('should reject metadata with invalid UUID', () => {
    const invalidMetadata = {
      title: 'Test Document',
      documentType: 'test',
      id: 'not-a-uuid', // Invalid UUID
      path: 'test/document.json',
      tags: ['test'],
      lastModified: new Date().toISOString(), // Use ISO string
      createdAt: new Date().toISOString(), // Use ISO string
      version: 1
    };

    const result = DocumentMetadataV2Schema.safeParse(invalidMetadata);
    expect(result.success).toBe(false);
  });

  it('should reject metadata with invalid tags', () => {
    const invalidMetadata = {
      title: 'Test Document',
      documentType: 'test',
      id: '123e4567-e89b-12d3-a456-426614174000',
      path: 'test/document.json',
      tags: ['Invalid Tag', 'test'], // Invalid tag with uppercase and space
      lastModified: new Date().toISOString(), // Use ISO string
      createdAt: new Date().toISOString(), // Use ISO string
      version: 1
    };

    const result = DocumentMetadataV2Schema.safeParse(invalidMetadata);
    expect(result.success).toBe(false);
  });
});

describe('BaseJsonDocumentV2Schema', () => {
  it('should validate a correct base document structure (schema and documentType)', () => {
    // Base schema now only defines schema and documentType at the top level
    const validBaseStructure = {
      schema: SCHEMA_VERSION,
      documentType: 'any_valid_type_string', // Needs a non-empty string
      // metadata and content are not part of the base schema itself anymore
    };

    const result = BaseJsonDocumentV2Schema.safeParse(validBaseStructure);
    // If this fails, log the Zod error details
    if (!result.success) {
      console.error("BaseJsonDocumentV2Schema validation failed:", JSON.stringify(result.error.format(), null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('should reject document with wrong schema version', () => {
    const invalidDocument = {
      schema: 'wrong_version',
      metadata: {
        title: 'Test Document',
        documentType: 'test',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'test/document.json',
        tags: ['test'],
        lastModified: new Date().toISOString(), // Use ISO string
        createdAt: new Date().toISOString(), // Use ISO string
        version: 1
      },
      content: {
        key: 'value'
      }
    };

    const result = BaseJsonDocumentV2Schema.safeParse(invalidDocument);
    expect(result.success).toBe(false);
  });

  it('should reject document with empty content', () => {
    const invalidDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'Test Document',
        documentType: 'test',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'test/document.json',
        tags: ['test'],
        lastModified: new Date().toISOString(), // Use ISO string
        createdAt: new Date().toISOString(), // Use ISO string
        version: 1
      },
      content: {}  // Empty content
    };

    const result = BaseJsonDocumentV2Schema.safeParse(invalidDocument);
    // Base schema requires content not to be empty
    expect(result.success).toBe(false);
  });
});

describe('BranchContextJsonV2Schema', () => {
  it('should validate a correct branch context document', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'branch_context' as const, // Move documentType to top level
      metadata: {
        title: 'Branch Context',
        // documentType: 'branch_context', // Removed from metadata
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'branchContext.json',
        tags: ['branch-context'],
        lastModified: '2023-10-27T12:00:00.000Z',
        createdAt: '2023-10-26T12:00:00.000Z',
        version: 1
      },
      content: {
        purpose: 'Feature implementation',
        background: 'Some background info', // Optional field
        userStories: [
          {
            description: 'User can do something',
            completed: false // Default is false, explicitly setting is fine
          }
        ]
        // additionalNotes is missing, but it's optional in the schema
      }
    };

    const result = BranchContextJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });

  it('should reject branch context with wrong document type', () => {
    const invalidDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'wrong_type' as any, // Invalid literal at top level
      metadata: {
        title: 'Branch Context',
        // documentType: 'wrong_type', // Removed from metadata
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'branchContext.json',
        tags: ['branch-context'],
        lastModified: new Date().toISOString(), // Use ISO string
        createdAt: new Date().toISOString(), // Use ISO string
        version: 1
      },
      content: {
        purpose: 'Feature implementation',
        userStories: []
      }
    };

    const result = BranchContextJsonV2Schema.safeParse(invalidDocument);
    expect(result.success).toBe(false);
  });

  it('should reject branch context without required purpose', () => {
    const invalidDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'branch_context' as const, // Correct type at top level
      metadata: {
        title: 'Branch Context',
        // documentType: 'branch_context', // Removed from metadata
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'branchContext.json',
        tags: ['branch-context'],
        lastModified: new Date().toISOString(), // Use ISO string
        createdAt: new Date().toISOString(), // Use ISO string
        version: 1
      },
      content: {
        // Missing required field 'purpose'
        userStories: []
      }
    };

    const result = BranchContextJsonV2Schema.safeParse(invalidDocument);
    expect(result.success).toBe(false);
  });
});

describe('ActiveContextJsonV2Schema', () => {
  it('should validate a correct active context document', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'active_context' as const, // Move documentType to top level
      metadata: {
        title: 'Active Context',
        // documentType: 'active_context', // Removed from metadata
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'activeContext.json',
        tags: ['active-context'],
        lastModified: '2023-10-27T13:00:00.000Z',
        createdAt: '2023-10-26T13:00:00.000Z',
        version: 1
      },
      content: {
        currentWork: 'Working on feature X', // Optional
        recentChanges: [], // Optional, default []
        activeDecisions: [], // Optional, default []
        considerations: [], // Optional, default []
        nextSteps: [] // Optional, default []
      }
    };

    const result = ActiveContextJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });

  it('should accept active context with only optional fields', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'active_context' as const, // Move documentType to top level
      metadata: {
        title: 'Active Context',
        // documentType: 'active_context', // Removed from metadata
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'activeContext.json',
        tags: ['active-context'],
        lastModified: '2023-10-27T14:00:00.000Z',
        createdAt: '2023-10-26T14:00:00.000Z',
        version: 1
      },
      content: {
        // All content fields are optional or have defaults in ActiveContext schema
      }
    };

    const result = ActiveContextJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });
});

describe('ProgressJsonV2Schema', () => {
  it('should validate a correct progress document', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'progress' as const, // Move documentType to top level
      metadata: {
        title: 'Progress',
        // documentType: 'progress', // Removed from metadata
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'progress.json',
        tags: ['progress'],
        lastModified: '2023-10-27T15:00:00.000Z',
        createdAt: '2023-10-26T15:00:00.000Z',
        version: 1
      },
      content: {
        workingFeatures: [], // Optional, default []
        pendingImplementation: [], // Optional, default []
        status: 'In progress', // Optional
        // currentState: 'Phase 2', // This field is not in the Progress schema
        completionPercentage: 50, // Optional
        knownIssues: [] // Optional, default []
      }
    };

    const result = ProgressJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });

  it('should accept progress document with minimum required fields', () => {
    // status and completionPercentage are required according to the schema
    const validDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'progress' as const,
      metadata: {
        title: 'Progress',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'progress.json',
        tags: ['progress'],
        lastModified: '2023-10-27T16:00:00.000Z',
        createdAt: '2023-10-26T16:00:00.000Z',
        version: 1
      },
      content: {
        status: 'Initial', // Add required status
        completionPercentage: 0, // Add required completionPercentage
        // Optional fields with defaults can be omitted or explicitly set
        workingFeatures: [],
        pendingImplementation: [],
        knownIssues: [],
        // currentState is optional
      }
    };

    const result = ProgressJsonV2Schema.safeParse(validDocument);
    if (!result.success) {
      console.error("ProgressJsonV2Schema (minimum) validation failed:", JSON.stringify(result.error.format(), null, 2));
    }
    expect(result.success).toBe(true);
  });
});

describe('SystemPatternsJsonV2Schema', () => {
  it('should validate a correct system patterns document', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'system_patterns' as const, // Move documentType to top level
      metadata: {
        title: 'System Patterns',
        // documentType: 'system_patterns', // Removed from metadata
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'systemPatterns.json',
        tags: ['system-patterns'],
        lastModified: '2023-10-27T17:00:00.000Z',
        createdAt: '2023-10-26T17:00:00.000Z',
        version: 1
      },
      content: {
        technicalDecisions: [ // Optional, default []
          {
            title: 'Use TypeScript', // Required
            context: 'Need type safety', // Required
            decision: 'We will use TypeScript', // Required
            consequences: ['Better code quality', 'Requires compilation'] // Must be string[] with min 1 element
            // status, date, alternatives are not in the schema definition
          }
        ],
        implementationPatterns: [] // Optional, default []
      }
    };

    const result = SystemPatternsJsonV2Schema.safeParse(validDocument);
    if (!result.success) {
      console.error("SystemPatternsJsonV2Schema validation failed:", JSON.stringify(result.error.format(), null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('should accept system patterns with minimum fields', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'system_patterns' as const, // Move documentType to top level
      metadata: {
        title: 'System Patterns',
        // documentType: 'system_patterns', // Removed from metadata
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'systemPatterns.json',
        tags: ['system-patterns'],
        lastModified: '2023-10-27T18:00:00.000Z',
        createdAt: '2023-10-26T18:00:00.000Z',
        version: 1
      },
      content: {
        // technicalDecisions and implementationPatterns have defaults
      }
    };

    const result = SystemPatternsJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });

  it('should reject technical decision with missing required fields (e.g., title)', () => { // テストケース名を修正
    const invalidDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'system_patterns' as const, // Move documentType to top level
      metadata: {
        title: 'System Patterns',
        // documentType: 'system_patterns', // Removed from metadata
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'systemPatterns.json',
        tags: ['system-patterns'],
        lastModified: new Date().toISOString(), // Use ISO string
        createdAt: new Date().toISOString(), // Use ISO string
        version: 1
      },
      content: {
        technicalDecisions: [
          {
            // title: 'Use TypeScript', // title を削除して必須フィールド欠落をテスト
            context: 'Need type safety',
            decision: 'We will use TypeScript',
            // consequences は TechnicalDecisionContentV2Schema では string[] なので修正
            consequences: ['Consequence 1'],
            // date は TechnicalDecisionContentV2Schema にないので削除
            // date: new Date().toISOString(),
          }
        ]
      }
    };

    const result = SystemPatternsJsonV2Schema.safeParse(invalidDocument);
    expect(result.success).toBe(false);
    // title が欠落しているエラーを確認 (パスは content.technicalDecisions[0].title になるはず)
    expect(result.error?.errors.some((e: any) => e.path.includes('title'))).toBe(true);
  });
});

describe('GenericDocumentJsonV2Schema', () => {
  it('should validate a generic document', () => {
    // Generic schema expects documentType inside metadata
    const validDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'custom_type', // トップレベルに移動
      metadata: {
        title: 'Custom Document',
        // documentType: 'custom_type', // metadata から削除
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'custom.json',
        tags: ['custom'],
        lastModified: '2023-10-27T19:00:00.000Z',
        createdAt: '2023-10-26T19:00:00.000Z',
        version: 1
      },
      content: { // Content must not be empty
        customField: 'value',
        anotherField: 123
      }
    };

    const result = GenericDocumentJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });

  it('should reject generic document with empty content', () => {
    const invalidDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'Custom Document',
        documentType: 'custom_type',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'custom.json',
        tags: ['custom'],
        lastModified: new Date().toISOString(), // Use ISO string
        createdAt: new Date().toISOString(), // Use ISO string
        version: 1
      },
      content: {} // Empty content
    };

    const result = GenericDocumentJsonV2Schema.safeParse(invalidDocument);
    // Generic schema requires content not to be empty
    expect(result.success).toBe(false);
  });
});
