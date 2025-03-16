/**
 * Template Commands Index
 */
import { Argv } from 'yargs';
import { container } from 'tsyringe';
// CommandBase is not needed here
import { MigrateTemplatesCommand } from './MigrateTemplatesCommand.js';

export const templateCommands = [
  MigrateTemplatesCommand
];

/**
 * Register template commands with yargs
 * @param yargs Yargs instance
 * @returns Configured yargs instance with template commands registered
 */
export function registerTemplateCommands(yargs: Argv): Argv {
  let yargsInstance = yargs;

  // Register each template command
  for (const CommandClass of templateCommands) {
    const command = container.resolve<MigrateTemplatesCommand>(CommandClass);
    yargsInstance = yargsInstance.command({
      command: command.name,
      describe: 'Migrate Markdown templates to JSON format',
      builder: (args: Argv) => command.configure(args) as Argv,
      handler: async (argv: any) => {
        try {
          await command.execute(argv);
        } catch (error) {
          console.error(`Error executing command ${command.name}:`, error);
          process.exit(1);
        }
      }
    });
  }

  return yargsInstance;
}

export { MigrateTemplatesCommand };
