import { Argv } from 'yargs';
import { logger } from '../shared/utils/logger.js';

/**
 * Base class for all CLI commands
 */
export abstract class CommandBase {
  /**
   * Command name
   */
  abstract readonly command: string;

  /**
   * Command description
   */
  abstract readonly description: string;

  /**
   * Configure command arguments and options
   * @param yargs Yargs instance
   * @returns Configured yargs instance
   */
  abstract builder(yargs: Argv): Argv;

  /**
   * Execute the command
   * @param argv Parsed command line arguments
   */
  abstract handler(argv: any): Promise<void>;

  /**
   * Register the command with yargs
   * @param yargs Yargs instance
   * @returns Configured yargs instance with this command registered
   */
  register(yargs: Argv): Argv {
    return yargs.command(
      this.command,
      this.description,
      (y) => this.builder(y),
      async (argv) => {
        try {
          await this.handler(argv);
        } catch (error) {
          logger.error(`Command failed: ${(error as Error).message}`);
          process.exit(1);
        }
      }
    );
  }

  /**
   * Helper to handle common error pattern
   * @param error Error to handle
   * @param message Optional custom error message
   */
  protected handleError(error: unknown, message?: string): never {
    const errorMsg = message || 'Command execution failed';
    
    if (error instanceof Error) {
      logger.error(`${errorMsg}: ${error.message}`);
      if (error.stack && process.env.DEBUG) {
        logger.debug(error.stack);
      }
    } else {
      logger.error(`${errorMsg}: Unknown error`);
    }
    
    process.exit(1);
  }
}
