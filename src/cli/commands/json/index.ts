import type { Argv } from "yargs";
import { BuildIndexCommand } from "./build-index.js";
import { CreateJsonCommand } from "./create-json.js";
import { DeleteJsonCommand } from "./delete-json.js";
import { ListJsonCommand } from "./list-json.js";
import { ReadJsonCommand } from "./read-json.js";
import { SearchJsonCommand } from "./search-json.js";
import { UpdateJsonCommand } from "./update-json.js";

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
