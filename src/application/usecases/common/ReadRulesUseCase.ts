import fs from "fs/promises";
import path from "path";
import { JsonToMarkdownConverter } from "../../../shared/utils/json-to-markdown/index.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { JsonDocument } from "../../../domain/entities/JsonDocument.js";
import { logger } from "../../../shared/utils/logger.js";



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
   * @param jsonToMarkdownConverter JSON to Markdown コンバーター
   */
  constructor(
    rulesDir: string,
    private readonly jsonToMarkdownConverter?: JsonToMarkdownConverter
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
      // JSONファイルのパス - 複数のパスを試す
      const possiblePaths = [
        // 新しいパス (templates/json に替わって domain/templates が使われるようになった)
        path.join(this.rulesDir, 'domain', 'templates', `rules-${language}.json`),
        // 以前のパス (旧システムとの互換性のため)
        path.join(this.rulesDir, 'templates', `rules-${language}.json`),
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

      // JSONからマークダウンに変換する場合
      let content = '';
      if (this.jsonToMarkdownConverter) {
        // コンバーターが提供されていれば使用 - JsonDocumentを作成してから変換
        const docPath = DocumentPath.create('rules-template.json');
        const jsonDoc = JsonDocument.fromObject(jsonData, docPath);
        content = this.jsonToMarkdownConverter.convert(jsonDoc);
      } else {
        // コンバーターがない場合は生のJSON文字列を使用
        content = JSON.stringify(jsonData, null, 2);
      }

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
