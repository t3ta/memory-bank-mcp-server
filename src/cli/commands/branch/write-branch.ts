import { Argv } from 'yargs';
import { CommandBase } from '../command-base.js';
import { createApplication } from '../main/index.js';
import { logger } from '../shared/utils/logger.js';
import { readInput } from '..utils/input-reader.js';

/**
 * Command to write a document to branch memory bank
 */
export class WriteBranchCommand extends CommandBase {
  readonly command = 'write-branch <branch> <path> [content]';
  readonly description = 'Write a document to a branch memory bank';

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
      .positional('content', {
        describe: 'Document content (omit to read from stdin)',
        type: 'string',
      })
      .option('file', {
        alias: 'f',
        type: 'string',
        description: 'Read content from file',
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
        '$0 write-branch feature/login activeContext.md -f ./content.md',
        'Write content from file'
      )
      .example(
        '$0 write-branch feature/login notes.md "My notes content"',
        'Write with inline content'
      );
  }

  /**
   * Execute the command
   */
  async handler(argv: any): Promise<void> {
    try {
      // Read content from appropriate source
      const content = argv.content || (await readInput({ file: argv.file as string }));

      // Initialize application
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose,
      });

      // Write document
      const result = await app
        .getBranchController()
        .writeDocument(argv.branch as string, argv.path as string, content);

      // Handle response
      if (!result.success) {
        logger.error(`Error writing document: ${result.error.message}`);
        process.exit(1);
      }

      logger.info(`Document ${argv.path} written successfully to branch ${argv.branch}`);
    } catch (error) {
      this.handleError(error, 'Failed to write branch document');
    }
  }
}
