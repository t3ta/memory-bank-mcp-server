import type { II18nProvider } from '../../../../../src/infrastructure/i18n/interfaces/II18nProvider';
import type { Language, TranslationKey } from '@memory-bank/schemas';

// II18nProvider のモック実装を作成
const mockI18nProvider: jest.Mocked<II18nProvider> = {
  translate: jest.fn(),
  loadTranslations: jest.fn(),
  isLanguageSupported: jest.fn(),
  getSupportedLanguages: jest.fn(),
  getDefaultLanguage: jest.fn(),
};

describe('II18nProvider Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
  });

  it('should define the translate method', () => {
    const params = {
      key: 'greeting' as TranslationKey, // 型アサーションが必要な場合
      language: 'ja' as Language,
      params: { name: 'みらい' },
    };
    const expectedTranslation = 'こんにちは、みらいさん！';
    mockI18nProvider.translate.mockReturnValue(expectedTranslation);

    const translation = mockI18nProvider.translate(params);
    expect(mockI18nProvider.translate).toHaveBeenCalledWith(params);
    expect(translation).toBe(expectedTranslation);
  });

   it('should define the translate method without params', () => {
    const params = {
      key: 'farewell' as TranslationKey,
      language: 'en' as Language,
    };
    const expectedTranslation = 'Goodbye!';
    mockI18nProvider.translate.mockReturnValue(expectedTranslation);

    const translation = mockI18nProvider.translate(params);
    expect(mockI18nProvider.translate).toHaveBeenCalledWith(params);
    expect(translation).toBe(expectedTranslation);
  });

  it('should define the loadTranslations method that resolves true', async () => {
    const language: Language = 'ja';
    mockI18nProvider.loadTranslations.mockResolvedValue(true);

    const result = await mockI18nProvider.loadTranslations(language);
    expect(mockI18nProvider.loadTranslations).toHaveBeenCalledWith(language);
    expect(result).toBe(true);
  });

   it('should define the loadTranslations method that resolves false', async () => {
    // サポートされている言語だがロードに失敗するケースを想定
    const language: Language = 'ja';
    mockI18nProvider.loadTranslations.mockResolvedValue(false);

    const result = await mockI18nProvider.loadTranslations(language);
    expect(mockI18nProvider.loadTranslations).toHaveBeenCalledWith(language);
    expect(result).toBe(false);
  });

  it('should define the isLanguageSupported method', () => {
    const supportedLang = 'ja';
    const unsupportedLang = 'kr';
    mockI18nProvider.isLanguageSupported.mockImplementation((lang) => lang === supportedLang);

    expect(mockI18nProvider.isLanguageSupported(supportedLang)).toBe(true);
    expect(mockI18nProvider.isLanguageSupported(unsupportedLang)).toBe(false);
    expect(mockI18nProvider.isLanguageSupported).toHaveBeenCalledWith(supportedLang);
    expect(mockI18nProvider.isLanguageSupported).toHaveBeenCalledWith(unsupportedLang);
  });

  it('should define the getSupportedLanguages method', () => {
    const expectedLanguages: Language[] = ['en', 'ja', 'zh'];
    mockI18nProvider.getSupportedLanguages.mockReturnValue(expectedLanguages);

    const languages = mockI18nProvider.getSupportedLanguages();
    expect(mockI18nProvider.getSupportedLanguages).toHaveBeenCalled();
    expect(languages).toEqual(expectedLanguages);
  });

  it('should define the getDefaultLanguage method', () => {
    const expectedLanguage: Language = 'en';
    mockI18nProvider.getDefaultLanguage.mockReturnValue(expectedLanguage);

    const language = mockI18nProvider.getDefaultLanguage();
    expect(mockI18nProvider.getDefaultLanguage).toHaveBeenCalled();
    expect(language).toBe(expectedLanguage);
  });
});
