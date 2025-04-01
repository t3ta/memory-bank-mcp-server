/**
 * Tests for common schema definitions
 */
import { FlexibleDateSchema, TagSchema } from '../../src/common/schemas.js';

describe('FlexibleDateSchema', () => {
  it('should accept Date objects', () => {
    const date = new Date();
    const result = FlexibleDateSchema.safeParse(date);
    expect(result.success).toBe(true);
  });

  it('should accept ISO date strings', () => {
    const dateString = '2025-03-27T12:00:00Z';
    const result = FlexibleDateSchema.safeParse(dateString);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeInstanceOf(Date);
    }
  });

  it('should reject invalid date strings', () => {
    const invalidDate = 'not-a-date';
    const result = FlexibleDateSchema.safeParse(invalidDate);
    expect(result.success).toBe(false);
  });
});

describe('TagSchema', () => {
  it('should accept valid tags', () => {
    const validTags = ['tag', 'tag-with-hyphen', '123', 'tag123', 'a-b-c'];
    validTags.forEach(tag => {
      const result = TagSchema.safeParse(tag);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid tags', () => {
    const invalidTags = ['Tag', 'tag_with_underscore', 'tag with space', 'tag.with.dots', ''];
    invalidTags.forEach(tag => {
      const result = TagSchema.safeParse(tag);
      expect(result.success).toBe(false);
    });
  });
});
