/**
 * I18nServiceAdapter
 *
 * I18nService を II18nProvider インターフェースにアダプトするクラス。
 * II18nProvider を期待する場所で I18nService を使用できるようにします。
 */
import { I18nService } from '../../application/i18n/I18nService.js';
import { II18nProvider } from './interfaces/II18nProvider.js';
// Domain Languageは使用しないのでインポートしない
import type { Language as SchemaLanguage, TranslationKey } from '@memory-bank/schemas';
import { logger } from '../../shared/utils/logger.js';

/**
 * I18nServiceAdapter
 * II18nProvider インターフェースを実装し、I18nService をアダプトするクラス
 */
export class I18nServiceAdapter implements II18nProvider {
  private readonly componentLogger = logger.withContext({ component: 'I18nServiceAdapter' });
  private readonly supportedLanguages: SchemaLanguage[] = ['en', 'ja', 'zh'];
  private readonly defaultLanguage: SchemaLanguage = 'en';

  /**
   * コンストラクタ
   *
   * @param i18nService アダプトする I18nService のインスタンス
   */
  constructor(private readonly i18nService: I18nService) {}

  /**
   * II18nProvider.translate の実装
   *
   * @param params 翻訳パラメータ
   * @returns 翻訳されたテキスト
   */
  translate(params: {
    key: TranslationKey;
    language: SchemaLanguage;
    params?: Record<string, string>;
  }): string {
    try {
      // 非同期メソッドを同期的に実行できないため、キャッシュを使用する前提
      return this.i18nService.translate(params.key, params.language);
    } catch (error) {
      this.componentLogger.warn(`Translation failed for key ${params.key}`, { error });
      return `?${params.key}`;
    }
  }

  /**
   * II18nProvider.loadTranslations の実装
   *
   * @param language 言語コード
   * @returns Promise resolving to true if successful
   */
  async loadTranslations(language: SchemaLanguage): Promise<boolean> {
    try {
      // すべての翻訳をロード
      await this.i18nService.loadAllTranslations();
      return true;
    } catch (error) {
      this.componentLogger.error(`Failed to load translations for ${language}`, { error });
      return false;
    }
  }

  /**
   * II18nProvider.isLanguageSupported の実装
   *
   * @param language 言語コード
   * @returns サポートされているかどうか
   */
  isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.includes(language as SchemaLanguage);
  }

  /**
   * II18nProvider.getSupportedLanguages の実装
   *
   * @returns サポートされている言語の配列
   */
  getSupportedLanguages(): SchemaLanguage[] {
    return [...this.supportedLanguages];
  }

  /**
   * II18nProvider.getDefaultLanguage の実装
   *
   * @returns デフォルト言語
   */
  getDefaultLanguage(): SchemaLanguage {
    return this.defaultLanguage;
  }
}
