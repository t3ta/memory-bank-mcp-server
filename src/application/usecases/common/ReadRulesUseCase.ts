import path from "path";
import fs from "fs/promises";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";


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
   */
  constructor(rulesDir: string) {
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
      // ルールファイルのパス
      const filePath = path.join(this.rulesDir, `rules-${language}.md`);

      // ファイル読み込み
      const content = await fs.readFile(filePath, 'utf-8');

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
