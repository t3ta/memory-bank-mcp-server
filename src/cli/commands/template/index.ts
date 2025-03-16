/**
 * Template Commands Index
 */
import { Argv } from 'yargs';
import { container } from 'tsyringe';
import { MigrateTemplatesCommand } from './MigrateTemplatesCommand.js';
import { ICommand } from '../../interfaces/ICommand.js';

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
    const command = container.resolve<ICommand>(CommandClass);
    yargsInstance = yargsInstance.command(
      command.name,
      command.configure(yargs.command(command.name)).description,
      (args) => command.configure(args),
      async (argv) => {
        try {
          await command.execute(argv);
        } catch (error) {
          console.error(`Error executing command ${command.name}:`, error);
          process.exit(1);
        }
      }
    );
  }

  return yargsInstance;
}

export { MigrateTemplatesCommand };
