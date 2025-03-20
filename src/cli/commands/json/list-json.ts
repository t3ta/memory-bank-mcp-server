import { Argv } from 'yargs';
import { CommandBase } from '../../command-base';
import { createApplication } from '../../../main/index';
import { logger } from '../../../shared/utils/logger';

/**
 * Command to list all JSON documents
 */
export class ListJsonCommand extends CommandBase {
  readonly command = 'json list';
  readonly description = 'List all JSON documents';

  /**
   * Configure command arguments and options
   */
  builder(yargs: Argv): Argv {
    return yargs
      .option('branch', {
        alias: 'b',
        type: 'string',
        description: 'Branch name (omit for global)',
      })
      .option('type', {
        alias: 't',
        type: 'string',
        description: 'Filter by document type',
        choices: ['branchContext', 'activeContext', 'progress', 'systemPatterns', 'generic'],
      })
      .option('format', {
        alias: 'f',
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
      .example('$0 json list -b feature/my-feature', 'List all JSON documents in a branch')
      .example('$0 json list', 'List all JSON documents in global memory bank')
      .example(
        '$0 json list -t activeContext --format json',
        'List activeContext documents in JSON format'
      );
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
        result = await app
          .getBranchController()
          .listJsonDocuments(argv.branch, { type: argv.type });
      } else {
        // Use JSON global use case through MCP
        result = await app.getGlobalController().listJsonDocuments({ type: argv.type });
      }

      // Handle response
      if (!result.success) {
        logger.error(`Error listing JSON documents: ${result.error.message}`);
        process.exit(1);
      }

      const documents = result.data;

      // Output message if no documents found
      if (documents.length === 0) {
        const location = argv.branch ? `branch ${argv.branch}` : 'global memory bank';
        const typeMsg = argv.type ? `of type "${argv.type}"` : '';

        logger.info(`No JSON documents found in ${location} ${typeMsg}`);
        return;
      }

      // Output in requested format
      if (argv.format === 'json') {
        console.log(JSON.stringify(documents, null, 2));
      } else {
        // Pretty print document list
        const location = argv.branch ? `branch ${argv.branch}` : 'global memory bank';
        console.log(`\nJSON Documents in ${location}:\n`);

        documents.forEach((doc: any, index: number) => {
          console.log(`${index + 1}. ${doc.title || doc.path}`);
          console.log(`   Path: ${doc.path}`);
          console.log(`   Type: ${doc.documentType}`);
          console.log(`   Tags: ${doc.tags.join(', ') || 'none'}`);
          console.log(`   Last Modified: ${new Date(doc.lastModified).toLocaleString()}`);
          console.log();
        });
      }
    } catch (error) {
      this.handleError(error, 'Failed to list JSON documents');
    }
  }
}
