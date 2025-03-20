import { Argv } from 'yargs';
import { RecentBranchesCommand } from './recent-branches';

/**
 * Register all utility commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with all utility commands registered
 */
export function registerUtilCommands(yargs: Argv): Argv {
  // Create command instances
  const commands = [new RecentBranchesCommand()];

  // Register each command
  let yargsInstance = yargs;
  for (const command of commands) {
    yargsInstance = command.register(yargsInstance);
  }

  return yargsInstance;
}
