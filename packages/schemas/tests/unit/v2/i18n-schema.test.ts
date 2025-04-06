import {
  isValidLanguage,
  getSafeLanguage,
  type Language,
} from '../../../src/v2/i18n-schema.js'; // 相対パスに変更
describe('i18n Schema Utilities', () => {
  describe('isValidLanguage', () => {
    it('should return true for supported languages', () => {
      expect(isValidLanguage('en')).toBe(true);
      expect(isValidLanguage('ja')).toBe(true);
      expect(isValidLanguage('zh')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isValidLanguage('fr')).toBe(false);
      expect(isValidLanguage('EN')).toBe(false); // Case-sensitive
      expect(isValidLanguage(' ja ')).toBe(false); // Needs exact match
      expect(isValidLanguage('')).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      expect(isValidLanguage(undefined as any)).toBe(false);
      expect(isValidLanguage(null as any)).toBe(false);
      expect(isValidLanguage(123 as any)).toBe(false);
      expect(isValidLanguage({} as any)).toBe(false);
    });

    // Type guard test
    it('should narrow the type for known languages', () => {
      const lang: string = 'ja';
      if (isValidLanguage(lang)) {
        // If this compiles, the type guard works
        const knownLang: Language = lang;
        expect(knownLang).toBe('ja');
      } else {
        fail('Type guard failed for known language');
      }
    });
  });

  describe('getSafeLanguage', () => {
    it('should return the same language if it is supported', () => {
      expect(getSafeLanguage('en')).toBe('en');
      expect(getSafeLanguage('ja')).toBe('ja');
      expect(getSafeLanguage('zh')).toBe('zh');
    });

    it('should return "en" (default) for unsupported languages', () => {
      expect(getSafeLanguage('fr')).toBe('en');
      expect(getSafeLanguage('JA')).toBe('en'); // Case-sensitive check from isValidLanguage
      expect(getSafeLanguage('')).toBe('en');
    });

    it('should return "en" for non-string inputs', () => {
      expect(getSafeLanguage(undefined as any)).toBe('en');
      expect(getSafeLanguage(null as any)).toBe('en');
      expect(getSafeLanguage(123 as any)).toBe('en');
      expect(getSafeLanguage({} as any)).toBe('en');
    });
  });

  // Placeholder for potential future tests on TranslationFile structure if needed
  // describe('TranslationFile Structure (Type Check)', () => {
  //   it('should conform to the TranslationFile interface', () => {
  //     const validFile: TranslationFile = {
  //       language: 'en',
  //       translations: {
  //         greeting: 'Hello',
  //         farewell: 'Goodbye',
  //       },
  //       metadata: {
  //         version: '1.0.0',
  //         updatedAt: new Date().toISOString(),
  //       },
  //     };
  //     // Basic check to ensure the structure is assignable
  //     expect(validFile.language).toBe('en');
  //     expect(validFile.translations.greeting).toBe('Hello');
  //   });
  // });
});
