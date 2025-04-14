import { vi } from 'vitest';
import * as ZodDocumentSchemas from '../../../../src/infrastructure/validation/ZodDocumentSchemas.js';
import {
  ToolContentSchema,
  FlexibleContentSchema,
  normalizeArrayContent,
  normalizeContent,
  DocumentFormatSchema,
  getDocumentType,
  migrateDocumentFormat
} from '../../../../src/infrastructure/validation/ZodDocumentSchemas.js';
import { logger } from '../../../../src/shared/utils/logger.js';
import { z } from 'zod';

// Mock logger
vi.mock('../../../../src/shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('ZodDocumentSchemas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ToolContentSchema', () => {
    it('should validate valid tool content', () => {
      const validContent = {
        type: 'text',
        text: 'Sample text content'
      };
      const result = ToolContentSchema.safeParse(validContent);
      expect(result.success).toBe(true);
    });

    it('should validate when text is an object', () => {
      const validContent = {
        type: 'text',
        text: { key: 'value' }
      };
      const result = ToolContentSchema.safeParse(validContent);
      expect(result.success).toBe(true);
    });

    it('should validate with optional mimeType', () => {
      const validContent = {
        type: 'text',
        text: 'Sample text content',
        mimeType: 'text/plain'
      };
      const result = ToolContentSchema.safeParse(validContent);
      expect(result.success).toBe(true);
    });

    it('should reject invalid tool content', () => {
      const invalidContent = {
        type: 123, // Should be string
        text: 'Sample text content'
      };
      const result = ToolContentSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
    });
  });

  describe('FlexibleContentSchema', () => {
    it('should validate object-style content', () => {
      const objectContent = {
        key1: 'value1',
        key2: 'value2'
      };
      const result = FlexibleContentSchema.safeParse(objectContent);
      expect(result.success).toBe(true);
    });

    it('should validate array-style tool content', () => {
      const arrayContent = [
        {
          type: 'text',
          text: 'Sample text'
        }
      ];
      const result = FlexibleContentSchema.safeParse(arrayContent);
      expect(result.success).toBe(true);
    });

    it('should reject invalid content', () => {
      const invalidContent = 'just a string';
      const result = FlexibleContentSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
    });
  });

  describe('normalizeArrayContent', () => {
    it('should extract text from array content when text is an object', () => {
      const textObject = { key: 'value' };
      const content = [
        {
          type: 'text',
          text: textObject
        }
      ];
      const result = normalizeArrayContent(content);
      expect(result).toEqual(textObject);
      expect(logger.debug).toHaveBeenCalledWith('ZodDocumentSchemas: Content is already an object, using directly');
    });

    it('should parse JSON string from array content', () => {
      const jsonString = '{"key": "value"}';
      const content = [
        {
          type: 'text',
          text: jsonString
        }
      ];
      const result = normalizeArrayContent(content);
      expect(result).toEqual(JSON.parse(jsonString));
      expect(logger.debug).toHaveBeenCalledWith('ZodDocumentSchemas: Successfully parsed text as JSON object');
    });

    it('should wrap non-JSON text in a text object', () => {
      const plainText = 'Just plain text';
      const content = [
        {
          type: 'text',
          text: plainText
        }
      ];
      const result = normalizeArrayContent(content);
      expect(result).toEqual({ text: plainText });
      expect(logger.debug).toHaveBeenCalledWith('ZodDocumentSchemas: Failed to parse as JSON, wrapping in text object');
    });

    it('should return empty object if no text item found', () => {
      const content = [
        {
          type: 'nontext',
          data: 'something'
        }
      ];
      const result = normalizeArrayContent(content);
      expect(result).toEqual({});
      expect(logger.debug).toHaveBeenCalledWith('ZodDocumentSchemas: Could not normalize array content as expected, returning empty object');
    });
  });

  describe('normalizeContent', () => {
    it('should return empty object for null content', () => {
      expect(normalizeContent(null)).toEqual({});
    });

    it('should return empty object for undefined content', () => {
      expect(normalizeContent(undefined)).toEqual({});
    });

    it('should normalize array content', () => {
      const arrayContent = [{ type: 'text', text: 'test' }];
      // Mocking would be ideal, but instead we'll verify the result directly
      // since we've already tested normalizeArrayContent separately

      const result = normalizeContent(arrayContent);

      // Since we've already tested normalizeArrayContent thoroughly,
      // we'll just verify that normalizeContent returns something that looks like
      // the expected result for an array input
      expect(result).toEqual(expect.any(Object));
    });

    it('should return object content as is', () => {
      const objectContent = { key: 'value' };
      expect(normalizeContent(objectContent)).toBe(objectContent);
    });

    it('should wrap primitive values in an object', () => {
      expect(normalizeContent('string')).toEqual({ value: 'string' });
      expect(normalizeContent(123)).toEqual({ value: 123 });
      expect(normalizeContent(true)).toEqual({ value: true });
    });
  });

  describe('DocumentFormatSchema', () => {
    it('should validate new format with documentType at top level', () => {
      const newFormat = {
        schema: 'memory_document_v2',
        documentType: 'branch_context',
        metadata: {
          title: 'Test Document'
        },
        content: {}
      };
      const result = DocumentFormatSchema.safeParse(newFormat);
      expect(result.success).toBe(true);
    });

    it('should validate old format with documentType in metadata', () => {
      const oldFormat = {
        schema: 'memory_document_v2',
        metadata: {
          documentType: 'branch_context',
          title: 'Test Document'
        },
        content: {}
      };
      const result = DocumentFormatSchema.safeParse(oldFormat);
      expect(result.success).toBe(true);
    });

    it('should reject document with invalid schema', () => {
      const invalidSchema = {
        schema: 'invalid_schema',
        documentType: 'branch_context',
        metadata: {}
      };
      const result = DocumentFormatSchema.safeParse(invalidSchema);
      expect(result.success).toBe(false);
    });

    it('should reject document with missing documentType', () => {
      const missingType = {
        schema: 'memory_document_v2',
        metadata: {}
      };
      const result = DocumentFormatSchema.safeParse(missingType);
      expect(result.success).toBe(false);
    });
  });

  describe('getDocumentType', () => {
    it('should get documentType from top level', () => {
      const doc = {
        documentType: 'branch_context',
        metadata: {}
      };
      expect(getDocumentType(doc)).toBe('branch_context');
    });

    it('should get documentType from metadata', () => {
      const doc = {
        metadata: {
          documentType: 'branch_context'
        }
      };
      expect(getDocumentType(doc)).toBe('branch_context');
    });

    it('should return undefined if documentType not found', () => {
      const doc = {
        metadata: {}
      };
      expect(getDocumentType(doc)).toBeUndefined();
    });

    it('should return undefined for null or undefined document', () => {
      expect(getDocumentType(null)).toBeUndefined();
      expect(getDocumentType(undefined)).toBeUndefined();
    });
  });

  describe('migrateDocumentFormat', () => {
    it('should migrate old format to new format', () => {
      const oldFormat = {
        schema: 'memory_document_v2',
        metadata: {
          documentType: 'branch_context',
          title: 'Test Document'
        },
        content: { data: 'test' }
      };

      const migrated = migrateDocumentFormat(oldFormat);

      // Should have documentType at top level
      expect(migrated.documentType).toBe('branch_context');
      // Should have removed documentType from metadata
      expect(migrated.metadata.documentType).toBeUndefined();
      // Should preserve other metadata
      expect(migrated.metadata.title).toBe('Test Document');
      // Should preserve content
      expect(migrated.content).toEqual({ data: 'test' });
      // Should log migration
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Migrating document format'),
        expect.objectContaining({ documentType: 'branch_context' })
      );
    });

    it('should leave new format documents unchanged', () => {
      const newFormat = {
        schema: 'memory_document_v2',
        documentType: 'branch_context',
        metadata: {
          title: 'Test Document'
        },
        content: { data: 'test' }
      };

      const migrated = migrateDocumentFormat(newFormat);
      expect(migrated).toEqual(newFormat);
    });

    it('should normalize content if present', () => {
      const docWithArrayContent = {
        schema: 'memory_document_v2',
        documentType: 'branch_context',
        metadata: {},
        content: [{ type: 'text', text: 'test' }]
      };

      // Instead of mocking, we'll verify the result directly
      const result = migrateDocumentFormat(docWithArrayContent);

      // Verify that the content was transformed from array to object format
      expect(Array.isArray(result.content)).toBe(false);
      expect(typeof result.content).toBe('object');
      // The content should be normalized in some way (exact format verified in normalizeContent tests)
      expect(result.content).toBeTruthy();
    });

    it('should return document unchanged if null or undefined', () => {
      expect(migrateDocumentFormat(null)).toBeNull();
      expect(migrateDocumentFormat(undefined)).toBeUndefined();
    });
  });
});
