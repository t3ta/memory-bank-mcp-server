import { Argv } from 'yargs';
import { CreatePullRequestCommand } from './create-pull-request.js';
import { RecentBranchesCommand } from './recent-branches.js';

/**
 * Register all utility commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with all utility commands registered
 */
export function registerUtilCommands(yargs: Argv): Argv {
  // Create command instances
  const commands = [new CreatePullRequestCommand(), new RecentBranchesCommand()];

  // Register each command
  let yargsInstance = yargs;
  for (const command of commands) {
    yargsInstance = command.register(yargsInstance);
  }

  return yargsInstance;
}
