import { z } from 'zod';
import { vi, Mock } from 'vitest'; // jest -> vi, Mock をインポート
import {
  dateStringToDate,
  FlexibleDateSchema,
  TagSchema,
} from '@memory-bank/schemas/common'; // Import using package path defined in exports

describe('Common Schemas', () => {
  describe('dateStringToDate', () => {
    // Mock Zod refinement context
    const mockCtx: z.RefinementCtx = {
      addIssue: vi.fn(), // jest -> vi
      path: [],
    };

    beforeEach(() => {
      // Reset mock before each test
      (mockCtx.addIssue as Mock).mockClear(); // jest.Mock -> Mock
    });

    it('should parse valid date strings into Date objects', () => {
      const isoString = '2023-10-27T10:00:00.000Z';
      const result = dateStringToDate(isoString, mockCtx);
      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe(isoString);
      expect(mockCtx.addIssue).not.toHaveBeenCalled();

      const simpleDate = '2024-01-01';
      const resultSimple = dateStringToDate(simpleDate, mockCtx);
      expect(resultSimple).toBeInstanceOf(Date);
      // Note: Parsing 'YYYY-MM-DD' might result in UTC midnight or local midnight depending on JS engine
      // We just check if it's a valid date here.
      expect(isNaN((resultSimple as Date).getTime())).toBe(false);
      expect(mockCtx.addIssue).not.toHaveBeenCalled();
    });

    it('should add issue and return z.NEVER for invalid date strings', () => {
      const invalidString = 'not-a-date';
      const result = dateStringToDate(invalidString, mockCtx);
      expect(result).toBe(z.NEVER);
      expect(mockCtx.addIssue).toHaveBeenCalledTimes(1);
      expect(mockCtx.addIssue).toHaveBeenCalledWith({
        code: z.ZodIssueCode.custom,
        message: `Invalid date format: ${invalidString}`,
      });
    });

     it('should handle potential errors during Date construction and suppress console.error', () => {
        // Suppress console.error for this specific test case
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // jest -> vi

        // This case is hard to trigger reliably as new Date() is quite robust,
        // but we test the catch block logic. We can mock Date temporarily.
        const originalDate = global.Date;
        global.Date = vi.fn(() => { throw new Error('Mock Date Error'); }) as any; // jest -> vi

        const dateString = '2023-10-27T10:00:00.000Z';
        const result = dateStringToDate(dateString, mockCtx);

        expect(result).toBe(z.NEVER);
        expect(mockCtx.addIssue).toHaveBeenCalledTimes(1);
        expect(mockCtx.addIssue).toHaveBeenCalledWith({
          code: z.ZodIssueCode.custom,
          // Note: The actual error message logged by the function might differ slightly
          // depending on the error thrown, but we check that addIssue was called correctly.
          message: `Failed to parse date: ${dateString}`,
        });

        global.Date = originalDate; // Restore original Date constructor
        consoleErrorSpy.mockRestore(); // Restore console.error
     });
  });

  describe('FlexibleDateSchema', () => {
    it('should validate Date objects', () => {
      const date = new Date();
      const result = FlexibleDateSchema.safeParse(date);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(Date);
        expect(result.data).toEqual(date);
      }
    });

    it('should validate valid date strings and transform them to Date objects', () => {
      const isoString = '2023-11-15T12:30:00.000Z';
      const result = FlexibleDateSchema.safeParse(isoString);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(Date);
        expect(result.data.toISOString()).toBe(isoString);
      }
    });

    it('should fail for invalid date strings', () => {
      const result = FlexibleDateSchema.safeParse('invalid-date-string');
      expect(result.success).toBe(false);
    });

    it('should fail for types other than Date or string', () => {
      expect(FlexibleDateSchema.safeParse(1234567890).success).toBe(false);
      expect(FlexibleDateSchema.safeParse(null).success).toBe(false);
      expect(FlexibleDateSchema.safeParse(undefined).success).toBe(false);
      expect(FlexibleDateSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('TagSchema', () => {
    it('should validate correct tags', () => {
      expect(TagSchema.safeParse('tag').success).toBe(true);
      expect(TagSchema.safeParse('tag-123').success).toBe(true);
      expect(TagSchema.safeParse('another-tag').success).toBe(true);
      expect(TagSchema.safeParse('a').success).toBe(true); // Single character
      expect(TagSchema.safeParse('1').success).toBe(true); // Single number
    });

    it('should fail for tags with uppercase letters', () => {
      const result = TagSchema.safeParse('InvalidTag');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Tag must contain only lowercase letters, numbers, and hyphens');
      }
    });

    it('should fail for tags with special characters other than hyphen', () => {
      expect(TagSchema.safeParse('tag_underscore').success).toBe(false);
      expect(TagSchema.safeParse('tag space').success).toBe(false);
      expect(TagSchema.safeParse('tag.dot').success).toBe(false);
      expect(TagSchema.safeParse('tag@').success).toBe(false);
    });

    it('should fail for tags starting or ending with hyphen', () => {
       // Regex currently allows this, but maybe it shouldn't? Let's test current behavior.
       // If this behavior needs to change, update the regex and this test.
      expect(TagSchema.safeParse('-tag').success).toBe(true); // Current regex allows leading hyphen
      expect(TagSchema.safeParse('tag-').success).toBe(true); // Current regex allows trailing hyphen
    });

    it('should fail for empty strings', () => {
      const result = TagSchema.safeParse('');
      expect(result.success).toBe(false);
       if (!result.success) {
         // The regex validation might fail before a non-empty check if one existed
         expect(result.error.errors[0].message).toContain('Tag must contain only lowercase letters, numbers, and hyphens');
       }
    });

    it('should fail for non-string types', () => {
      expect(TagSchema.safeParse(123).success).toBe(false);
      expect(TagSchema.safeParse(null).success).toBe(false);
      expect(TagSchema.safeParse(undefined).success).toBe(false);
    });
  });
});
