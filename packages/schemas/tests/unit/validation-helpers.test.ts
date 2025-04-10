import { createErrorMessage, commonValidators } from '../../src/validation-helpers.js'; // Adjust path as needed

describe('Validation Helpers', () => {
  describe('createErrorMessage', () => {
    it('should format the error message correctly', () => {
      const fieldName = 'ユーザー名';
      const reason = '必須項目です';
      const expectedMessage = `${fieldName}が無効です: ${reason}`;
      expect(createErrorMessage(fieldName, reason)).toBe(expectedMessage);
    });
  });

  describe('commonValidators', () => {
    describe('nonEmptyString', () => {
      const validator = commonValidators.nonEmptyString('テストフィールド');

      it('should pass for non-empty strings', () => {
        expect(validator.safeParse('hello').success).toBe(true);
        expect(validator.safeParse(' a ').success).toBe(true); // Whitespace is allowed
      });

      it('should fail for empty strings', () => {
        const result = validator.safeParse('');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('テストフィールドが無効です: 空にできません');
        }
      });

      it('should fail for non-string types', () => {
        expect(validator.safeParse(null).success).toBe(false);
        expect(validator.safeParse(undefined).success).toBe(false);
        expect(validator.safeParse(123).success).toBe(false);
      });
    });

    describe('uuidField', () => {
      const validator = commonValidators.uuidField('ID');
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';

      it('should pass for valid UUIDs', () => {
        expect(validator.safeParse(validUUID).success).toBe(true);
      });

      it('should fail for invalid UUID formats', () => {
        expect(validator.safeParse('not-a-uuid').success).toBe(false);
        expect(validator.safeParse(validUUID.substring(1)).success).toBe(false); // Too short
        expect(validator.safeParse(validUUID + 'a').success).toBe(false); // Too long
      });

       it('should fail with correct error message', () => {
        const result = validator.safeParse('invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('IDが無効です: UUIDフォーマットではありません');
        }
      });
    });

    describe('isoDateField', () => {
      const validator = commonValidators.isoDateField('更新日時');
      const validISO = '2023-10-27T10:00:00.000Z';

      it('should pass for valid ISO 8601 date strings', () => {
        expect(validator.safeParse(validISO).success).toBe(true);
        expect(validator.safeParse('2024-01-01T00:00:00Z').success).toBe(true);
      });

      it('should fail for invalid date formats', () => {
        expect(validator.safeParse('2023-10-27').success).toBe(false); // Date only
        expect(validator.safeParse('10:00:00').success).toBe(false); // Time only
        expect(validator.safeParse('invalid-date').success).toBe(false);
        expect(validator.safeParse('2023/10/27T10:00:00Z').success).toBe(false); // Wrong separator
      });

      it('should fail with correct error message', () => {
        const result = validator.safeParse('invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('更新日時が無効です: ISO 8601形式の日付ではありません');
        }
      });
    });

    describe('tagsArray', () => {
      const validator = commonValidators.tagsArray('タグリスト');

      it('should pass for valid tag arrays', () => {
        expect(validator.safeParse(['tag-1', 'tag2', 'another-tag']).success).toBe(true);
        expect(validator.safeParse([]).success).toBe(true); // Empty array is valid
      });

       it('should pass for undefined (optional)', () => {
        expect(validator.safeParse(undefined).success).toBe(true);
      });

      it('should fail if array contains invalid tags (uppercase)', () => {
        const result = validator.safeParse(['valid', 'InvalidTag']);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].path).toEqual([1]); // Error on the second element
          expect(result.error.errors[0].message).toContain('タグは小文字英数字とハイフンのみ使用可能です');
        }
      });

      it('should fail if array contains invalid tags (special chars)', () => {
        const result = validator.safeParse(['valid', 'tag_with_underscore']);
        expect(result.success).toBe(false);
         if (!result.success) {
          expect(result.error.errors[0].path).toEqual([1]);
          expect(result.error.errors[0].message).toContain('タグは小文字英数字とハイフンのみ使用可能です');
        }
      });

       it('should fail if array contains empty tags', () => {
        const result = validator.safeParse(['valid', '']);
        expect(result.success).toBe(false);
         if (!result.success) {
          expect(result.error.errors[0].path).toEqual([1]);
          expect(result.error.errors[0].message).toContain('タグは空にできません');
        }
      });

      it('should fail if input is not an array (and not undefined)', () => {
        expect(validator.safeParse('not-an-array').success).toBe(false);
        expect(validator.safeParse(null).success).toBe(false);
        expect(validator.safeParse({}).success).toBe(false);
      });
    });
  });
});
