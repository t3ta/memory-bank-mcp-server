/**
 * Migration command
 *
 * CLI command to migrate Markdown files to JSON format
 */
import chalk from "chalk";
import type { CommandModule } from "yargs";
import { ConverterFactory } from "../../../migration/converters/ConverterFactory.js";
import { MarkdownToJsonMigrator, type MigrationOptions } from "../../../migration/MarkdownToJsonMigrator.js";
import { MigrationBackup } from "../../../migration/MigrationBackup.js";
import { MigrationValidator } from "../../../migration/MigrationValidator.js";
import { createConsoleLogger } from "../../../shared/utils/logger.js";

interface MigrateArgs {
  directory: string;
  file?: string;
  backup?: boolean;
  overwrite?: boolean;
  validate?: boolean;
  deleteOriginals?: boolean;
  verbose?: boolean;
}

/**
 * CLI command for migrating Markdown files to JSON
 */
export const MigrateCommand: CommandModule<{}, MigrateArgs> = {
  command: 'migrate',
  describe: 'Migrate Markdown files to JSON format',

  builder: (yargs) => {
    return yargs
      .option('directory', {
        alias: 'd',
        describe: 'Directory containing Markdown files to migrate',
        type: 'string',
        default: './docs',
      })
      .option('file', {
        alias: 'f',
        describe: 'Specific Markdown file to migrate',
        type: 'string',
      })
      .option('backup', {
        alias: 'b',
        describe: 'Create backup before migration',
        type: 'boolean',
        default: true,
      })
      .option('overwrite', {
        alias: 'o',
        describe: 'Overwrite existing JSON files',
        type: 'boolean',
        default: false,
      })
      .option('validate', {
        alias: 'v',
        describe: 'Validate generated JSON against schema',
        type: 'boolean',
        default: true,
      })
      .option('deleteOriginals', {
        alias: 'D',
        describe: 'Delete original Markdown files after successful migration',
        type: 'boolean',
        default: false,
      })
      .option('verbose', {
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
    console.log(chalk.bold.blue('============================================'));
    console.log(chalk.bold.blue('📝 Markdown to JSON Migration Tool'));
    console.log(chalk.bold.blue('============================================'));
    console.log();

    try {
      // Create dependencies
      const backupService = new MigrationBackup(logger);
      const validator = new MigrationValidator(logger);
      const converterFactory = new ConverterFactory();

      // Create migrator
      const migrator = new MarkdownToJsonMigrator(
        backupService,
        validator,
        converterFactory,
        logger
      );

      // Prepare options
      const options: MigrationOptions = {
        createBackup: args.backup,
        overwriteExisting: args.overwrite,
        validateJson: args.validate,
        deleteOriginals: args.deleteOriginals,
      };

      // Summary of operation
      console.log(chalk.yellow('Migration settings:'));
      console.log(`Directory: ${chalk.cyan(args.directory)}`);
      if (args.file) {
        console.log(`File: ${chalk.cyan(args.file)}`);
      }
      console.log(`Create backup: ${args.backup ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`Overwrite existing: ${args.overwrite ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(`Validate JSON: ${args.validate ? chalk.green('Yes') : chalk.red('No')}`);
      console.log(
        `Delete originals: ${args.deleteOriginals ? chalk.yellow('Yes') : chalk.green('No')}`
      );
      console.log();

      // Confirm with user if deleting originals
      if (args.deleteOriginals) {
        // In a real CLI, we would add a confirmation prompt here
        console.log(
          chalk.yellow.bold('⚠️  Warning: Original Markdown files will be deleted after migration!')
        );
        console.log();
      }

      // Execute migration
      console.log(chalk.blue('Starting migration..'));

      let result;
      if (args.file) {
        const success = await migrator.migrateFile(args.file, undefined, {
          validateJson: args.validate,
        });
        result = {
          success,
          stats: {
            successCount: success ? 1 : 0,
            failureCount: success ? 0 : 1,
            skippedCount: 0,
            failures: success ? [] : [{ path: args.file, error: 'Migration failed' }],
          },
        };
      } else {
        result = await migrator.migrateDirectory(args.directory, options);
      }

      // Display results
      console.log();
      if (result.success) {
        console.log(chalk.green.bold('✅ Migration completed successfully!'));
      } else {
        console.log(chalk.red.bold('❌ Migration completed with errors!'));
      }

      console.log();
      console.log(chalk.yellow('Stats:'));
      console.log(`${chalk.green('✓')} Successful: ${chalk.green(result.stats.successCount)}`);
      console.log(`${chalk.red('✗')} Failed: ${chalk.red(result.stats.failureCount)}`);
      console.log(`${chalk.blue('◦')} Skipped: ${chalk.blue(result.stats.skippedCount)}`);

      if (result.stats.backupPath) {
        console.log();
        console.log(chalk.yellow('Backup created at:'));
        console.log(chalk.cyan(result.stats.backupPath));
      }

      if (result.stats.failures.length > 0) {
        console.log();
        console.log(chalk.red.bold('Failures:'));
        result.stats.failures.forEach((failure, index) => {
          console.log(`${index + 1}. ${chalk.cyan(failure.path)}: ${chalk.red(failure.error)}`);
        });
      }

      // Exit
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error();
      console.error(chalk.red.bold('❌ Fatal error:'));
      console.error(chalk.red((error as Error).message));
      console.error();
      console.error(chalk.gray((error as Error).stack));

      process.exit(1);
    }
  },
};
