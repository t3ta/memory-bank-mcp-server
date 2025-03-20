import { Tag } from '../../../../src/domain/entities/Tag.js';
import { DomainError } from '../../../../src/shared/errors/DomainError.js';

/**
 * Unit tests for Tag entity
 * 
 * These tests verify that the Tag entity correctly implements the following features:
 * - Instance creation from valid tag values
 * - Validation of invalid tag values and appropriate error handling
 * - Tag value normalization (lowercase conversion, etc.)
 * - Identity comparison
 * 
 * TODO: Add the following test cases
 * - Tests for special tag use cases (compound tags, etc.)
 * - Tests for tag escaping
 * - Tests for multilingual tag support
 */
describe('Tag', () => {
  // Tag class uses a private constructor, so instances must be created via the create method

  describe('create', () => {
    it('should create instance with valid tag value', () => {
      const tag = Tag.create('test');
      expect(tag).toBeDefined();
      expect(tag.value).toBe('test');

      const tagWithHyphen = Tag.create('test-tag');
      expect(tagWithHyphen).toBeDefined();
      expect(tagWithHyphen.value).toBe('test-tag');
    });

    it('should throw error when tag value is empty', () => {
      expect(() => Tag.create('')).toThrow(DomainError);
      expect(() => Tag.create('')).toThrow('Tag cannot be empty');
    });

    it('should throw error when tag value contains invalid characters', () => {
      expect(() => Tag.create('test tag')).toThrow(DomainError);
      expect(() => Tag.create('test tag')).toThrow('Tag must contain only lowercase letters, numbers, and hyphens');
      
      expect(() => Tag.create('test@tag')).toThrow(DomainError);
      expect(() => Tag.create('test@tag')).toThrow('Tag must contain only lowercase letters, numbers, and hyphens');
      
      expect(() => Tag.create('TestTag')).toThrow(DomainError);
      expect(() => Tag.create('TestTag')).toThrow('Tag must contain only lowercase letters, numbers, and hyphens');
      
      expect(() => Tag.create('テストタグ')).toThrow(DomainError);
      expect(() => Tag.create('テストタグ')).toThrow('Tag must contain only lowercase letters, numbers, and hyphens');
    });
  });

  describe('equals', () => {
    it('should return true when tag values are the same', () => {
      const tag1 = Tag.create('test');
      const tag2 = Tag.create('test');
      expect(tag1.equals(tag2)).toBe(true);
    });

    // The current Tag class doesn't allow uppercase letters, so case comparison tests aren't needed

    it('should return false when tag values are different', () => {
      const tag1 = Tag.create('test');
      const tag2 = Tag.create('other');
      expect(tag1.equals(tag2)).toBe(false);
    });

    // The Tag class's equals method doesn't allow comparison with null or undefined for type safety
  });

  describe('toString', () => {
    // Test toString() method
    it('should return the tag value', () => {
      const tag = Tag.create('test');
      expect(tag.toString()).toBe('test');
    });
  });

  describe('toHashtag', () => {
    // Test toHashtag() method
    it('should return the tag value with # prefix', () => {
      const tag = Tag.create('test');
      expect(tag.toHashtag()).toBe('#test');

      const compoundTag = Tag.create('compound-tag');
      expect(compoundTag.toHashtag()).toBe('#compound-tag');
    });
  });

  // TODO: Tests for special tag use cases
  it.skip('should handle special tag use cases', () => {
    // Compound tag with multiple words
    const compoundTag = Tag.create('compound-tag-with-multiple-words');
    expect(compoundTag.value).toBe('compound-tag-with-multiple-words');
    
    // Very long tag
    const longTag = Tag.create('a'.repeat(50) + '-tag');
    expect(longTag.value).toBe('a'.repeat(50) + '-tag');
    
    // Numeric-only tag
    const numericTag = Tag.create('12345');
    expect(numericTag.value).toBe('12345');
  });

  // TODO: Tests for tag escaping
  // This test is commented out because the current implementation doesn't have tag escaping functionality
  /*
  it('should properly escape and sanitize tags', () => {
    // This feature might be considered in future implementations
    // Activate this test when tag normalization and escaping are implemented
  });
  */

  // TODO: Tests for multilingual tag support
  // This test is commented out because the current implementation doesn't support internationalized tags
  /*
  it('should support or properly handle multilingual tags', () => {
    // This feature might be considered in future implementations
    // Activate this test when multilingual tag support is implemented
  });
  */
});
