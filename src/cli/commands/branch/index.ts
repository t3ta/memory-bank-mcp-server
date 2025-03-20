import { Argv } from 'yargs';
import { ReadBranchCommand } from './read-branch.js';
import { ReadCoreFilesCommand } from './read-core-files.js';
import { WriteBranchCommand } from './write-branch.js';

/**
 * Register all branch memory bank commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with all branch commands registered
 */
export function registerBranchCommands(yargs: Argv): Argv {
  // Create command instances
  const commands = [new ReadBranchCommand(), new WriteBranchCommand(), new ReadCoreFilesCommand()];

  // Register each command
  let yargsInstance = yargs;
  for (const command of commands) {
    yargsInstance = command.register(yargsInstance);
  }

  return yargsInstance;
}
