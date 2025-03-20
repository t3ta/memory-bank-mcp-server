import { Argv } from 'yargs';
import { registerJsonCommands } from '../.jsjson/index.js';
import { registerGlobalCommands } from '../.jsglobal/index.js';
import { registerUtilCommands } from '../.jsutils/index.js';
import { registerMigrationCommands } from '../.jsmigration/index.js';

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
