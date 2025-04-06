/**
 * Integration tests for schema components
 *
 * These tests validate that different schema components work correctly together
 * and validate common real-world examples.
 */

import {
  // BaseJsonDocumentV2Schema, // 使わないので削除
  SCHEMA_VERSION
} from '../../src/v2/json-document.js';
import { JsonDocumentV2Schema } from '../../src/v2/document-union.js'; // JsonDocumentV2Schema をインポート
import { TAG_INDEX_VERSION } from '../../src/v2/tag-index.js';
import { ValidationResult } from '../../src/types/index.js';

describe('Document validation integration', () => {
  it('should validate a complete document with multiple tags', () => {
    // JsonDocumentV2Schema に合わせてテストデータを修正
    const document = {
      schema: SCHEMA_VERSION,
      documentType: 'branch_context' as const, // documentType を有効なリテラル値に変更
      metadata: { // metadata をネスト
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Complete Document',
        // documentType はトップレベルに移動済み
        path: 'test/complete.json',
        tags: ['test', 'integration', 'example'],
        lastModified: '2025-03-27T12:00:00Z',
        createdAt: '2025-03-26T10:00:00Z',
        version: 1
      },
      content: { // content を BranchContextContentV2Schema に合わせる
        purpose: 'Integration test for a complete document', // purpose を追加
        userStories: [ // userStories を追加 (空でもOK)
          { description: 'Story 1', completed: true },
          { description: 'Story 2' } // completed は default(false)
        ],
        // background は optional なので省略
      }
    };

    const result = JsonDocumentV2Schema.safeParse(document); // BaseJsonDocumentV2Schema -> JsonDocumentV2Schema
    expect(result.success).toBe(true);
  });

  it('should handle validation errors with useful messages', () => {
    // JsonDocumentV2Schema に合わせてテストデータを修正
    const invalidDocument = {
      schema: SCHEMA_VERSION,
      documentType: 'branch_context' as const, // documentType を有効なリテラル値に変更
      metadata: { // metadata をネスト
        // Missing required id
        title: 'Invalid Document',
        // documentType はトップレベルに移動済み
        path: 'test/invalid.json',
        tags: ['test'],
        lastModified: '2025-03-27T12:00:00Z',
        createdAt: '2025-03-26T10:00:00Z',
        version: 1
      },
      content: { // content を BranchContextContentV2Schema に合わせる (id 欠損テストなので content は有効な形にする)
        purpose: 'Integration test for invalid metadata', // purpose を追加
        userStories: [] // userStories を追加
      }
    };

    const result = JsonDocumentV2Schema.safeParse(invalidDocument); // BaseJsonDocumentV2Schema -> JsonDocumentV2Schema
    expect(result.success).toBe(false);

    if (!result.success) {
      // There should be at least one error message about the missing id
      // エラーパスが metadata.id になっていることを確認
      const hasIdError = result.error.issues.some((issue: any) =>
        issue.path.length === 2 && issue.path[0] === 'metadata' && issue.path[1] === 'id'
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
