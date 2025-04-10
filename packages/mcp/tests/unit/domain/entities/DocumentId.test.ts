import { DocumentId } from '../../../../src/domain/entities/DocumentId.js'; // .js 追加
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js'; // .js 追加
import { validate as uuidValidate } from 'uuid';

describe('DocumentId Unit Tests', () => {
  describe('create', () => {
    it('should create an instance with a valid UUID string', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const docId = DocumentId.create(validUuid);
      expect(docId).toBeInstanceOf(DocumentId);
      expect(docId.value).toBe(validUuid);
    });

    it('should throw an error for an empty string', () => {
      try {
        DocumentId.create('');
        fail('Expected DomainError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.INVALID_DOCUMENT_ID}`);
        expect((error as DomainError).message).toBe('Document ID cannot be empty');
      }
    });

    it('should throw an error for an invalid UUID string', () => {
      const invalidUuid = 'not-a-uuid';
      try {
        DocumentId.create(invalidUuid);
        fail('Expected DomainError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.INVALID_DOCUMENT_ID}`);
        expect((error as DomainError).message).toBe('Document ID must be a valid UUID');
      }
    });
  });

  describe('generate', () => {
    it('should generate a new valid DocumentId instance', () => {
      const docId = DocumentId.generate();
      expect(docId).toBeInstanceOf(DocumentId);
      // Check if the generated value is a valid UUID v4
      expect(uuidValidate(docId.value)).toBe(true);
    });

    it('should generate different IDs on multiple calls', () => {
      const id1 = DocumentId.generate();
      const id2 = DocumentId.generate();
      expect(id1.value).not.toBe(id2.value);
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('value getter', () => {
    it('should return the correct UUID string for the value property', () => {
      const validUuid = '789e4567-e89b-12d3-a456-426614174888';
      const docId = DocumentId.create(validUuid);
      expect(docId.value).toBe(validUuid);
    });
  });

  describe('equals', () => {
    // Changed to v4 format sample UUIDs
    const uuid1 = '123e4567-e89b-42d3-a456-426614174000';
    const uuid2 = '987e6543-e21b-42d3-b456-426614174999';
    const docId1a = DocumentId.create(uuid1);
    const docId1b = DocumentId.create(uuid1);
    const docId2 = DocumentId.create(uuid2);

    it('should return true for instances with the same UUID', () => {
      expect(docId1a.equals(docId1b)).toBe(true);
    });

    it('should return false for instances with different UUIDs', () => {
      expect(docId1a.equals(docId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the correct UUID string for the toString method', () => {
      // Changed to v4 format sample UUID
      const validUuid = '222e4567-e89b-42d3-a456-426614174002';
      const docId = DocumentId.create(validUuid);
      expect(docId.toString()).toBe(validUuid);
    });
  });
});
