import { Argv } from 'yargs';
import { MigrateCommand } from './MigrateCommand';

/**
 * Register all migration-related commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with migration commands registered
 */
export function registerMigrationCommands(yargs: Argv): Argv {
  return yargs.command(MigrateCommand);
}
