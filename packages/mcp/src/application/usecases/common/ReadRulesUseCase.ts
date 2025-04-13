// import fs from "fs/promises"; // ★削除 (使わなくなった)
// import fsExtra from "fs-extra"; // Remove fs-extra import for readJson
import path from "path"; // ★元に戻す★
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import { logger } from "../../../shared/utils/logger.js";
import { TemplateService } from '../../templates/TemplateService.js'; // Import TemplateService
import { Language } from '../../../domain/i18n/Language.js'; // Import Language class from domain
import { getSafeLanguage } from '@memory-bank/schemas'; // Use package name import
export type RulesResult = {
  content: Record<string, unknown>; // Change type to object
  language: string;
};

/**
 * Use case for reading rules
 */
export class ReadRulesUseCase {
  private readonly rulesDir: string;
  private readonly supportedLanguages = ['en', 'ja', 'zh'];

  /**
   * Constructor
   * @param rulesDir Rules directory path
 * @param templateLoader Template loader (optional)
 */
constructor(
 rulesDir: string,
 private readonly templateLoader?: TemplateService // Type is already TemplateService, ensure consistency
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
   logger.debug(`Executing ReadRulesUseCase for language: ${language}`); // Log execution start
  // Validate language code
  if (!this.supportedLanguages.includes(language)) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Unsupported language code: ${language}. Supported languages are: ${this.supportedLanguages.join(', ')}`
      );
    }

    // Define the primary path for the rules file
    // Older paths were removed as they are deprecated.
    // const primaryRulesPath = path.join(this.rulesDir, 'domain', 'templates', `rules-${language}.json`); // ★削除 (使わなくなった)
    // const possiblePaths = [primaryRulesPath]; // ★削除 (使わなくなった)

    // let jsonContent = ''; // ★削除 (使わなくなった)
    // let jsonFilePath = ''; // ★削除 (使わなくなった)

    try {
      // Add explicit log showing if templateLoader is available
      logger.debug(`ReadRulesUseCase: templateLoader available: ${!!this.templateLoader}`);

      // Use template loader if provided
      if (this.templateLoader) {
        try {
          logger.debug(`Using template loader to get rules for language: ${language}`);

          // Safely convert language code
          const safeLanguageCode = getSafeLanguage(language); // Get safe language code ('en', 'ja', or 'zh')

          const langObject = new Language(safeLanguageCode); // Instantiate Language class

          const templateJsonObject = await this.templateLoader.getTemplateAsJsonObject(
            'rules',
            langObject // Pass Language object
          );

          // Return the object directly
          return {
            content: templateJsonObject, // Return the object
            language
          };
        } catch (templateError) {
          // TemplateService でエラーが発生したら、そのままエラーを投げる
          logger.error(`Failed to load rules using template loader: ${templateError instanceof Error ? templateError.message : 'Unknown error'}`);
          throw templateError; // エラーを再スロー
        }
      } else {
        // templateLoader がない場合はエラー (DI設定ミスなど)
        throw new Error('TemplateService (templateLoader) is not provided to ReadRulesUseCase.');
      }
      // --- Fallback 処理は削除 ---
  } catch (error: any) {
    // TemplateService からのエラーはそのまま再スローする
    // (エラーメッセージの書き換えはしない)
    logger.error(`Error executing ReadRulesUseCase for language ${language}:`, { originalError: error });
    throw error; // ★エラーをそのまま再スロー★
  }
}
} // ★クラスを閉じる括弧を追加★
