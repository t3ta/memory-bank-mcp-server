import { DocumentId } from '../../../../src/domain/entities/DocumentId';
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError';

describe('DocumentId', () => {
  describe('create', () => {
    it('should create a DocumentId from a valid UUID', () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      // Act
      const documentId = DocumentId.create(validUuid);

      // Assert
      expect(documentId).toBeInstanceOf(DocumentId);
      expect(documentId.value).toBe(validUuid);
    });

    it('should throw an error when creating with an empty string', () => {
      // Act & Assert
      expect(() => DocumentId.create('')).toThrow(
        new DomainError(DomainErrorCodes.INVALID_DOCUMENT_ID, 'Document ID cannot be empty')
      );
    });

    it('should throw an error when creating with an invalid UUID', () => {
      // Act & Assert
      expect(() => DocumentId.create('not-a-uuid')).toThrow(
        new DomainError(DomainErrorCodes.INVALID_DOCUMENT_ID, 'Document ID must be a valid UUID')
      );
    });
  });

  describe('generate', () => {
    it('should generate a valid DocumentId', () => {
      // Act
      const documentId = DocumentId.generate();

      // Assert
      expect(documentId).toBeInstanceOf(DocumentId);
      expect(documentId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('equals', () => {
    it('should return true for DocumentIds with the same value', () => {
      // Arrange
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const documentId1 = DocumentId.create(uuid);
      const documentId2 = DocumentId.create(uuid);

      // Act & Assert
      expect(documentId1.equals(documentId2)).toBe(true);
    });

    it('should return false for DocumentIds with different values', () => {
      // Arrange
      const documentId1 = DocumentId.create('123e4567-e89b-12d3-a456-426614174000');
      const documentId2 = DocumentId.create('123e4567-e89b-12d3-a456-426614174001');

      // Act & Assert
      expect(documentId1.equals(documentId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string representation of the DocumentId', () => {
      // Arrange
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const documentId = DocumentId.create(uuid);

      // Act & Assert
      expect(documentId.toString()).toBe(uuid);
    });
  });
});
