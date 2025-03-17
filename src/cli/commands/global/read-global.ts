import { Argv } from 'yargs';
import { CommandBase } from '../../command-base.js';
import createApplication from '../../../main/index.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Command to read a document from global memory bank
 */
export class ReadGlobalCommand extends CommandBase {
  readonly command = 'read-global <path>';
  readonly description = 'Read a document from the global memory bank';

  /**
   * Configure command arguments and options
   */
  builder(yargs: Argv): Argv {
    return yargs
      .positional('path', {
        describe: 'Document path',
        type: 'string',
        demandOption: true,
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
      .example(
        '$0 read-global architecture.md',
        'Read architecture document from global memory bank'
      );
  }

  /**
   * Execute the command
   */
  async handler(argv: any): Promise<void> {
    try {
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose,
      });

      const result = await app.getGlobalController().readDocument(argv.path as string);

      // Handle response
      if (!result.success) {
        logger.error(`Error reading document: ${result.error.message}`);
        process.exit(1);
      }

      // Output document content
      console.log(result.data.content || '');
    } catch (error) {
      this.handleError(error, 'Failed to read global document');
    }
  }
}
