import { Argv } from 'yargs';
import { CommandBase } from '../../command-base.js';
import createApplication from '../../../main/index.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Command to delete a JSON document
 */
export class DeleteJsonCommand extends CommandBase {
  readonly command = 'json delete <path>';
  readonly description = 'Delete a JSON document';

  /**
   * Configure command arguments and options
   */
  builder(yargs: Argv): Argv {
    return yargs
      .positional('path', {
        describe: 'Document path (e.g. "myfile.json")',
        type: 'string',
        demandOption: true,
      })
      .option('branch', {
        alias: 'b',
        type: 'string',
        description: 'Branch name (omit for global)',
      })
      .option('id', {
        alias: 'i',
        type: 'string',
        description: 'Document ID (alternative to path)',
      })
      .option('force', {
        alias: 'f',
        type: 'boolean',
        description: 'Force deletion without confirmation',
        default: false,
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
      .example(
        '$0 json delete myfile.json -b feature/my-feature',
        'Delete a JSON document from a branch'
      )
      .example('$0 json delete architecture.json', 'Delete a JSON document from global memory bank')
      .example('$0 json delete --id abc123 -f', 'Force delete a JSON document by ID');
  }

  /**
   * Execute the command
   */
  async handler(argv: any): Promise<void> {
    try {
      // Initialize application
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        verbose: argv.verbose,
      });

      // Confirm deletion unless force option is used
      if (!argv.force) {
        const location = argv.branch ? `branch ${argv.branch}` : 'global memory bank';
        const confirmMessage = `Are you sure you want to delete the document ${argv.path} from ${location}? (y/N): `;

        // Use readline for simple confirmation
        const readline = (await import('readline')).default.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const confirmation = await new Promise<string>((resolve) => {
          readline.question(confirmMessage, (answer) => {
            readline.close();
            resolve(answer.toLowerCase());
          });
        });

        if (confirmation !== 'y' && confirmation !== 'yes') {
          logger.info('Deletion cancelled');
          return;
        }
      }

      // Get the right repository based on branch/global
      let result;
      if (argv.branch) {
        // Use JSON branch use case through MCP
        result = await app
          .getBranchController()
          .deleteJsonDocument(argv.branch, { path: argv.path, id: argv.id });
      } else {
        // Use JSON global use case through MCP
        result = await app
          .getGlobalController()
          .deleteJsonDocument({ path: argv.path, id: argv.id });
      }

      // Handle response
      if (!result.success) {
        logger.error(`Error deleting JSON document: ${result.error.message}`);
        process.exit(1);
      }

      // Success message
      const location = argv.branch ? `branch ${argv.branch}` : 'global memory bank';
      logger.info(`JSON document ${argv.path || argv.id} deleted successfully from ${location}`);
    } catch (error) {
      this.handleError(error, 'Failed to delete JSON document');
    }
  }
}
