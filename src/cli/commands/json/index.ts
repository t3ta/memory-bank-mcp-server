import { Argv } from 'yargs';
import { CreateJsonCommand } from './create-json';
import { ReadJsonCommand } from './read-json';
import { UpdateJsonCommand } from './update-json';
import { DeleteJsonCommand } from './delete-json';
import { SearchJsonCommand } from './search-json';
import { ListJsonCommand } from './list-json';
import { BuildIndexCommand } from './build-index';

/**
 * Register all JSON commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with all JSON commands registered
 */
export function registerJsonCommands(yargs: Argv): Argv {
  // Create command instances
  const commands = [
    new CreateJsonCommand(),
    new ReadJsonCommand(),
    new UpdateJsonCommand(),
    new DeleteJsonCommand(),
    new SearchJsonCommand(),
    new ListJsonCommand(),
    new BuildIndexCommand(),
  ];

  // Register each command
  let yargsInstance = yargs;
  for (const command of commands) {
    yargsInstance = command.register(yargsInstance);
  }

  return yargsInstance;
}
