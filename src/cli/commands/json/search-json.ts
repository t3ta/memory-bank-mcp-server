import type { Argv } from "yargs";
import { createApplication } from "../../../main/index.js";
import { logger } from "../../../shared/utils/logger.js";
import { CommandBase } from "../../command-base.js";

/**
 * Command to search for JSON documents
 */
export class SearchJsonCommand extends CommandBase {
  readonly command = 'json search [tags..]';
  readonly description = 'Search for JSON documents by tags';

  /**
   * Configure command arguments and options
   */
  builder(yargs: Argv): Argv {
    return yargs
      .positional('tags', {
        describe: 'Tags to search for',
        type: 'string',
        array: true,
      })
      .option('branch', {
        alias: 'b',
        type: 'string',
        description: 'Branch name (omit for global)',
      })
      .option('all', {
        alias: 'a',
        type: 'boolean',
        description: 'Require all tags to match (default: any tag matches)',
        default: false,
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
      .example(
        '$0 json search architecture design -b feature/my-feature',
        'Search for documents with tags "architecture" or "design"'
      )
      .example(
        '$0 json search architecture design --all',
        'Search for documents with both "architecture" and "design" tags'
      )
      .example('$0 json search --type branchContext', 'Search for all branchContext documents');
  }

  /**
   * Execute the command
   */
  async handler(argv: any): Promise<void> {
    try {
      // Normalize tags
      const tags = argv.tags || [];

      // Initialize application
      const app = await createApplication({
        docsRoot: argv.docs as string,
        verbose: argv.verbose,
      });

      // Get the right repository based on branch/global
      let result;
      if (argv.branch) {
        // Use JSON branch use case through MCP
        result = await app
          .getBranchController()
          .searchJsonDocuments(argv.branch, argv.tags ? argv.tags.join(' ') : '');
      } else {
        // Use JSON global use case through MCP
        result = await app
          .getGlobalController()
          .searchJsonDocuments(argv.tags ? argv.tags.join(' ') : '');
      }

      // Handle response
      if (!result.success) {
        logger.error(`Error searching JSON documents: ${result.error.message}`);
        process.exit(1);
      }

      const documents = result.data;

      // Output message if no documents found
      if (documents.length === 0) {
        const location = argv.branch ? `branch ${argv.branch}` : 'global memory bank';
        const tagsMsg =
          tags.length > 0
            ? `with tags ${tags.map((t: string) => `"${t}"`).join(argv.all ? ' AND ' : ' OR ')}`
            : '';
        const typeMsg = argv.type ? `of type "${argv.type}"` : '';
        const conjunction = tagsMsg && typeMsg ? ' and ' : '';

        logger.info(`No documents found in ${location} ${tagsMsg}${conjunction}${typeMsg}`);
        return;
      }

      // Output in requested format
      if (argv.format === 'json') {
        console.log(JSON.stringify(documents, null, 2));
      } else {
        // Pretty print document list
        console.log(`\nFound ${documents.length} documents:\n`);
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
      this.handleError(error, 'Failed to search JSON documents');
    }
  }
}
