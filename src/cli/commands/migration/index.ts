import type { Argv } from "yargs";
import { MigrateCommand } from "./MigrateCommand.js";
import { TemplatesMigrateCommand } from "./TemplatesMigrateCommand.js";
import { GenerateMarkdownCommand } from "./GenerateMarkdownCommand.js";
import { TemplatesMigrateCommand } from "./TemplatesMigrateCommand.js";

/**
 * Register all migration-related commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with migration commands registered
  return yargs
    .command(MigrateCommand)
    .command(TemplatesMigrateCommand)
    .command(GenerateMarkdownCommand);
    .command(MigrateCommand)
    .command(TemplatesMigrateCommand);
}
