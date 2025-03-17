import { Argv } from 'yargs';
import { CommandBase } from '../../command-base.js';
import createApplication from '../../../main/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { readInput } from '../../utils/input-reader.js';

/**
 * Command to update an existing JSON document
 */
export class UpdateJsonCommand extends CommandBase {
  readonly command = 'json update <path>';
  readonly description = 'Update an existing JSON document';

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
      .option('title', {
        alias: 't',
        type: 'string',
        description: 'Update document title',
      })
      .option('type', {
        alias: 'y',
        type: 'string',
        description: 'Update document type',
        choices: ['branchContext', 'activeContext', 'progress', 'systemPatterns', 'generic'],
      })
      .option('tags', {
        type: 'array',
        description: 'Update document tags (comma-separated)',
      })
      .option('file', {
        alias: 'f',
        type: 'string',
        description: 'Read updated JSON content from file',
      })
      .option('content', {
        alias: 'c',
        type: 'string',
        description: 'Updated JSON content string (omit to read from stdin)',
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
        '$0 json update myfile.json -b feature/my-feature -t "Updated Title"',
        'Update document title'
      )
      .example(
        '$0 json update myfile.json -b feature/my-feature -f ./updated.json',
        'Update document content from file'
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

      // First, read the existing document
      let readResult;
      if (argv.branch) {
        // Use JSON branch use case through MCP
        readResult = await app
          .getBranchController()
          .readJsonDocument(argv.branch, { path: argv.path, id: argv.id });
      } else {
        // Use JSON global use case through MCP
        readResult = await app
          .getGlobalController()
          .readJsonDocument({ path: argv.path, id: argv.id });
      }

      // Handle read response
      if (!readResult.success) {
        logger.error(`Error reading JSON document: ${readResult.error.message}`);
        process.exit(1);
      }

      // Get existing document data
      const existingDoc = readResult.data;

      // Prepare update with existing values as defaults
      let contentObj: Record<string, unknown> = existingDoc.content;

      // Update content if provided
      if (argv.content || argv.file) {
        // Read updated content
        const contentStr = argv.content ? argv.content : await readInput({ file: argv.file });

        try {
          contentObj = JSON.parse(contentStr);
        } catch (err) {
          logger.error('Invalid JSON content provided');
          process.exit(1);
        }
      }

      // Create document object with updates
      const documentData = {
        id: existingDoc.id,
        path: argv.path,
        title: argv.title || existingDoc.title,
        documentType: argv.type || existingDoc.documentType,
        tags: argv.tags
          ? Array.isArray(argv.tags)
            ? argv.tags
            : [argv.tags].filter(Boolean)
          : existingDoc.tags,
        content: contentObj,
      };

      // Update document
      let updateResult;
      if (argv.branch) {
        // Use JSON branch use case through MCP
        updateResult = await app.getBranchController().writeJsonDocument(argv.branch, documentData);
      } else {
        // Use JSON global use case through MCP
        updateResult = await app.getGlobalController().writeJsonDocument(documentData);
      }

      // Handle update response
      if (!updateResult.success) {
        logger.error(`Error updating JSON document: ${updateResult.error.message}`);
        process.exit(1);
      }

      // Success message
      const location = argv.branch ? `branch ${argv.branch}` : 'global memory bank';
      logger.info(`JSON document ${argv.path} updated successfully in ${location}`);
    } catch (error) {
      this.handleError(error, 'Failed to update JSON document');
    }
  }
}
