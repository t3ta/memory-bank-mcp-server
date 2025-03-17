import { Argv } from 'yargs';
import { registerJsonCommands } from './json/index.js';
import { registerGlobalCommands } from './global/index.js';
import { registerBranchCommands } from './branch/index.js';
import { registerUtilCommands } from './utils/index.js';

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
  yargsInstance = registerBranchCommands(yargsInstance);

  // Register Utility commands
  yargsInstance = registerUtilCommands(yargsInstance);

  return yargsInstance;
}
