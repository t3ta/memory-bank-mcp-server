/**
 * Templates Migration command
 *
 * CLI command to migrate Markdown templates to JSON format templates
 */
import chalk from "chalk";
import type { CommandModule } from "yargs";
import path from 'path';
import { FileTemplateRepository } from '../../../infrastructure/templates/FileTemplateRepository.js';
import { MarkdownMigrationService } from '../../../migration/MarkdownMigrationService.js';
import { Language } from '../../../domain/i18n/Language.js';
import { createConsoleLogger } from "../../../shared/utils/logger.js";

interface TemplatesMigrateArgs {
  markdownDir?: string;
  outputDir?: string;
  backupDir?: string;
  force?: boolean;
  language?: string;
  verbose?: boolean;
  templateId?: string;
}

/**
 * CLI command for migrating Markdown templates to JSON templates
 */
export const TemplatesMigrateCommand: CommandModule<{}, TemplatesMigrateArgs> = {
  command: 'migrate-templates',
  describe: 'Migrate Markdown templates to structured JSON templates',

  builder: (yargs) => {
    return yargs
      .option('markdownDir', {
        alias: 'm',
        describe: 'Directory containing Markdown templates',
        type: 'string',
      })
      .option('outputDir', {
        alias: 'o',
        describe: 'Directory for storing JSON templates',
        type: 'string',
      })
      .option('backupDir', {
        alias: 'b',
        describe: 'Directory for backing up original Markdown files',
        type: 'string',
      })
      .option('force', {
        alias: 'f',
        describe: 'Force migration of existing templates',
        type: 'boolean',
        default: false,
      })
      .option('language', {
        alias: 'l',
        describe: 'Language code for templates',
        type: 'string',
        default: 'en',
      })
      .option('verbose', {
        alias: 'v',
        describe: 'Output verbose logs',
        type: 'boolean',
        default: false,
      })
      .option('templateId', {
        alias: 't',
        describe: 'Specific template ID to migrate',
        type: 'string',
      });
  },

  handler: async (args) => {
    // Create logger
    const logLevel = args.verbose ? 'debug' : 'info';
    const logger = createConsoleLogger(logLevel);

    // Output banner
    console.log(chalk.bold.cyan('============================================'));
    console.log(chalk.bold.cyan('🔄 Template Migration Tool'));
    console.log(chalk.bold.cyan('============================================'));
    console.log();

    try {
      // Set default directories relative to process.cwd()
      const rootDir = process.cwd();
      const markdownDir = args.markdownDir 
        ? path.resolve(args.markdownDir)
        : path.join(rootDir, 'templates', 'markdown');
      
      const outputDir = args.outputDir
        ? path.resolve(args.outputDir)
        : path.join(rootDir, 'templates', 'json');
      
      const backupDir = args.backupDir
        ? path.resolve(args.backupDir)
        : path.join(rootDir, 'templates', 'backup');
      
      // Summary of operation
      console.log(chalk.yellow('Migration settings:'));
      console.log(`Markdown directory: ${chalk.cyan(markdownDir)}`);
      console.log(`Output directory: ${chalk.cyan(outputDir)}`);
      console.log(`Backup directory: ${chalk.cyan(backupDir)}`);
      console.log(`Force migration: ${args.force ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`Language: ${chalk.cyan(args.language)}`);
      if (args.templateId) {
        console.log(`Specific template: ${chalk.cyan(args.templateId)}`);
      }
      console.log();

      // Initialize repository
      const templateRepository = new FileTemplateRepository(outputDir);
      await templateRepository.initialize();
      
      // Initialize migration service
      const migrationService = new MarkdownMigrationService(
        templateRepository,
        markdownDir,
        backupDir
      );

      // Execute migration
      console.log(chalk.blue('Starting template migration...'));
      let migratedIds: string[] = [];

      if (args.templateId) {
        // Check if template already exists
        const exists = await templateRepository.templateExists(args.templateId);
        
        if (exists && !args.force) {
          console.log(chalk.yellow(`Template ${args.templateId} already exists, skipping migration.`));
          console.log(chalk.yellow('Use --force to override.'));
          process.exit(0);
        }
        
        // Migrate specific template
        const templateId = await migrationService.migrateTemplate(args.templateId);
        migratedIds = [templateId];
      } else {
        // Migrate all templates
        migratedIds = await migrationService.migrateAllTemplates();
      }

      // Display results
      console.log();
      if (migratedIds.length > 0) {
        console.log(chalk.green.bold(`✅ Successfully migrated ${migratedIds.length} templates!`));
        console.log();
        console.log(chalk.yellow('Migrated templates:'));
        
        for (const id of migratedIds) {
          console.log(`${chalk.green('✓')} ${chalk.cyan(id)}`);
        }
      } else {
        console.log(chalk.yellow('No templates were migrated. They may already exist or no templates were found.'));
        console.log(chalk.yellow('Use --force to override existing templates.'));
      }

      // Exit
      process.exit(0);
    } catch (error) {
      console.error();
      console.error(chalk.red.bold('❌ Migration error:'));
      console.error(chalk.red((error as Error).message));
      
      if (args.verbose) {
        console.error();
        console.error(chalk.gray((error as Error).stack));
      }

      process.exit(1);
    }
  },
};
