/**
 * Generate Markdown command
 *
 * CLI command to generate Markdown files from JSON templates
 */
import chalk from "chalk";
import type { CommandModule } from "yargs";
import path from 'path';
import { FileTemplateRepository } from '../../../infrastructure/templates/FileTemplateRepository.js';
import { MarkdownMigrationService } from '../../../migration/MarkdownMigrationService.js';
import { Language } from '../../../domain/i18n/Language.js';
import { createConsoleLogger } from "../../../shared/utils/logger.js";

interface GenerateMarkdownArgs {
  templateId?: string;
  outputDir?: string;
  language?: string;
  jsonDir?: string;
  verbose?: boolean;
}

/**
 * CLI command for generating Markdown files from JSON templates
 */
export const GenerateMarkdownCommand: CommandModule<{}, GenerateMarkdownArgs> = {
  command: 'generate-markdown',
  describe: 'Generate Markdown files from JSON templates',

  builder: (yargs) => {
    return yargs
      .option('templateId', {
        alias: 't',
        describe: 'Template ID to generate (all if not specified)',
        type: 'string',
      })
      .option('outputDir', {
        alias: 'o',
        describe: 'Directory for storing generated Markdown files',
        type: 'string',
      })
      .option('language', {
        alias: 'l',
        describe: 'Language code for templates',
        type: 'string',
        default: 'en',
      })
      .option('jsonDir', {
        alias: 'j',
        describe: 'Directory containing JSON templates',
        type: 'string',
      })
      .option('verbose', {
        alias: 'v',
        describe: 'Output verbose logs',
        type: 'boolean',
        default: false,
      });
  },

  handler: async (args) => {
    // Create logger
    const logLevel = args.verbose ? 'debug' : 'info';
    const logger = createConsoleLogger(logLevel);

    // Output banner
    console.log(chalk.bold.magenta('============================================'));
    console.log(chalk.bold.magenta('📝 Markdown Generator Tool'));
    console.log(chalk.bold.magenta('============================================'));
    console.log();

    try {
      // Set default directories relative to process.cwd()
      const rootDir = process.cwd();
      
      const jsonDir = args.jsonDir
        ? path.resolve(args.jsonDir)
        : path.join(rootDir, 'templates', 'json');
      
      const outputDir = args.outputDir
        ? path.resolve(args.outputDir)
        : path.join(rootDir, 'templates', 'generated');
      
      const languageCode = args.language || 'en';
      const language = new Language(languageCode);
      
      // Summary of operation
      console.log(chalk.yellow('Generation settings:'));
      console.log(`JSON directory: ${chalk.cyan(jsonDir)}`);
      console.log(`Output directory: ${chalk.cyan(outputDir)}`);
      console.log(`Language: ${chalk.cyan(languageCode)}`);
      
      if (args.templateId) {
        console.log(`Specific template: ${chalk.cyan(args.templateId)}`);
      } else {
        console.log(`Target: ${chalk.cyan('All templates')}`);
      }
      console.log();

      // Initialize repository
      const templateRepository = new FileTemplateRepository(jsonDir);
      await templateRepository.initialize();
      
      // Initialize migration service
      const migrationService = new MarkdownMigrationService(
        templateRepository,
        '', // Not used for generation
        '' // Not used for generation
      );
      
      // Execute generation
      console.log(chalk.blue('Starting Markdown generation...'));
      
      const generatedFiles: { id: string, path: string }[] = [];
      
      if (args.templateId) {
        // Check if template exists
        const exists = await templateRepository.templateExists(args.templateId);
        
        if (!exists) {
          console.log(chalk.red(`Template ${args.templateId} not found.`));
          process.exit(1);
        }
        
        // Generate for a specific template
        const filePath = await migrationService.createMarkdownFile(
          args.templateId,
          language,
          outputDir
        );
        
        generatedFiles.push({ id: args.templateId, path: filePath });
      } else {
        // Generate for all templates
        const templateIds = await templateRepository.getAllTemplateIds();
        
        if (templateIds.length === 0) {
          console.log(chalk.yellow('No templates found.'));
          process.exit(0);
        }
        
        for (const templateId of templateIds) {
          try {
            const filePath = await migrationService.createMarkdownFile(
              templateId,
              language,
              outputDir
            );
            
            generatedFiles.push({ id: templateId, path: filePath });
          } catch (error) {
            logger.error(`Failed to generate Markdown for template ${templateId}:`, error);
          }
        }
      }

      // Display results
      console.log();
      if (generatedFiles.length > 0) {
        console.log(chalk.green.bold(`✅ Successfully generated ${generatedFiles.length} Markdown files!`));
        console.log();
        console.log(chalk.yellow('Generated files:'));
        
        for (const file of generatedFiles) {
          console.log(`${chalk.green('✓')} ${chalk.cyan(file.id)}: ${file.path}`);
        }
      } else {
        console.log(chalk.yellow('No Markdown files were generated.'));
      }

      // Exit
      process.exit(0);
    } catch (error) {
      console.error();
      console.error(chalk.red.bold('❌ Generation error:'));
      console.error(chalk.red((error as Error).message));
      
      if (args.verbose) {
        console.error();
        console.error(chalk.gray((error as Error).stack));
      }

      process.exit(1);
    }
  },
};
