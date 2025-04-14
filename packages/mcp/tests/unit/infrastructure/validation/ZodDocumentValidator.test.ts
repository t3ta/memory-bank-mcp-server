import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ZodDocumentValidator } from '../../../../src/infrastructure/validation/ZodDocumentValidator.js';
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js';
import { z } from 'zod';

// Mock the dependencies
vi.mock('../../../../src/shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Import logger after mocking
import { logger } from '../../../../src/shared/utils/logger.js';

// Mock the schemas module - We need to keep SCHEMA_VERSION as literal type
vi.mock('@memory-bank/schemas', () => ({
  SCHEMA_VERSION: 'memory_document_v2' as const,
  BaseJsonDocumentV2Schema: {
    parse: vi.fn()
  },
  DocumentMetadataV2Schema: {
    parse: vi.fn()
  }
}));

// Import SCHEMA_VERSION after mocking
import { SCHEMA_VERSION, DocumentMetadataV2Schema, BaseJsonDocumentV2Schema } from '@memory-bank/schemas';

// Mock ZodDocumentSchemas methods
vi.mock('../../../../src/infrastructure/validation/ZodDocumentSchemas.js', () => ({
  normalizeContent: vi.fn().mockReturnValue({}),
  FlexibleContentSchema: {
    parse: vi.fn()
  },
  DocumentFormatSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} })
  },
  migrateDocumentFormat: vi.fn(doc => doc),
  getDocumentType: vi.fn().mockReturnValue('test_document'),
  DocumentSchemaMap: {},
  normalizeArrayContent: vi.fn().mockReturnValue({})
}));

// Import ZodDocumentSchemas after mocking
import * as ZodDocumentSchemas from '../../../../src/infrastructure/validation/ZodDocumentSchemas.js';

describe('ZodDocumentValidator', () => {
  let validator: ZodDocumentValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new ZodDocumentValidator();
  });

  describe('validateContent', () => {
    it('should validate valid content for a document type', () => {
      // Setup
      const documentType = 'test_document';
      const content = { key: 'value' };

      // Replace the mocks with direct spies
      const normalizeContentSpy = vi.spyOn(ZodDocumentSchemas, 'normalizeContent');
      const flexibleContentSchemaSpy = vi.spyOn(ZodDocumentSchemas.FlexibleContentSchema, 'parse');

      // No need to mock returns for successful case - default implementation should work

      // Execute & Verify
      expect(() => validator.validateContent(documentType, content)).not.toThrow();
      expect(normalizeContentSpy).toHaveBeenCalled();

      // Clean up
      normalizeContentSpy.mockRestore();
      flexibleContentSchemaSpy.mockRestore();
    });

    it('should throw DomainError for invalid content', () => {
      // Setup
      const documentType = 'test_document';
      const content = { key: 'value' };

      // We'll use a spy that doesn't affect the actual implementation
      const normalizeContentSpy = vi.spyOn(ZodDocumentSchemas, 'normalizeContent');

      // Force the FlexibleContentSchema to throw an error
      const flexibleSchemaSpy = vi.spyOn(ZodDocumentSchemas.FlexibleContentSchema, 'parse');
      flexibleSchemaSpy.mockImplementation(() => {
        throw new z.ZodError([{
          code: z.ZodIssueCode.custom,
          path: ['test'],
          message: 'Test error'
        }]);
      });

      // Execute & Verify
      try {
        validator.validateContent(documentType, content);
        // もし例外が発生しなかったらテストは失敗
        expect(true).toBe(false); // このラインは実行されるべきではない
      } catch (error) {
        expect(error instanceof DomainError).toBe(true);
        expect((error as DomainError).code).toBe('DOMAIN_ERROR.VALIDATION_ERROR');
      }

      // Clean up
      normalizeContentSpy.mockRestore();
      flexibleSchemaSpy.mockRestore();
    });
  });

  describe('validateDocument', () => {
    it('should validate valid document', () => {
      // Setup
      const document = {
        schema: SCHEMA_VERSION,
        documentType: 'test_document',
        metadata: {},
        content: {}
      };

      // Using spies instead of mocks
      const migrateSpy = vi.spyOn(ZodDocumentSchemas, 'migrateDocumentFormat');
      const safeParseSpry = vi.spyOn(ZodDocumentSchemas.DocumentFormatSchema, 'safeParse');

      // Execute & Verify
      expect(() => validator.validateDocument(document)).not.toThrow();
      expect(migrateSpy).toHaveBeenCalled();

      // Clean up
      migrateSpy.mockRestore();
      safeParseSpry.mockRestore();
    });

    it('should throw DomainError when document is not an object', () => {
      // Execute & Verify
      expect(() => validator.validateDocument('not an object'))
        .toThrow(DomainError);
      expect(() => validator.validateDocument('not an object'))
        .toThrow(/.*Document must be an object.*/);
    });

    it('should throw DomainError when document format validation fails', () => {
      // Setup
      const document = {};

      // Use spies
      const migrateSpy = vi.spyOn(ZodDocumentSchemas, 'migrateDocumentFormat');
      const safeParseSpry = vi.spyOn(ZodDocumentSchemas.DocumentFormatSchema, 'safeParse');

      // Mock only the safeParse to fail
      safeParseSpry.mockReturnValueOnce({
        success: false,
        error: new z.ZodError([{
          code: z.ZodIssueCode.custom,
          path: ['test'],
          message: 'Test error'
        }])
      });

      // Execute & Verify
      expect(() => validator.validateDocument(document))
        .toThrow(DomainError);
      expect(logger.error).toHaveBeenCalled();

      // Clean up
      migrateSpy.mockRestore();
      safeParseSpry.mockRestore();
    });

    it('should throw DomainError when document type is missing', () => {
      // Setup
      const document = {
        schema: SCHEMA_VERSION,
        metadata: {}
      };

      // Use spies
      const migrateSpy = vi.spyOn(ZodDocumentSchemas, 'migrateDocumentFormat');
      // Return the document as is
      migrateSpy.mockImplementation(doc => doc);

      const safeParseSpry = vi.spyOn(ZodDocumentSchemas.DocumentFormatSchema, 'safeParse');
      // Make safeParse succeed
      safeParseSpry.mockReturnValueOnce({
        success: true,
        data: {
          schema: SCHEMA_VERSION as const,
          ...(document as any)
        }
      });

      const getDocTypeSpry = vi.spyOn(ZodDocumentSchemas, 'getDocumentType');
      // Make getDocumentType return undefined
      getDocTypeSpry.mockReturnValueOnce(undefined);

      // Execute & Verify
      try {
        validator.validateDocument(document);
        // もし例外が発生しなかったらテストは失敗
        expect(true).toBe(false); // このラインは実行されるべきではない
      } catch (error) {
        expect(error instanceof DomainError).toBe(true);
        expect((error as Error).message).toMatch(/.*Document type is missing or invalid.*/);
      }

      // Clean up
      migrateSpy.mockRestore();
      safeParseSpry.mockRestore();
      getDocTypeSpry.mockRestore();
    });
  });

  // validateMetadataのテストケース
  describe('validateMetadata', () => {
    it('should validate valid metadata', () => {
      // Setup
      const metadata = {
        path: 'test/path',
        title: 'Test Document',
        id: '123',
        tags: ['tag1', 'tag2'],
        lastModified: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        version: 1
      };

      // Use spy instead of full mock
      const parseSpy = vi.spyOn(DocumentMetadataV2Schema, 'parse');

      // Execute & Verify
      expect(() => validator.validateMetadata(metadata)).not.toThrow();
      expect(validator.validateMetadata(metadata)).toBe(true);
      expect(parseSpy).toHaveBeenCalled();

      // Clean up
      parseSpy.mockRestore();
    });

    it('should throw DomainError for invalid metadata with ZodError', () => {
      // Setup - must include all required fields with invalid type
      const metadata = {
        path: 'test/path',
        title: 123, // should be string
        id: '123',
        tags: ['tag1', 'tag2'],
        lastModified: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        version: 1
      };

      // Use spy and make it throw
      const parseSpy = vi.spyOn(DocumentMetadataV2Schema, 'parse');
      parseSpy.mockImplementationOnce(() => {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.invalid_type,
            expected: 'string',
            received: 'number',
            path: ['title'],
            message: 'Expected string, received number'
          }
        ]);
      });

      // Execute & Verify
      try {
        validator.validateMetadata(metadata as any);
        // もし例外が発生しなかったらテストは失敗
        expect(true).toBe(false); // このラインは実行されるべきではない
      } catch (error) {
        expect(error instanceof DomainError).toBe(true);
        expect((error as Error).message).toMatch(/.*Invalid document metadata.*/);
      }

      // Clean up
      parseSpy.mockRestore();
    });

    it('should throw DomainError with non-Zod error message for other errors', () => {
      // Setup
      const metadata = {
        path: 'test/path',
        title: 'Test Document',
        id: '123',
        lastModified: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        version: 1
      };

      // Use spy and make it throw a regular error
      const parseSpy = vi.spyOn(DocumentMetadataV2Schema, 'parse');
      parseSpy.mockImplementationOnce(() => {
        throw new Error('Some unexpected error');
      });

      // Execute & Verify
      try {
        validator.validateMetadata(metadata);
        // もし例外が発生しなかったらテストは失敗
        expect(true).toBe(false); // このラインは実行されるべきではない
      } catch (error) {
        expect(error instanceof DomainError).toBe(true);
        expect((error as Error).message).toMatch(/.*Some unexpected error.*/);
      }

      // Clean up
      parseSpy.mockRestore();
    });
  });

  describe('getSchemaVersion', () => {
    it('should return the correct schema version', () => {
      // Execute & Verify
      expect(validator.getSchemaVersion()).toBe(SCHEMA_VERSION);
      expect(validator.getSchemaVersion()).toBe('memory_document_v2');
    });
  });
});
