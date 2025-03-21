import type { Argv } from "yargs";
import { createApplication } from "../../../main/index.js";
import { logger } from "../../../shared/utils/logger.js";
import { CommandBase } from "../../command-base.js";

/**
 * Command to read rules for the specified language
 */
export class ReadRulesCommand extends CommandBase {
  readonly command = 'read-rules';
  readonly description = 'Read memory bank rules';

  /**
   * Configure command arguments and options
   */
  builder(yargs: Argv): Argv {
    return yargs
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
        description: 'Language for rules (en, ja, or zh)',
        choices: ['en', 'ja', 'zh'],
        default: 'en',
      })
      .option('format', {
        type: 'string',
        description: 'Output format',
        choices: ['json', 'pretty'],
        default: 'pretty',
      })
      .example('$0 read-rules', 'Read rules in English')
      .example('$0 read-rules --language ja', 'Read rules in Japanese')
      .example('$0 read-rules --format json', 'Output rules in JSON format');
  }

  /**
   * Execute the command
   */
  async handler(argv: any): Promise<void> {
    try {
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja' | 'zh',
        verbose: argv.verbose,
      });

      const result = await app
        .getContextController()
        .readRules(argv.language as string);

      // Handle response
      if (!result.success) {
        logger.error(`Error reading rules: ${(result as any).error}`);
        process.exit(1);
      }

      if (argv.format === 'json') {
        // Output as JSON
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        // Output the content directly
        console.log(result.data?.content || '');
      }
    } catch (error) {
      this.handleError(error, 'Failed to read rules');
    }
  }
}
