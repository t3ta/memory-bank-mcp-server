import type { Argv } from "yargs";
import { createApplication } from "../../../main/index.js";
import { logger } from "../../../shared/utils/logger.js";
import { CommandBase } from "../../command-base.js";


/**
 * Command to read all core files from a branch memory bank
 */
export class ReadCoreFilesCommand extends CommandBase {
  readonly command = 'read-core-files <branch>';
  readonly description = 'Read all core files from a branch memory bank';

  /**
   * Configure command arguments and options
   */
  builder(yargs: Argv): Argv {
    return yargs
      .positional('branch', {
        describe: 'Branch name',
        type: 'string',
        demandOption: true,
      })
      .option('format', {
        type: 'string',
        description: 'Output format',
        choices: ['json', 'pretty'],
        default: 'pretty',
      })
      .option('docs', {
        alias: 'd',
        type: 'string',
        description: 'Path to docs directory',
        default: './docs',
      })
      .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging',
        default: false,
      })
      .option('language', {
        alias: 'l',
        type: 'string',
        description: 'Language for templates (en or ja)',
        choices: ['en', 'ja'],
        default: 'en',
      })
      .example('$0 read-core-files feature/login', 'Read core files from branch')
      .example(
        '$0 read-core-files feature/login --format json',
        'Output core files in JSON format'
      );
  }

  /**
   * Execute the command
   */
  async handler(argv: any): Promise<void> {
    try {
      const app = await createApplication({
        docsRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose,
      });

      const result = await app.getBranchController().readCoreFiles(argv.branch as string);

      // Handle response
      if (!result.success) {
        logger.error(`Error reading core files: ${(result as any).error.message}`);
        process.exit(1);
      }

      // Output core files in requested format
      if (argv.format === 'json') {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        // Pretty print each file
        console.log('\n=== BRANCH CORE FILES ===\n');
        for (const [path, file] of Object.entries(result.data)) {
          console.log(`\n===== ${path} =====\n`);
          console.log(file.content);
          console.log('\n');
        }
      }
    } catch (error) {
      this.handleError(error, 'Failed to read core files');
    }
  }
}
