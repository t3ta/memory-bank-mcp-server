import { Argv } from 'yargs';
import { CommandBase } from '../../command-base.js';
import createApplication from '../../../main/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { readInput } from '../../utils/input-reader.js';

/**
 * Command to create a new JSON document
 */
export class CreateJsonCommand extends CommandBase {
  readonly command = 'json create <path>';
  readonly description = 'Create a new JSON document';

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
      .option('title', {
        alias: 't',
        type: 'string',
        description: 'Document title',
        demandOption: true,
      })
      .option('type', {
        alias: 'y',
        type: 'string',
        description: 'Document type',
        choices: ['branchContext', 'activeContext', 'progress', 'systemPatterns', 'generic'],
        default: 'generic',
      })
      .option('tags', {
        type: 'array',
        description: 'Document tags (comma-separated)',
        default: [],
      })
      .option('file', {
        alias: 'f',
        type: 'string',
        description: 'Read JSON content from file',
      })
      .option('content', {
        alias: 'c',
        type: 'string',
        description: 'JSON content string (omit to read from stdin)',
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
        '$0 json create myfile.json -b feature/my-feature -t "My Document" -y generic',
        'Create a generic JSON document in a branch'
      )
      .example(
        '$0 json create architecture.json -t "Architecture" -f ./architecture.json',
        'Create a JSON document in global memory bank from file'
      );
  }

  /**
   * Execute the command
   */
  async handler(argv: any): Promise<void> {
    try {
      // Read content from appropriate source
      let contentObj: Record<string, unknown>;

      if (argv.content) {
        // Content provided as string
        try {
          contentObj = JSON.parse(argv.content);
        } catch (err) {
          logger.error('Invalid JSON content provided');
          process.exit(1);
        }
      } else if (argv.file) {
        // Read from file
        const content = await readInput({ file: argv.file });
        try {
          contentObj = JSON.parse(content);
        } catch (err) {
          logger.error(`Invalid JSON in file ${argv.file}`);
          process.exit(1);
        }
      } else {
        // Read from stdin
        const content = await readInput({});
        try {
          contentObj = JSON.parse(content);
        } catch (err) {
          logger.error('Invalid JSON provided via stdin');
          process.exit(1);
        }
      }

      // Initialize application
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        verbose: argv.verbose,
      });

      // Create document object
      const documentData = {
        path: argv.path,
        title: argv.title,
        documentType: argv.type,
        tags: Array.isArray(argv.tags) ? argv.tags : [argv.tags].filter(Boolean),
        content: contentObj,
      };

      // Get the right repository based on branch/global
      let result;
      if (argv.branch) {
        // Use JSON branch use case through MCP
        result = await app.getBranchController().writeJsonDocument(argv.branch, documentData);
      } else {
        // Use JSON global use case through MCP
        result = await app.getGlobalController().writeJsonDocument(documentData);
      }

      // Handle response
      if (!result.success) {
        logger.error(`Error creating JSON document: ${result.error.message}`);
        process.exit(1);
      }

      // Success message
      const location = argv.branch ? `branch ${argv.branch}` : 'global memory bank';
      logger.info(`JSON document ${argv.path} created successfully in ${location}`);
    } catch (error) {
      this.handleError(error, 'Failed to create JSON document');
    }
  }
}
