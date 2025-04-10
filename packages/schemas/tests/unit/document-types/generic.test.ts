// import { z } from 'zod'; // 未使用なので削除
import {
  GenericDocumentJsonV2Schema,
  GenericDocumentJsonV2,
} from '../../../src/document-types/generic.js'; // .js 追加
import { SCHEMA_VERSION } from '../../../src/v2/json-document.js'; // .js 追加

// Helper to create minimal valid metadata for testing generic docs
// Note: documentType is NOT part of metadata in the new structure
const createGenericTestMetadata = (overrides = {}) => ({
  title: 'Test Generic Document',
  id: '444e4567-e89b-12d3-a456-426614174000', // Use a fixed valid UUID
  path: 'test/generic.json',
  tags: ['test', 'generic'],
  lastModified: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  version: 1,
  ...overrides,
});

describe('GenericDocumentJsonV2Schema', () => {
  const validGenericDoc: GenericDocumentJsonV2 = {
    schema: SCHEMA_VERSION,
    documentType: 'my-custom-type', // Can be any non-empty string
    metadata: createGenericTestMetadata(),
    content: {
      someData: 'value',
      nested: { list: [1, 2, 3] },
    },
  };

  it('should validate a correct generic document', () => {
    const result = GenericDocumentJsonV2Schema.safeParse(validGenericDoc);
    expect(result.success).toBe(true);
  });

  it('should validate with a different valid documentType', () => {
    const docWithDifferentType = {
      ...validGenericDoc,
      documentType: 'another-valid-type-123',
    };
    const result = GenericDocumentJsonV2Schema.safeParse(docWithDifferentType);
    expect(result.success).toBe(true);
  });

  it('should validate with different valid content', () => {
    const docWithDifferentContent = {
      ...validGenericDoc,
      content: { onlyOneKey: true },
    };
    const result = GenericDocumentJsonV2Schema.safeParse(docWithDifferentContent);
    expect(result.success).toBe(true);
  });

  it('should fail if schema version is incorrect', () => {
    const invalidDoc = { ...validGenericDoc, schema: 'invalid-version' };
    const result = GenericDocumentJsonV2Schema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['schema']);
    }
  });

  it('should fail if documentType is empty', () => {
    const invalidDoc = { ...validGenericDoc, documentType: '' };
    const result = GenericDocumentJsonV2Schema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['documentType']);
      expect(result.error.errors[0].message).toContain('空にできません');
    }
  });

   it('should fail if metadata is invalid (e.g., empty title)', () => {
    const invalidDoc = {
      ...validGenericDoc,
      metadata: { ...validGenericDoc.metadata, title: '' },
    };
    const result = GenericDocumentJsonV2Schema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['metadata', 'title']);
    }
  });

   it('should fail if content is an empty object', () => {
    const invalidDoc = { ...validGenericDoc, content: {} };
    const result = GenericDocumentJsonV2Schema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['content']);
      expect(result.error.errors[0].message).toBe('Content cannot be empty');
    }
  });

   it('should fail if content is not an object', () => {
    const invalidDoc = { ...validGenericDoc, content: 'not-an-object' as any };
    const result = GenericDocumentJsonV2Schema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
     if (!result.success) {
      // The error path might vary slightly depending on Zod version, but should point to content
      expect(result.error.errors[0].path).toEqual(['content']);
    }
  });

});
