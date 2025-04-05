import {
  Language,
  isValidLanguage,
  getSafeLanguage,
  // Types below are not directly testable via Jest functions
  // TranslationKey,
  // TranslationDictionary,
  // TranslationFile,
} from '../../../src/v2/i18n-schema'; // Adjust path as needed

describe('i18n Schema Helpers', () => {
  describe('isValidLanguage', () => {
    it('should return true for supported language codes', () => {
      expect(isValidLanguage('en')).toBe(true);
      expect(isValidLanguage('ja')).toBe(true);
      expect(isValidLanguage('zh')).toBe(true);
    });

    it('should return false for unsupported language codes', () => {
      expect(isValidLanguage('es')).toBe(false);
      expect(isValidLanguage('fr')).toBe(false);
      expect(isValidLanguage('EN')).toBe(false); // Case-sensitive
      expect(isValidLanguage('')).toBe(false);
      expect(isValidLanguage(' japanese ')).toBe(false);
      expect(isValidLanguage(null as any)).toBe(false);
      expect(isValidLanguage(undefined as any)).toBe(false);
    });

    it('should work as a type guard', () => {
      const langString: string = 'ja';
      let knownLang: Language | undefined;

      if (isValidLanguage(langString)) {
        // Inside this block, langString should be narrowed to type Language
        knownLang = langString;
        expect(knownLang).toBe('ja');
      } else {
        throw new Error('Type guard failed');
      }
      expect(knownLang).toBeDefined();

      const invalidLangString: string = 'de';
      let knownLangInvalid: Language | undefined;
       if (isValidLanguage(invalidLangString)) {
         // Should not enter here
         knownLangInvalid = invalidLangString;
       }
       expect(knownLangInvalid).toBeUndefined();

    });
  });

  describe('getSafeLanguage', () => {
    it('should return the same language code if it is supported', () => {
      expect(getSafeLanguage('en')).toBe('en');
      expect(getSafeLanguage('ja')).toBe('ja');
      expect(getSafeLanguage('zh')).toBe('zh');
    });

    it('should return "en" (default) for unsupported language codes', () => {
      expect(getSafeLanguage('fr')).toBe('en');
      expect(getSafeLanguage('DE')).toBe('en'); // Case-sensitive check first
      expect(getSafeLanguage('')).toBe('en');
      expect(getSafeLanguage(' english ')).toBe('en');
      expect(getSafeLanguage(null as any)).toBe('en');
      expect(getSafeLanguage(undefined as any)).toBe('en');
    });
  });
});
