/**
 * Tests for v2 JSON document schemas
 */
import {
  DocumentMetadataV2Schema,
  BaseJsonDocumentV2Schema,
  BranchContextJsonV2Schema,
  ActiveContextJsonV2Schema,
  ProgressJsonV2Schema,
  SystemPatternsJsonV2Schema,
  GenericDocumentJsonV2Schema,
  SCHEMA_VERSION
} from '../../src/v2/json-document.js';

describe('DocumentMetadataV2Schema', () => {
  it('should validate correct metadata', () => {
    const validMetadata = {
      title: 'Test Document',
      documentType: 'test',
      id: '123e4567-e89b-12d3-a456-426614174000',
      path: 'test/document.json',
      tags: ['test', 'example'],
      lastModified: new Date(),
      createdAt: new Date(),
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
      id: 'not-a-uuid',
      path: 'test/document.json',
      tags: ['test'],
      lastModified: new Date(),
      createdAt: new Date(),
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
      tags: ['Invalid Tag', 'test'],  // Invalid tag with uppercase and space
      lastModified: new Date(),
      createdAt: new Date(),
      version: 1
    };
    
    const result = DocumentMetadataV2Schema.safeParse(invalidMetadata);
    expect(result.success).toBe(false);
  });
});

describe('BaseJsonDocumentV2Schema', () => {
  it('should validate a correct base document', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'Test Document',
        documentType: 'test',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'test/document.json',
        tags: ['test'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
        key: 'value',
        array: [1, 2, 3]
      }
    };
    
    const result = BaseJsonDocumentV2Schema.safeParse(validDocument);
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
        lastModified: new Date(),
        createdAt: new Date(),
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
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {}  // Empty content
    };
    
    const result = BaseJsonDocumentV2Schema.safeParse(invalidDocument);
    expect(result.success).toBe(false);
  });
});

describe('BranchContextJsonV2Schema', () => {
  it('should validate a correct branch context document', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'Branch Context',
        documentType: 'branch_context',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'branchContext.json',
        tags: ['branch-context'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
        purpose: 'Feature implementation',
        background: 'Some background info',
        userStories: [
          {
            description: 'User can do something',
            completed: false
          }
        ]
      }
    };
    
    const result = BranchContextJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });
  
  it('should reject branch context with wrong document type', () => {
    const invalidDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'Branch Context',
        documentType: 'wrong_type', // Should be branch_context
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'branchContext.json',
        tags: ['branch-context'],
        lastModified: new Date(),
        createdAt: new Date(),
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
      metadata: {
        title: 'Branch Context',
        documentType: 'branch_context',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'branchContext.json',
        tags: ['branch-context'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
        // Missing purpose
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
      metadata: {
        title: 'Active Context',
        documentType: 'active_context',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'activeContext.json',
        tags: ['active-context'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
        currentWork: 'Working on feature X',
        recentChanges: ['Change 1', 'Change 2'],
        activeDecisions: ['Decision 1'],
        considerations: ['Consideration 1'],
        nextSteps: ['Step 1', 'Step 2']
      }
    };
    
    const result = ActiveContextJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });
  
  it('should accept active context with only optional fields', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'Active Context',
        documentType: 'active_context',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'activeContext.json',
        tags: ['active-context'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
        // All fields are optional for ActiveContext
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
      metadata: {
        title: 'Progress',
        documentType: 'progress',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'progress.json',
        tags: ['progress'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
        workingFeatures: ['Feature 1', 'Feature 2'],
        pendingImplementation: ['Feature 3'],
        status: 'In progress',
        currentState: 'Phase 2',
        knownIssues: ['Issue 1']
      }
    };
    
    const result = ProgressJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });
  
  it('should accept progress document with minimum fields', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'Progress',
        documentType: 'progress',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'progress.json',
        tags: ['progress'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
        // All fields are optional or have defaults
      }
    };
    
    const result = ProgressJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });
});

describe('SystemPatternsJsonV2Schema', () => {
  it('should validate a correct system patterns document', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'System Patterns',
        documentType: 'system_patterns',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'systemPatterns.json',
        tags: ['system-patterns'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
        technicalDecisions: [
          {
            title: 'Use TypeScript',
            context: 'Need type safety',
            decision: 'We will use TypeScript',
            consequences: ['Better code quality', 'Requires compilation']
          }
        ]
      }
    };
    
    const result = SystemPatternsJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });
  
  it('should accept system patterns with empty technical decisions', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'System Patterns',
        documentType: 'system_patterns',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'systemPatterns.json',
        tags: ['system-patterns'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
        technicalDecisions: []
      }
    };
    
    const result = SystemPatternsJsonV2Schema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });
  
  it('should reject technical decision with missing consequences', () => {
    const invalidDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'System Patterns',
        documentType: 'system_patterns',
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'systemPatterns.json',
        tags: ['system-patterns'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
        technicalDecisions: [
          {
            title: 'Use TypeScript',
            context: 'Need type safety',
            decision: 'We will use TypeScript',
            consequences: [] // Empty array, should have at least one
          }
        ]
      }
    };
    
    const result = SystemPatternsJsonV2Schema.safeParse(invalidDocument);
    expect(result.success).toBe(false);
  });
});

describe('GenericDocumentJsonV2Schema', () => {
  it('should validate a generic document with any document type', () => {
    const validDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        title: 'Custom Document',
        documentType: 'custom_type', // Any document type works
        id: '123e4567-e89b-12d3-a456-426614174000',
        path: 'custom.json',
        tags: ['custom'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {
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
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1
      },
      content: {} // Empty content
    };
    
    const result = GenericDocumentJsonV2Schema.safeParse(invalidDocument);
    expect(result.success).toBe(false);
  });
});
