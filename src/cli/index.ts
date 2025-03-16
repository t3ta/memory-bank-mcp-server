#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Memory Bank CLI
 * Command line interface for Memory Bank operations
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { registerAllCommands } from './commands/index.js';
import { logger } from '../shared/utils/logger.js';

// Setup the CLI with common configuration
const cli = yargs(hideBin(process.argv))
  .scriptName('memory-bank')
  .usage('Usage: $0 <command> [options]')
  .option('docs', {
    alias: 'd',
    type: 'string',
    description: 'Path to docs directory',
    default: './docs',
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
    default: false,
  })
  .option('language', {
    alias: 'l',
    type: 'string',
    description: 'Language for templates (en or ja)',
    choices: ['en', 'ja'],
    default: 'en',
  });

// Register all commands using the new command structure
registerAllCommands(cli);

// Configure examples, help, and other global settings
cli
  .example('$0 read-global architecture.md', 'Read architecture document from global memory bank')
  .example(
    '$0 write-global tech-stack.md -f ./tech-stack.md',
    'Write tech stack document from file'
  )
  .example('$0 read-branch feature/login activeContext.md', 'Read active context from branch')
  .example(
    '$0 create-pull-request feature/my-feature "My feature title"',
    'Create a pull request from branch'
  )
  .example('$0 recent-branches', 'Show recent branches')
  .example('$0 json create myfile.json -t "My Document"', 'Create a JSON document')
  .example('$0 json read myfile.json -b feature/my-feature', 'Read a JSON document from a branch')
  .demandCommand(1, 'You need to specify a command')
  .help()
  .alias('help', 'h')
  .wrap(null)
  .epilog('For more information visit https://github.com/yourusername/memory-bank-mcp-server')
  .parse();

// If we get here, the command has been executed
logger.debug('Command execution completed');
