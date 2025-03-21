import type { Argv } from "yargs";
import { ReadContextCommand } from "./read-context.js";
import { ReadRulesCommand } from "./read-rules.js";

/**
 * Register all context-related commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with all context commands registered
 */
export function registerContextCommands(yargs: Argv): Argv {
  // Create command instances
  const commands = [
    new ReadContextCommand(),
    new ReadRulesCommand()
  ];

  // Register each command
  let yargsInstance = yargs;
  for (const command of commands) {
    yargsInstance = command.register(yargsInstance);
  }

  return yargsInstance;
}
