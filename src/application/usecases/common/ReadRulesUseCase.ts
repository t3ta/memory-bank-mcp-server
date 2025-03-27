import fs from "fs/promises";
import path from "path";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import { logger } from "../../../shared/utils/logger.js";
import { ITemplateLoader } from "../../../infrastructure/templates/interfaces/ITemplateLoader.js";
import { getSafeLanguage } from "../../../schemas/v2/i18n-schema.js";

export type RulesResult = {
  content: string;
  language: string;
};

/**
 * ルール読み込みユースケース
 */
export class ReadRulesUseCase {
  private readonly rulesDir: string;
  private readonly supportedLanguages = ['en', 'ja', 'zh'];

  /**
   * コンストラクタ
   * @param rulesDir ルールディレクトリパス
   * @param templateLoader テンプレートローダー（オプション）
   */
  constructor(
    rulesDir: string,
    private readonly templateLoader?: ITemplateLoader
  ) {
    this.rulesDir = rulesDir;
  }

  /**
   * 指定された言語のルールを読み込む
   * @param language 言語コード（'en', 'ja', 'zh'）
   * @returns ルール内容とメタデータ
   * @throws 言語がサポートされていない、またはファイルが見つからない場合
   */
  async execute(language: string): Promise<RulesResult> {
    // 言語コードのバリデーション
    if (!this.supportedLanguages.includes(language)) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Unsupported language code: ${language}. Supported languages are: ${this.supportedLanguages.join(', ')}`
      );
    }

    try {
      // テンプレートローダーが提供されている場合はそれを使用
      if (this.templateLoader) {
        try {
          logger.debug(`Using template loader to get rules for language: ${language}`);

          // 言語コードを安全に変換
          const safeLanguage = getSafeLanguage(language);

          const content = await this.templateLoader.getMarkdownTemplate(
            'rules',
            safeLanguage
          );

          return {
            content,
            language
          };
        } catch (templateError) {
          logger.warn(`Failed to load rules using template loader: ${templateError instanceof Error ? templateError.message : 'Unknown error'}`);
          logger.debug('Falling back to direct file loading');
          // テンプレートローダーでの読み込みに失敗した場合は、従来の方法にフォールバック
        }
      }

      // 従来の方法でJSONファイルを直接読み込む
      // JSONファイルのパス - 複数のパスを試す
      const possiblePaths = [
        // 新しい単一テンプレートパス
        path.join(this.rulesDir, 'templates', 'json', 'rules.json'),
        // 新しいパス (templates/json に替わって domain/templates が使われるようになった)
        path.join(this.rulesDir, 'domain', 'templates', `rules-${language}.json`),
        // 以前のパス (旧システムとの互換性のため)
        path.join(this.rulesDir, 'templates', 'json', `rules-${language}.json`),
        // フォールバック
        path.join(this.rulesDir, `rules-${language}.json`)
      ];

      let jsonContent = '';
      let jsonFilePath = '';

      // 存在するパスを探す
      for (const p of possiblePaths) {
        try {
          jsonContent = await fs.readFile(p, 'utf-8');
          jsonFilePath = p;
          logger.debug('Rules JSON file found', { path: jsonFilePath });
          break;
        } catch (err) {
          // このパスでは見つからなかった、次を試す
          continue;
        }
      }

      if (!jsonContent) {
        throw new Error(`Rules file not found for language: ${language}`);
      }

      const jsonData = JSON.parse(jsonContent);

      // JSONからMarkdownに変換する必要はなく、そのままJSON文字列を返す
      // (markdownサポートが削除されたため)
      const content = JSON.stringify(jsonData, null, 2);

      return {
        content,
        language
      };
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.DOCUMENT_NOT_FOUND,
        `Rules file not found for language: ${language}`,
        { originalError: error }
      );
    }
  }
}