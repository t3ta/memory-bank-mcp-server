import type { Argv } from "yargs";
import { createApplication } from "../../../main/index.js";
import { logger } from "../../../shared/utils/logger.js";
import { CommandBase } from "../../command-base.js";


/**
 * Command to read a document from branch memory bank
 */
export class ReadBranchCommand extends CommandBase {
  readonly command = 'read-branch <branch> <path>';
  readonly description = 'Read a document from a branch memory bank';

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
      .example('$0 read-branch feature/login activeContext.md', 'Read active context from branch');
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

      const result = await app
        .getBranchController()
        .readDocument(argv.branch as string, argv.path as string);

      // Handle response
      if (!result.success) {
        logger.error(`Error reading document: ${result.error.message}`);
        process.exit(1);
      }

      // Output document content
      console.log(result.data.content || '');
    } catch (error) {
      this.handleError(error, 'Failed to read branch document');
    }
  }
}
