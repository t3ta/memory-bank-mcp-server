import { Argv } from 'yargs';
import { registerJsonCommands } from './json/index';
import { registerGlobalCommands } from './global/index';
import { registerUtilCommands } from './utils/index';
import { registerMigrationCommands } from './migration/index';

/**
 * Register all CLI commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with all commands registered
 */
export function registerAllCommands(yargs: Argv): Argv {
  // Register each command group
  let yargsInstance = yargs;

  // Register JSON commands
  yargsInstance = registerJsonCommands(yargsInstance);

  // Register Global commands
  yargsInstance = registerGlobalCommands(yargsInstance);

  // Register Branch commands
  // Register Utility commands
  yargsInstance = registerUtilCommands(yargsInstance);

  // Register Migration commands
  yargsInstance = registerMigrationCommands(yargsInstance);

  // Register Utility commands
  yargsInstance = registerUtilCommands(yargsInstance);

  return yargsInstance;
}
