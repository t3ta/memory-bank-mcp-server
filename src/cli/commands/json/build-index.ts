import type { Argv } from "yargs";
import { createApplication } from "../../../main/index.js";
import { logger } from "../../../shared/utils/logger.js";
import { CommandBase } from "../../command-base.js";

/**
 * Command to build or rebuild the JSON document index
 */
export class BuildIndexCommand extends CommandBase {
  readonly command = 'json build-index';
  readonly description = 'Build or rebuild the JSON document index';

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
      .option('force', {
        alias: 'f',
        type: 'boolean',
        description: 'Force complete rebuild of index',
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
      .example('$0 json build-index -b feature/my-feature', 'Build index for a branch')
      .example('$0 json build-index', 'Build index for global memory bank')
      .example(
        '$0 json build-index -b feature/my-feature -f',
        'Force complete rebuild of branch index'
      );
  }

  /**
   * Execute the command
   */
  async handler(argv: any): Promise<void> {
    try {
      // Initialize application
      const app = await createApplication({
        docsRoot: argv.docs as string,
        verbose: argv.verbose,
      });

      // Get the right controller based on branch/global
      let result;
      if (argv.branch) {
        // Use JSON branch use case through MCP
        result = await app
          .getBranchController()
          .updateJsonIndex(argv.branch, { force: argv.force });
      } else {
        // Use JSON global use case through MCP
        result = await app.getGlobalController().updateJsonIndex({ force: argv.force });
      }

      // Handle response
      if (!result.success) {
        logger.error(`Error building index: ${result.error.message}`);
        process.exit(1);
      }

      // Success message
      const location = argv.branch ? `branch ${argv.branch}` : 'global memory bank';
      const rebuildType = argv.force ? 'Forced complete rebuild' : 'Incremental update';
      logger.info(`${rebuildType} of JSON document index for ${location} completed successfully.`);

      // Show stats if available
      if (result.data.stats) {
        const stats = result.data.stats;
        console.log('\nIndex Statistics:');
        console.log(`  Documents indexed: ${stats.documentsIndexed || 0}`);
        console.log(`  Tags indexed: ${stats.tagsIndexed || 0}`);
        console.log(`  Execution time: ${stats.executionTimeMs || 0}ms`);
      }
    } catch (error) {
      this.handleError(error, 'Failed to build index');
    }
  }
}
