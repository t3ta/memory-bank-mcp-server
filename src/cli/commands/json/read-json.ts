import { Argv } from 'yargs';
import { CommandBase } from '../../command-base.js';
import createApplication from '../../../main/index.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Command to read a JSON document
 */
export class ReadJsonCommand extends CommandBase {
  readonly command = 'json read <path>';
  readonly description = 'Read a JSON document';

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
      .option('format', {
        alias: 'f',
        type: 'string',
        description: 'Output format',
        choices: ['json', 'pretty'],
        default: 'json',
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
      .example('$0 json read myfile.json -b feature/my-feature', 'Read a JSON document from a branch')
      .example('$0 json read architecture.json', 'Read a JSON document from global memory bank')
      .example('$0 json read --id abc123', 'Read a JSON document by ID');
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

      // Get the right repository based on branch/global
      let result;
      if (argv.branch) {
        // Use JSON branch use case through MCP
        result = await app.getBranchController().readJsonDocument(
          argv.branch, 
          { path: argv.path, id: argv.id }
        );
      } else {
        // Use JSON global use case through MCP
        result = await app.getGlobalController().readJsonDocument(
          { path: argv.path, id: argv.id }
        );
      }

      // Handle response
      if (!result.success) {
        logger.error(`Error reading JSON document: ${result.error.message}`);
        process.exit(1);
      }

      // Output in requested format
      if (argv.format === 'pretty') {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(JSON.stringify(result.data));
      }
      
    } catch (error) {
      this.handleError(error, 'Failed to read JSON document');
    }
  }
}
