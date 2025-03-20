import { Argv } from 'yargs';
import { CreateJsonCommand } from '../.jscreate-json.js';
import { ReadJsonCommand } from '../.jsread-json.js';
import { UpdateJsonCommand } from '../.jsupdate-json.js';
import { DeleteJsonCommand } from '../.jsdelete-json.js';
import { SearchJsonCommand } from '../.jssearch-json.js';
import { ListJsonCommand } from '../.jslist-json.js';
import { BuildIndexCommand } from '../.jsbuild-index.js';

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
