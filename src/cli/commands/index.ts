import { Argv } from 'yargs';
import { registerJsonCommands } from './json/index.js';

/**
 * Register all CLI commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with all commands registered
 */
export function registerAllCommands(yargs: Argv): Argv {
  // Register JSON commands
  let yargsInstance = registerJsonCommands(yargs);

  // Register other command groups here as they are implemented
  // Example: yargsInstance = registerMarkdownCommands(yargsInstance);

  return yargsInstance;
}
