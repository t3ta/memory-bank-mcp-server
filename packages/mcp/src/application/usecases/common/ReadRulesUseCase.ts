import fs from "fs/promises"; // Use standard fs/promises
// import fsExtra from "fs-extra"; // Remove fs-extra import for readJson
import path from "path";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import { logger } from "../../../shared/utils/logger.js";
import { TemplateService } from '../../templates/TemplateService.js'; // Import TemplateService
import { Language } from '../../../domain/i18n/Language.js'; // Import Language class from domain
import { getSafeLanguage } from '@memory-bank/schemas'; // Use package name import
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
    const primaryRulesPath = path.join(this.rulesDir, 'domain', 'templates', `rules-${language}.json`);
    const possiblePaths = [primaryRulesPath]; // Keep as array for loop logic, but only contain the primary path

    let jsonContent = ''; // Declare jsonContent here to be accessible in the outer scope
    let jsonFilePath = ''; // Declare jsonFilePath here

    try {

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

          const content = JSON.stringify(templateJsonObject, null, 2);

          return {
            content: content,
            language
          };
        } catch (templateError) {
          logger.warn(`Failed to load rules using template loader: ${templateError instanceof Error ? templateError.message : 'Unknown error'}`); // Keep warning
          // logger.debug('Falling back to direct file loading'); // Remove debug log
          // Fallback to direct file loading if template loader fails
        }
      }

      // Load JSON file directly (fallback or primary method) - This fallback might still be needed if template service fails catastrophically
      for (const p of possiblePaths) {
        const absolutePath = path.resolve(p); // Resolve to absolute path
        logger.debug(`[ReadRules] Attempting path: ${absolutePath}`);
        try {
          // Check file existence explicitly before reading
          await fs.access(absolutePath);
          logger.debug(`[ReadRules] File exists at: ${absolutePath}`);
          try {
            jsonContent = await fs.readFile(absolutePath, 'utf-8'); // Use standard fs.readFile
            jsonFilePath = absolutePath; // Assign value here
            logger.debug('[ReadRules] Successfully read file content', { path: jsonFilePath });
            break; // Exit loop once file is found and read
          } catch (readError: any) {
            logger.error(`[ReadRules] File exists but failed to read: ${absolutePath}`, { error: readError.message });
            // Continue to next path if read fails even if file exists
          }
        } catch (accessError: any) {
          if (accessError.code === 'ENOENT') {
            logger.debug(`[ReadRules] File does not exist at: ${absolutePath}`);
          } else {
            logger.warn(`[ReadRules] Error checking file access for ${absolutePath}: ${accessError.message}`);
          }
          // Continue to the next path if access fails (e.g., file not found)
        }
      }

      if (!jsonContent) {
        // If no file was found after trying all paths, throw the specific error
        throw new Error(`Rules file not found for language: ${language}`);
      }

      // Parse the content after reading (fallback path)
      const jsonData = JSON.parse(jsonContent);

      // Return JSON string directly (fallback path)
      // (Markdown support was removed)
      const content = JSON.stringify(jsonData, null, 2);

      return {
        content,
        language
      };
    } catch (error: any) {
      const attemptedPaths = possiblePaths.join(', ');
      logger.error(`Failed to find or read rules file for language ${language}. Attempted paths: ${attemptedPaths}`, { originalError: error });
      throw new DomainError(
        DomainErrorCodes.DOCUMENT_NOT_FOUND,
        `Rules file not found for language: ${language}. Attempted paths: ${attemptedPaths}`,
        { originalError: error, attemptedPaths }
      );
    }
  }
}
