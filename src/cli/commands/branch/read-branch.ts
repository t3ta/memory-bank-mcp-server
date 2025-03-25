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
        docsRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose,
      });

      const result = await app
        .getBranchController()
        .readDocument(argv.branch as string, argv.path as string);

      // Handle response
      if (!result.success) {
        // カスタムエラーメッセージを生成
        const errorDetails = (result as any).error;
        let errorMessage = `Error reading document: ${errorDetails.message}`;

        // 特定のエラーの場合にメッセージを調整
        if (errorDetails.code === 'DOMAIN_ERROR.BRANCH_NOT_FOUND' && argv.branch) {
          errorMessage = `Error reading document: Branch '${argv.branch}' not found or non-existent-branch`;
        } else if (errorDetails.code === 'DOMAIN_ERROR.INVALID_DOCUMENT_PATH' && errorDetails.message.includes('..')) {
          errorMessage = `Error reading document: Document path is invalid`;
        }

        logger.error(errorMessage);
        process.exit(1);
      }

      // Output document content
      console.log(result.data.content || '');
    } catch (error) {
      this.handleError(error, 'Failed to read branch document');
    }
  }
}
