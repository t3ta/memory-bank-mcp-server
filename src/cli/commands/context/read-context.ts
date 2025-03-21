import type { Argv } from "yargs";
import { createApplication } from "../../../main/index.js";
import { logger } from "../../../shared/utils/logger.js";
import { CommandBase } from "../../command-base.js";

/**
 * Command to read context information (rules, branch memory, global memory)
 */
export class ReadContextCommand extends CommandBase {
  readonly command = 'read-context <branch>';
  readonly description = 'Read context information (rules, branch memory, global memory)';

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
        description: 'Language for templates (en, ja, or zh)',
        choices: ['en', 'ja', 'zh'],
        default: 'en',
      })
      .option('include-rules', {
        type: 'boolean',
        description: 'Include rules in the context',
        default: true,
      })
      .option('include-branch-memory', {
        type: 'boolean',
        description: 'Include branch memory in the context',
        default: true,
      })
      .option('include-global-memory', {
        type: 'boolean',
        description: 'Include global memory in the context',
        default: true,
      })
      .option('format', {
        type: 'string',
        description: 'Output format',
        choices: ['json', 'pretty'],
        default: 'json',
      })
      .example('$0 read-context feature/login', 'Read all context for branch feature/login')
      .example('$0 read-context feature/login --no-include-global-memory', 'Read context without global memory');
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

      const request = {
        branch: argv.branch as string,
        language: argv.language as string,
        includeRules: argv.includeRules as boolean,
        includeBranchMemory: argv.includeBranchMemory as boolean,
        includeGlobalMemory: argv.includeGlobalMemory as boolean
      };

      const result = await app
        .getContextController()
        .readContext(request);

      // Handle response
      if (!result.success) {
        logger.error(`Error reading context: ${(result as any).error}`);
        process.exit(1);
      }

      if (argv.format === 'json') {
        // Output as JSON
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        // Pretty format output (simplified for now)
        console.log('\n=== CONTEXT INFORMATION ===\n');
        
        if (result.data?.rules) {
          console.log('=== RULES ===');
          console.log(result.data.rules.content);
          console.log();
        }
        
        if (result.data?.branchMemory) {
          console.log('=== BRANCH MEMORY ===');
          for (const [path, content] of Object.entries(result.data.branchMemory)) {
            console.log(`--- ${path} ---`);
            console.log(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
            console.log();
          }
        }
        
        if (result.data?.globalMemory) {
          console.log('=== GLOBAL MEMORY ===');
          for (const [path, content] of Object.entries(result.data.globalMemory)) {
            console.log(`--- ${path} ---`);
            console.log(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
            console.log();
          }
        }
      }
    } catch (error) {
      this.handleError(error, 'Failed to read context');
    }
  }
}
