import { Argv } from 'yargs';
import { ReadGlobalCommand } from './read-global.js';
import { WriteGlobalCommand } from './write-global.js';

/**
 * Register all global memory bank commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with all global commands registered
 */
export function registerGlobalCommands(yargs: Argv): Argv {
  // Create command instances
  const commands = [
    new ReadGlobalCommand(),
    new WriteGlobalCommand(),
  ];

  // Register each command
  let yargsInstance = yargs;
  for (const command of commands) {
    yargsInstance = command.register(yargsInstance);
  }

  return yargsInstance;
}
