#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { MemoryBankServer } from './MemoryBankServer.js';

async function main() {
  try {
    const argv = await yargs(hideBin(process.argv))
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace root directory'
      })
      .option('memory-root', {
        alias: 'm',
        type: 'string',
        description: 'Memory bank root directory'
      })
      .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Enable verbose logging'
      })
      .option('language', {
        alias: 'l',
        type: 'string',
        choices: ['en', 'ja'],
        default: process.env.MEMORY_BANK_LANGUAGE || 'en',
        description: 'Set language (en|ja)'
      })
      .help()
      .alias('help', 'h')
      .parse();

    // Set environment variable for language if provided via CLI
    if (argv.language) {
      process.env.MEMORY_BANK_LANGUAGE = argv.language;
    }

    const server = new MemoryBankServer({
      workspace: argv.workspace,
      memoryRoot: argv['memory-root'],
      verbose: argv.verbose,
      language: argv.language as 'en' | 'ja'
    });

    await server.start();

    // Handle JSON-RPC requests from stdin
    process.stdin.setEncoding('utf8');

    let data = '';
    process.stdin.on('data', async (chunk) => {
      data += chunk;
      try {
        const request = JSON.parse(data);
        data = '';
        const response = await server.handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        if (error instanceof SyntaxError) {
          // Incomplete JSON, wait for more data
          return;
        }
        // Other errors
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : String(error)
          },
          id: null
        }) + '\n');
        data = '';
      }
    });

  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Update package.json fields for MCP server identification
process.env.npm_package_name = 'memory-bank-mcp-server';
process.env.npm_package_version = '1.0.0';

main().catch(console.error);
