import { Tag } from '../Tag.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';

describe('Tag', () => {
  describe('create', () => {
    it('should create a valid tag', () => {
      // Arrange & Act
      const tag = Tag.create('test');

      // Assert
      expect(tag).toBeDefined();
      expect(tag.value).toBe('test');
    });

    it('should create a valid tag with numbers and hyphens', () => {
      // Arrange & Act
      const tag = Tag.create('test-123');

      // Assert
      expect(tag).toBeDefined();
      expect(tag.value).toBe('test-123');
    });

    it('should throw an error for empty tag', () => {
      // Arrange & Act & Assert
      expect(() => Tag.create('')).toThrow(DomainError);
      expect(() => Tag.create('')).toThrow('Tag cannot be empty');
    });

    it('should throw an error for tag with uppercase letters', () => {
      // Arrange & Act & Assert
      expect(() => Tag.create('Test')).toThrow(DomainError);
      expect(() => Tag.create('Test')).toThrow(
        'Tag must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should throw an error for tag with special characters', () => {
      // Arrange & Act & Assert
      expect(() => Tag.create('test_tag')).toThrow(DomainError);
      expect(() => Tag.create('test_tag')).toThrow(
        'Tag must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should throw an error for tag with spaces', () => {
      // Arrange & Act & Assert
      expect(() => Tag.create('test tag')).toThrow(DomainError);
      expect(() => Tag.create('test tag')).toThrow(
        'Tag must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should throw DomainError with correct error code', () => {
      // Arrange & Act & Assert
      try {
        Tag.create('');
        // If we get here, it means the expected error wasn't thrown
        expect('No error was thrown').toBe('Error should have been thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe(
          `DOMAIN_ERROR.${DomainErrorCodes.INVALID_TAG_FORMAT}`
        );
      }
    });
  });

  describe('equals', () => {
    it('should return true for tags with same value', () => {
      // Arrange
      const tag1 = Tag.create('test');
      const tag2 = Tag.create('test');

      // Act
      const result = tag1.equals(tag2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for tags with different values', () => {
      // Arrange
      const tag1 = Tag.create('test');
      const tag2 = Tag.create('other');

      // Act
      const result = tag1.equals(tag2);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return tag value as string', () => {
      // Arrange
      const tag = Tag.create('test');

      // Act
      const result = tag.toString();

      // Assert
      expect(result).toBe('test');
    });
  });

  describe('toHashtag', () => {
    it('should return tag value with # prefix', () => {
      // Arrange
      const tag = Tag.create('test');

      // Act
      const result = tag.toHashtag();

      // Assert
      expect(result).toBe('#test');
    });
  });
});
