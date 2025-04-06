import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import type { II18nProvider } from '../../../../../src/infrastructure/i18n/interfaces/II18nProvider.js'; // .js 追加
import type { Language, TranslationKey } from '@memory-bank/schemas';

// II18nProvider のモック実装を作成
// jest.Mocked を削除し、手動モックの型を指定
const mockI18nProvider: II18nProvider = {
  translate: vi.fn(), // jest -> vi
  loadTranslations: vi.fn(), // jest -> vi
  isLanguageSupported: vi.fn(), // jest -> vi
  getSupportedLanguages: vi.fn(), // jest -> vi
  getDefaultLanguage: vi.fn(), // jest -> vi
};

describe('II18nProvider Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks(); // jest -> vi
  });

  it('should define the translate method', () => {
    const params = {
      key: 'greeting' as TranslationKey, // 型アサーションが必要な場合
      language: 'ja' as Language,
      params: { name: 'みらい' },
    };
    const expectedTranslation = 'こんにちは、みらいさん！';
    (mockI18nProvider.translate as Mock).mockReturnValue(expectedTranslation); // as Mock 追加

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
    (mockI18nProvider.translate as Mock).mockReturnValue(expectedTranslation); // as Mock 追加

    const translation = mockI18nProvider.translate(params);
    expect(mockI18nProvider.translate).toHaveBeenCalledWith(params);
    expect(translation).toBe(expectedTranslation);
  });

  it('should define the loadTranslations method that resolves true', async () => {
    const language: Language = 'ja';
    (mockI18nProvider.loadTranslations as Mock).mockResolvedValue(true); // as Mock 追加

    const result = await mockI18nProvider.loadTranslations(language);
    expect(mockI18nProvider.loadTranslations).toHaveBeenCalledWith(language);
    expect(result).toBe(true);
  });

   it('should define the loadTranslations method that resolves false', async () => {
    // サポートされている言語だがロードに失敗するケースを想定
    const language: Language = 'ja';
    (mockI18nProvider.loadTranslations as Mock).mockResolvedValue(false); // as Mock 追加

    const result = await mockI18nProvider.loadTranslations(language);
    expect(mockI18nProvider.loadTranslations).toHaveBeenCalledWith(language);
    expect(result).toBe(false);
  });

  it('should define the isLanguageSupported method', () => {
    const supportedLang = 'ja';
    const unsupportedLang = 'kr';
    (mockI18nProvider.isLanguageSupported as Mock).mockImplementation((lang) => lang === supportedLang); // as Mock 追加

    expect(mockI18nProvider.isLanguageSupported(supportedLang)).toBe(true);
    expect(mockI18nProvider.isLanguageSupported(unsupportedLang)).toBe(false);
    expect(mockI18nProvider.isLanguageSupported).toHaveBeenCalledWith(supportedLang);
    expect(mockI18nProvider.isLanguageSupported).toHaveBeenCalledWith(unsupportedLang);
  });

  it('should define the getSupportedLanguages method', () => {
    const expectedLanguages: Language[] = ['en', 'ja', 'zh'];
    (mockI18nProvider.getSupportedLanguages as Mock).mockReturnValue(expectedLanguages); // as Mock 追加

    const languages = mockI18nProvider.getSupportedLanguages();
    expect(mockI18nProvider.getSupportedLanguages).toHaveBeenCalled();
    expect(languages).toEqual(expectedLanguages);
  });

  it('should define the getDefaultLanguage method', () => {
    const expectedLanguage: Language = 'en';
    (mockI18nProvider.getDefaultLanguage as Mock).mockReturnValue(expectedLanguage); // as Mock 追加

    const language = mockI18nProvider.getDefaultLanguage();
    expect(mockI18nProvider.getDefaultLanguage).toHaveBeenCalled();
    expect(language).toBe(expectedLanguage);
  });
});
