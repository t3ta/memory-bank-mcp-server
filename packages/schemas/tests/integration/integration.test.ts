/**
 * Integration tests for schema components
 * 
 * These tests validate that different schema components work correctly together
 * and validate common real-world examples.
 */

import { 
  BaseJsonDocumentV2Schema,
  SCHEMA_VERSION 
} from '../../src/v2/json-document.js';
import { TAG_INDEX_VERSION } from '../../src/v2/tag-index.js';
import { ValidationResult } from '../../src/types/index.js';

describe('Document validation integration', () => {
  it('should validate a complete document with multiple tags', () => {
    const document = {
      schema: SCHEMA_VERSION,
      metadata: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Complete Document',
        documentType: 'test',
        path: 'test/complete.json',
        tags: ['test', 'integration', 'example'],
        lastModified: '2025-03-27T12:00:00Z',
        createdAt: '2025-03-26T10:00:00Z',
        version: 1
      },
      content: {
        section1: {
          title: 'Section 1',
          items: ['Item 1', 'Item 2', 'Item 3']
        },
        section2: {
          title: 'Section 2',
          description: 'This is section 2',
          values: {
            key1: 'value1',
            key2: 123,
            key3: true
          }
        },
        nested: {
          level1: {
            level2: {
              level3: 'Deep nesting'
            }
          }
        }
      }
    };
    
    const result = BaseJsonDocumentV2Schema.safeParse(document);
    expect(result.success).toBe(true);
  });
  
  it('should handle validation errors with useful messages', () => {
    const invalidDocument = {
      schema: SCHEMA_VERSION,
      metadata: {
        // Missing required id
        title: 'Invalid Document',
        documentType: 'test',
        path: 'test/invalid.json',
        tags: ['test'],
        lastModified: '2025-03-27T12:00:00Z',
        createdAt: '2025-03-26T10:00:00Z',
        version: 1
      },
      content: {
        data: 'Some content'
      }
    };
    
    const result = BaseJsonDocumentV2Schema.safeParse(invalidDocument);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      // There should be at least one error message about the missing id
      const hasIdError = result.error.issues.some((issue: any) => 
        issue.path.includes('id') || issue.message.toLowerCase().includes('id')
      );
      expect(hasIdError).toBe(true);
    }
  });
  
  it('should map ValidationResult type correctly', () => {
    // Create a validation result object
    const successfulValidation: ValidationResult = {
      success: true
    };
    
    const failedValidation: ValidationResult = {
      success: false,
      errors: [
        {
          message: 'Validation failed',
          path: ['document', 'field']
        }
      ]
    };
    
    expect(successfulValidation.success).toBe(true);
    expect(failedValidation.success).toBe(false);
    expect(failedValidation.errors?.[0].message).toBe('Validation failed');
  });
  
  it('should check schema version constants are correct', () => {
    // Verify that exported constants have the expected values
    expect(SCHEMA_VERSION).toBe('memory_document_v2');
    expect(TAG_INDEX_VERSION).toBe('tag_index_v1');
  });
});
