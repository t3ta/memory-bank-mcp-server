import { z } from 'zod';
import {
  SCHEMA_VERSION,
  DocumentMetadataV2Schema,
  BaseJsonDocumentV2Schema,
  DocumentMetadataV2,
  BaseJsonDocumentV2,
} from '../../../src/v2/json-document'; // Adjust path as needed

describe('JSON Document Schemas v2', () => {
  describe('DocumentMetadataV2Schema', () => {
    // documentType はメタデータから削除された
    const validMetadata: Omit<DocumentMetadataV2, 'documentType'> = {
      title: 'Valid Title',
      // documentType: 'generic', // Removed
      id: '123e4567-e89b-12d3-a456-426614174000',
      path: 'valid/path.json',
      tags: ['tag-1', 'tag2'],
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      version: 1,
    };

    it('should validate correct metadata', () => {
      const result = DocumentMetadataV2Schema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('should provide default version if missing', () => {
       const metadataWithoutVersion = { ...validMetadata };
       delete (metadataWithoutVersion as any).version; // Remove version for test
       const result = DocumentMetadataV2Schema.safeParse(metadataWithoutVersion);
       expect(result.success).toBe(true);
       if (result.success) {
         expect(result.data.version).toBe(1); // Check default value
       }
    });

    it('should fail validation if title is empty', () => {
      const invalidMetadata = { ...validMetadata, title: '' };
      const result = DocumentMetadataV2Schema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['title']);
        expect(result.error.errors[0].message).toContain('空にできません');
      }
    });

    it('should fail validation if id is not a UUID', () => {
      const invalidMetadata = { ...validMetadata, id: 'not-a-uuid' };
      const result = DocumentMetadataV2Schema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
       if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['id']);
        expect(result.error.errors[0].message).toContain('UUIDフォーマットではありません');
      }
    });

     it('should fail validation if path is empty', () => {
      const invalidMetadata = { ...validMetadata, path: '' };
      const result = DocumentMetadataV2Schema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
       if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['path']);
        expect(result.error.errors[0].message).toContain('空にできません');
      }
    });

    it('should fail validation if tags contain invalid characters', () => {
      const invalidMetadata = { ...validMetadata, tags: ['valid', 'Invalid_Tag'] };
      const result = DocumentMetadataV2Schema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
       if (!result.success) {
        // Zod reports path within the array
        expect(result.error.errors[0].path).toEqual(['tags', 1]);
        expect(result.error.errors[0].message).toContain('タグは小文字英数字とハイフンのみ使用可能です');
      }
    });

     it('should fail validation if lastModified is not a valid ISO date', () => {
      const invalidMetadata = { ...validMetadata, lastModified: '2023-13-01' }; // Invalid month
      const result = DocumentMetadataV2Schema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
       if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['lastModified']);
        expect(result.error.errors[0].message).toContain('ISO 8601形式の日付ではありません');
      }
    });

     it('should fail validation if version is not a positive integer', () => {
      const invalidMetadataNegative = { ...validMetadata, version: -1 };
      const resultNegative = DocumentMetadataV2Schema.safeParse(invalidMetadataNegative);
      expect(resultNegative.success).toBe(false);

      const invalidMetadataZero = { ...validMetadata, version: 0 };
      const resultZero = DocumentMetadataV2Schema.safeParse(invalidMetadataZero);
      expect(resultZero.success).toBe(false);

       const invalidMetadataFloat = { ...validMetadata, version: 1.5 };
      const resultFloat = DocumentMetadataV2Schema.safeParse(invalidMetadataFloat);
      expect(resultFloat.success).toBe(false);
    });

     it('should allow optional tags', () => {
       const metadataWithoutTags = { ...validMetadata };
       delete metadataWithoutTags.tags;
       const result = DocumentMetadataV2Schema.safeParse(metadataWithoutTags);
       expect(result.success).toBe(true);
       if (result.success) {
         expect(result.data.tags).toBeUndefined(); // Should be undefined if not provided
       }
     });

  });

  describe('BaseJsonDocumentV2Schema', () => {
     // BaseJsonDocumentV2 は schema と documentType のみを持つようになった
     const validBaseDoc: BaseJsonDocumentV2 = {
      schema: SCHEMA_VERSION,
      documentType: 'base_type_for_test', // documentType をトップレベルに追加
      // metadata と content は Base スキーマから削除された
      // metadata: { ... },
      // content: { ... },
    };

    it('should validate a correct base document', () => {
      const result = BaseJsonDocumentV2Schema.safeParse(validBaseDoc);
      expect(result.success).toBe(true);
    });

    it('should fail if schema literal does not match', () => {
      const invalidDoc = { ...validBaseDoc, schema: 'memory_document_v1' };
      const result = BaseJsonDocumentV2Schema.safeParse(invalidDoc);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['schema']);
      }
    });

    // metadata と content は Base スキーマに含まれなくなったため、これらのテストは削除
    // it('should fail if metadata is invalid', () => { ... });
    // it('should fail if content is empty object', () => { ... });
    // it('should fail if content is not an object', () => { ... });

    // documentType のバリデーションテストを追加
    it('should fail if documentType is empty', () => {
      const invalidDoc = { ...validBaseDoc, documentType: '' };
      const result = BaseJsonDocumentV2Schema.safeParse(invalidDoc);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['documentType']);
        expect(result.error.errors[0].message).toContain('空にできません');
      }
    });
  });
});
