import { Tag } from '../../../../src/domain/entities/Tag';
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError';

describe('Tag', () => {
  describe('create', () => {
    it('有効なタグ文字列でインスタンスを作成できること', () => {
      const validTag = 'valid-tag-123';
      const tag = Tag.create(validTag);
      expect(tag).toBeInstanceOf(Tag);
      expect(tag.value).toBe(validTag);
    });

    it('空の文字列でエラーが発生すること', () => {
      expect(() => Tag.create('')).toThrow(
        new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Tag cannot be empty') // 実際のエラーメッセージに合わせる
      );
    });

    it('長すぎる文字列でエラーが発生すること', () => {
      const longTag = 'a'.repeat(51); // 50文字制限のはず
      expect(() => Tag.create(longTag)).toThrow(
        new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Tag cannot exceed 50 characters') // 完全一致させる
      );
    });

    it('無効な文字（大文字）を含む場合にエラーが発生すること', () => {
      const invalidTag = 'Invalid-Tag';
      expect(() => Tag.create(invalidTag)).toThrow(
        new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Tag must contain only lowercase letters, numbers, and hyphens') // 実際のエラーメッセージに合わせる
      );
    });

    it('無効な文字（スペース）を含む場合にエラーが発生すること', () => {
      const invalidTag = 'invalid tag';
      expect(() => Tag.create(invalidTag)).toThrow(
        new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Tag must contain only lowercase letters, numbers, and hyphens') // 実際のエラーメッセージに合わせる
      );
    });

     it('無効な文字（アンダースコア）を含む場合にエラーが発生すること', () => {
       const invalidTag = 'invalid_tag';
       expect(() => Tag.create(invalidTag)).toThrow(
         new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Tag must contain only lowercase letters, numbers, and hyphens') // 実際のエラーメッセージに合わせる
       );
     });

     it('ハイフンで始まる場合にエラーが発生すること', () => {
       const invalidTag = '-invalid-tag';
       expect(() => Tag.create(invalidTag)).toThrow(
         new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Tag cannot start or end with a hyphen') // 完全一致させる
       );
     });

     it('ハイフンで終わる場合にエラーが発生すること', () => {
       const invalidTag = 'invalid-tag-';
       expect(() => Tag.create(invalidTag)).toThrow(
         new DomainError(DomainErrorCodes.INVALID_TAG_FORMAT, 'Tag cannot start or end with a hyphen') // 完全一致させる
       );
     });
  });

  describe('equals', () => {
    const tag1 = Tag.create('tag-a');
    const tag2 = Tag.create('tag-a');
    const tag3 = Tag.create('tag-b');

    it('同じ値を持つインスタンスに対して true を返すこと', () => {
      expect(tag1.equals(tag2)).toBe(true);
    });

    it('異なる値を持つインスタンスに対して false を返すこと', () => {
      expect(tag1.equals(tag3)).toBe(false);
    });

    it('null や undefined に対して false を返すこと', () => {
      expect(tag1.equals(null as any)).toBe(false);
      expect(tag1.equals(undefined as any)).toBe(false);
    });
  });
});
