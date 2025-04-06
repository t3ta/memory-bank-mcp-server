import fs from "fs/promises"; // ★★★ コメント解除 ★★★
import path from "path";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import { logger } from "../../../shared/utils/logger.js";
import { fileURLToPath } from 'node:url'; // ★★★ コメント解除 ★★★
// import { TemplateService } from '../../templates/TemplateService.js'; // ★★★ コメントアウト ★★★
// import { Language } from '../../../domain/i18n/Language.js'; // ★★★ コメントアウト ★★★
// import { getSafeLanguage } from '@memory-bank/schemas'; // ★★★ コメントアウト ★★★

const __filename = fileURLToPath(import.meta.url); // ★★★ コメント解除 ★★★
const __dirname = path.dirname(__filename); // ★★★ コメント解除 ★★★


export type RulesResult = {
  content: string;
  language: string;
};

/**
 * Use case for reading rules
 */
export class ReadRulesUseCase {
  private readonly rulesDir: string; // 使われてないけど残しておく
  private readonly supportedLanguages = ['en', 'ja', 'zh'];

  /**
   * Constructor
   * @param rulesDir Rules directory path
   */
  constructor(
   rulesDir: string // rulesDir はエラーメッセージ用に残すかもしれないけど、実際には使わない
   // private readonly templateLoader: TemplateService // ★★★ コメントアウト ★★★
  ) {
   // Resolve the absolute path for rulesDir upon initialization
   this.rulesDir = path.resolve(rulesDir);
   logger.debug(`ReadRulesUseCase initialized with resolved rulesDir: ${this.rulesDir}`); // Log resolved rulesDir
  }

  /**
   * Read rules for the specified language
   * @param language Language code ('en', 'ja', 'zh')
   * @returns Rules content and metadata
   * @throws If language is not supported or file is not found
   */
  async execute(language: string): Promise<RulesResult> {
    // Validate language code
    if (!this.supportedLanguages.includes(language)) {
        throw new DomainError(
          DomainErrorCodes.VALIDATION_ERROR,
          `Unsupported language code: ${language}. Supported languages are: ${this.supportedLanguages.join(', ')}`
        );
      } // ★★★ 正しい if 文の閉じ括弧の位置 ★★★

    // ★★★ fs.readFile を使うロジック ★★★
    const rulesJsonPath = path.resolve(__dirname, '../../../templates/json/rules.json'); // ★★★ rulesJsonPath を try の外で宣言 ★★★
    logger.debug(`Attempting to read rules file from: ${rulesJsonPath}`);

    try {
      // Directly read the rules.json file
      const jsonContent = await fs.readFile(rulesJsonPath, 'utf-8'); // ★★★ fs を使う ★★★
      logger.debug('[ReadRules] Successfully read file content', { path: rulesJsonPath });

      // 読み込んだJSON文字列をそのまま返す
      const content = jsonContent;

      return {
        content,
        language
      };
    } catch (error: any) {
      // ★★★ fs.readFile のエラーハンドリング ★★★
      logger.error(`Failed to read rules file at path: ${rulesJsonPath}`, { originalError: error });
      throw new DomainError(
        DomainErrorCodes.DOCUMENT_NOT_FOUND,
        `Rules file not found at path: ${rulesJsonPath}`,
        { originalError: error, attemptedPath: rulesJsonPath }
      );
    }
  }
}
