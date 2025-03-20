import { Argv } from 'yargs';
import { CommandBase } from '../../command-base';
import { createApplication } from '../../../main/index';
import { logger } from '../../../shared/utils/logger';

/**
 * Command to get recent branches
 */
export class RecentBranchesCommand extends CommandBase {
  readonly command = 'recent-branches [limit]';
  readonly description = 'Get recent branches';

  /**
   * Configure command arguments and options
   */
  builder(yargs: Argv): Argv {
    return yargs
      .positional('limit', {
        describe: 'Maximum number of branches to return',
        type: 'number',
        default: 10,
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
      .option('format', {
        type: 'string',
        description: 'Output format',
        choices: ['json', 'pretty'],
        default: 'pretty',
      })
      .example('$0 recent-branches', 'Show 10 most recent branches')
      .example('$0 recent-branches 20', 'Show 20 most recent branches')
      .example('$0 recent-branches --format json', 'Show recent branches in JSON format');
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

      const result = await app.getBranchController().getRecentBranches(argv.limit as number);

      // Handle response
      if (!result.success) {
        logger.error(`Error getting recent branches: ${result.error.message}`);
        process.exit(1);
      }

      if (argv.format === 'json') {
        // Output as JSON
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        // Output in a pretty format
        console.log('\n=== RECENT BRANCHES ===\n');
        result.data.forEach(
          (
            branch: {
              name: string;
              lastModified: string | number | Date;
              summary?: { currentWork?: string };
            },
            index: number
          ) => {
            console.log(`${index + 1}. ${branch.name}`);
            console.log(`   Last modified: ${new Date(branch.lastModified).toLocaleString()}`);
            if (branch.summary?.currentWork) {
              console.log(`   Current work: ${branch.summary.currentWork}`);
            }
            console.log();
          }
        );
      }
    } catch (error) {
      this.handleError(error, 'Failed to get recent branches');
    }
  }
}
