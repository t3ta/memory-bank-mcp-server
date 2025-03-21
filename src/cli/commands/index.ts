import type { Argv } from "yargs";
import { registerBranchCommands } from "./branch/index.js";
import { registerContextCommands } from "./context/index.js";
import { registerGlobalCommands } from "./global/index.js";
import { registerJsonCommands } from "./json/index.js";
import { registerMigrationCommands } from "./migration/index.js";
import { registerUtilCommands } from "./utils/index.js";

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
  
  // Register Context commands
  yargsInstance = registerContextCommands(yargsInstance);
  
  // Register Utility commands
  yargsInstance = registerUtilCommands(yargsInstance);

  // Register Migration commands
  yargsInstance = registerMigrationCommands(yargsInstance);

  return yargsInstance;
}
