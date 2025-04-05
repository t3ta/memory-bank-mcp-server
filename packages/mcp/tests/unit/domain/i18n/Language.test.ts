import { Language, LanguageCode } from '../../../../src/domain/i18n/Language';

describe('Language Domain Model', () => {
  describe('Creation and Validation', () => {
    it('should create a Language instance for supported codes using constructor', () => {
      const langEn = new Language('en');
      expect(langEn).toBeInstanceOf(Language);
      expect(langEn.code).toBe('en');

      const langJa = new Language('ja');
      expect(langJa.code).toBe('ja');

      const langZh = new Language('zh');
      expect(langZh.code).toBe('zh');
    });

    it('should create a Language instance for supported codes using create factory', () => {
      const langEn = Language.create('en');
      expect(langEn).toBeInstanceOf(Language);
      expect(langEn.code).toBe('en');

      const langJa = Language.create('ja');
      expect(langJa.code).toBe('ja');

      const langZh = Language.create('zh');
      expect(langZh.code).toBe('zh');
    });

    it('should throw an error for unsupported language codes using constructor', () => {
      expect(() => new Language('fr')).toThrow('Unsupported language code: fr');
      expect(() => new Language('EN')).toThrow('Unsupported language code: EN'); // Case-sensitive
      expect(() => new Language('')).toThrow('Unsupported language code: ');
      expect(() => new Language(' english ')).toThrow('Unsupported language code:  english ');
    });

     it('should throw an error for unsupported language codes using create factory', () => {
      expect(() => Language.create('es')).toThrow('Unsupported language code: es');
      expect(() => Language.create('JA')).toThrow('Unsupported language code: JA'); // Case-sensitive
    });
  });

  describe('Static Methods', () => {
    it('should return the default language (en) using default()', () => {
      const defaultLang = Language.default();
      expect(defaultLang).toBeInstanceOf(Language);
      expect(defaultLang.code).toBe('en');
    });

    it('should return the list of supported languages using supportedLanguages()', () => {
      const supported = Language.supportedLanguages();
      expect(supported).toEqual(['en', 'ja', 'zh']);
    });
  });

  describe('Instance Methods', () => {
    const langEn1 = Language.create('en');
    const langEn2 = Language.create('en');
    const langJa = Language.create('ja');

    it('should return the correct language code using getter', () => {
      expect(langEn1.code).toBe('en');
      expect(langJa.code).toBe('ja');
    });

    it('should correctly compare equality using equals()', () => {
      expect(langEn1.equals(langEn2)).toBe(true); // Same language code
      expect(langEn1.equals(langJa)).toBe(false); // Different language code
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(langEn1.equals(null!)).toBe(false); // Comparing with null
    });

     it('should return the language code using toString()', () => {
      expect(langEn1.toString()).toBe('en');
      expect(langJa.toString()).toBe('ja');
    });
  });
});
