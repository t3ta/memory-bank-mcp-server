import fs from "fs/promises";
import path from "path";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import { logger } from "../../../shared/utils/logger.js";
// Mock interface for backwards compatibility if templateLoader is used
interface ITemplateLoader {
  getMarkdownTemplate(templateId: string, language: any): Promise<string>;
}
import { getSafeLanguage } from "@memory-bank/schemas";


export type RulesResult = {
  content: string;
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
    private readonly templateLoader?: ITemplateLoader
  ) {
    this.rulesDir = rulesDir;
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
    }

    try {
      // Use template loader if provided
      if (this.templateLoader) {
        try {
          logger.debug(`Using template loader to get rules for language: ${language}`);

          // Safely convert language code
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
          // Fallback to direct file loading if template loader fails
        }
      }

      // Load JSON file directly (fallback or primary method)
      // Try multiple possible paths for the JSON file
      const possiblePaths = [
        // New single template path
        path.join(this.rulesDir, 'templates', 'json', 'rules.json'),
        // New path (domain/templates replaced templates/json)
        path.join(this.rulesDir, 'domain', 'templates', `rules-${language}.json`),
        // Previous path (for compatibility with older systems)
        path.join(this.rulesDir, 'templates', 'json', `rules-${language}.json`),
        // Fallback path
        path.join(this.rulesDir, `rules-${language}.json`)
      ];

      let jsonContent = '';
      let jsonFilePath = '';

      // Find the existing path
      for (const p of possiblePaths) {
        try {
          jsonContent = await fs.readFile(p, 'utf-8');
          jsonFilePath = p;
          logger.debug('Rules JSON file found', { path: jsonFilePath });
          break;
        } catch (err) {
          // Not found at this path, try the next one
          continue;
        }
      }

      if (!jsonContent) {
        throw new Error(`Rules file not found for language: ${language}`);
      }

      const jsonData = JSON.parse(jsonContent);

      // No need to convert JSON to Markdown, return JSON string directly
      // (Markdown support was removed)
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
