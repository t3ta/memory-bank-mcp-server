import { z } from 'zod';

/**
 * Creates a standardized error message for validation failures.
 * @param fieldName The name of the field that failed validation.
 * @param reason The reason for the validation failure.
 * @returns A formatted error message string.
 */
export const createErrorMessage = (fieldName: string, reason: string): string =>
  `${fieldName}が無効です: ${reason}`;

/**
 * Common Zod validators for frequently used patterns.
 */
export const commonValidators = {
  /**
   * Validates that a string is not empty.
   * @param fieldName The name of the field for error messages.
   * @returns A Zod string schema that checks for non-emptiness.
   */
  nonEmptyString: (fieldName: string) =>
    z.string().min(1, { message: createErrorMessage(fieldName, '空にできません') }),

  /**
   * Validates that a string is a valid UUID.
   * @param fieldName The name of the field for error messages.
   * @returns A Zod string schema that checks for UUID format.
   */
  uuidField: (fieldName: string) =>
    z.string().uuid({ message: createErrorMessage(fieldName, 'UUIDフォーマットではありません') }),

  /**
   * Validates that a string is a valid ISO 8601 date string.
   * @param fieldName The name of the field for error messages.
   * @returns A Zod string schema that checks for ISO 8601 date format.
   */
  isoDateField: (fieldName: string) =>
    z.string().datetime({ message: createErrorMessage(fieldName, 'ISO 8601形式の日付ではありません') }),

  /**
   * Validates that an array of strings contains only valid tags
   * (lowercase letters, numbers, hyphens).
   * @param fieldName The name of the field for error messages.
   * @returns A Zod array schema for tags.
   */
  tagsArray: (fieldName: string) =>
    z.array(
      z.string()
        // Check for non-empty first, then check the format
        .min(1, { message: createErrorMessage(fieldName, 'タグは空にできません') })
        .regex(/^[a-z0-9-]+$/, { message: createErrorMessage(fieldName, 'タグは小文字英数字とハイフンのみ使用可能です') })
    ).optional(),
};
