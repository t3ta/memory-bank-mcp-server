#!/usr/bin/env node

/**
 * Memory Bank CLI
 * Command line interface for Memory Bank operations
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import createApplication from '../main/index.js';
import { logger } from '../shared/utils/logger.js';
import { MCPResponse } from '../interface/presenters/types/index.js';

// Define CLI commands
const argv = yargs(hideBin(process.argv))
  .scriptName('memory-bank')
  .usage('Usage: $0 <command> [options]')
  .option('docs', {
    alias: 'd',
    type: 'string',
    description: 'Path to docs directory',
    default: './docs'
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
    default: false
  })
  .option('language', {
    alias: 'l',
    type: 'string',
    description: 'Language for templates (en or ja)',
    choices: ['en', 'ja'],
    default: 'en'
  })
  // Read commands
  .command('read-global <path>', 'Read a document from the global memory bank', (yargs) => {
    return yargs.positional('path', {
      describe: 'Document path',
      type: 'string',
      demandOption: true
    });
  }, async (argv) => {
    try {
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose
      });

      const result = await app.getGlobalController().readDocument(argv.path as string);
      // Type guard to safely access success/error properties
      if (!result.success) {
        logger.error(`Error reading document: ${result.error.message}`);
        process.exit(1);
      }

      // Output document content
      console.log(result.data.content || '');
    } catch (error) {
      logger.error('Failed to read document:', error);
      process.exit(1);
    }
  })
  .command('write-global <path> [content]', 'Write a document to the global memory bank', (yargs) => {
    return yargs
      .positional('path', {
        describe: 'Document path',
        type: 'string',
        demandOption: true
      })
      .positional('content', {
        describe: 'Document content (omit to read from stdin)',
        type: 'string'
      })
      .option('file', {
        alias: 'f',
        type: 'string',
        description: 'Read content from file'
      });
  }, async (argv) => {
    try {
      let content = argv.content as string;

      // If content not provided directly, try to read it
      if (!content) {
        if (argv.file) {
          // Read from file
          const fs = await import('fs/promises');
          content = await fs.readFile(argv.file, 'utf-8');
        } else {
          // Read from stdin
          content = await new Promise((resolve) => {
            let data = '';
            process.stdin.on('data', (chunk) => {
              data += chunk;
            });
            process.stdin.on('end', () => {
              resolve(data);
            });
          });
        }
      }

      // Initialize application
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose
      });

      // Write document
      const result = await app.getGlobalController().writeDocument(argv.path as string, content);
      // Type guard to safely access success/error properties
      if (!result.success) {
        logger.error(`Error writing document: ${result.error.message}`);
        process.exit(1);
      }

      logger.info(`Document ${argv.path} written successfully`);
    } catch (error) {
      logger.error('Failed to write document:', error);
      process.exit(1);
    }
  })
  // Branch commands
  .command('read-branch <branch> <path>', 'Read a document from a branch memory bank', (yargs) => {
    return yargs
      .positional('branch', {
        describe: 'Branch name',
        type: 'string',
        demandOption: true
      })
      .positional('path', {
        describe: 'Document path',
        type: 'string',
        demandOption: true
      });
  }, async (argv) => {
    try {
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose
      });

      const result = await app.getBranchController().readDocument(
        argv.branch as string,
        argv.path as string
      );
      
      // Type guard to safely access success/error properties
      if (!result.success) {
        logger.error(`Error reading document: ${result.error.message}`);
        process.exit(1);
      }

      // Output document content
      console.log(result.data.content || '');
    } catch (error) {
      logger.error('Failed to read document:', error);
      process.exit(1);
    }
  })
  .command('write-branch <branch> <path> [content]', 'Write a document to a branch memory bank', (yargs) => {
    return yargs
      .positional('branch', {
        describe: 'Branch name',
        type: 'string',
        demandOption: true
      })
      .positional('path', {
        describe: 'Document path',
        type: 'string',
        demandOption: true
      })
      .positional('content', {
        describe: 'Document content (omit to read from stdin)',
        type: 'string'
      })
      .option('file', {
        alias: 'f',
        type: 'string',
        description: 'Read content from file'
      });
  }, async (argv) => {
    try {
      let content = argv.content as string;

      // If content not provided directly, try to read it
      if (!content) {
        if (argv.file) {
          // Read from file
          const fs = await import('fs/promises');
          content = await fs.readFile(argv.file, 'utf-8');
        } else {
          // Read from stdin
          content = await new Promise((resolve) => {
            let data = '';
            process.stdin.on('data', (chunk) => {
              data += chunk;
            });
            process.stdin.on('end', () => {
              resolve(data);
            });
          });
        }
      }

      // Initialize application
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose
      });

      // Write document
      const result = await app.getBranchController().writeDocument(
        argv.branch as string,
        argv.path as string, 
        content
      );
      
      // Type guard to safely access success/error properties
      if (!result.success) {
        logger.error(`Error writing document: ${result.error.message}`);
        process.exit(1);
      }

      logger.info(`Document ${argv.path} written successfully to branch ${argv.branch}`);
    } catch (error) {
      logger.error('Failed to write document:', error);
      process.exit(1);
    }
  })
  // Core files commands
  .command('read-core-files <branch>', 'Read all core files from a branch memory bank', (yargs) => {
    return yargs
      .positional('branch', {
        describe: 'Branch name',
        type: 'string',
        demandOption: true
      })
      .option('format', {
        type: 'string',
        description: 'Output format',
        choices: ['json', 'pretty'],
        default: 'pretty'
      });
  }, async (argv) => {
    try {
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose
      });

      const result = await app.getBranchController().readCoreFiles(argv.branch as string);
      
      // Type guard to safely access success/error properties
      if (!result.success) {
        logger.error(`Error reading core files: ${result.error.message}`);
        process.exit(1);
      }

      // Output core files
      if (argv.format === 'json') {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        // Pretty print each file
        console.log('\n=== BRANCH CORE FILES ===\n');
        for (const [path, file] of Object.entries(result.data)) {
          console.log(`\n===== ${path} =====\n`);
          console.log(file.content);
          console.log('\n');
        }
      }
    } catch (error) {
      logger.error('Failed to read core files:', error);
      process.exit(1);
    }
  })
  // Utility commands
  .command('create-pull-request <branch>', 'Create a pull request from branch memory bank', (yargs) => {
    return yargs
      .positional('branch', {
        describe: 'Branch name',
        type: 'string',
        demandOption: true
      })
      .option('title', {
        type: 'string',
        description: 'Custom PR title (optional)'
      })
      .option('base', {
        type: 'string',
        description: 'Target branch for the PR (default: develop for feature branches, master for fix branches)'
      })
      .option('language', {
        type: 'string',
        choices: ['en', 'ja'],
        description: 'Language for PR content',
        default: 'ja'
      });
  }, async (argv) => {
    try {
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose
      });

      // Use the pull request tool
      const pullRequestTool = app.getPullRequestTool();
      const pullRequest = await pullRequestTool.createPullRequest(
        argv.branch as string,
        argv.title as string | undefined,
        argv.base as string | undefined,
        argv.language as string
      );

      // Set up response message based on language
      const isJapanese = argv.language !== 'en';
      let responseMessage = isJapanese 
        ? `pullRequest.md ファイルを作成しました。\n\n` 
        : `pullRequest.md file has been created.\n\n`;

      if (isJapanese) {
        responseMessage += `このファイルをコミットしてプッシュすると、GitHub Actionsによって自動的にPull Requestが作成されます。\n\n`;
        responseMessage += `以下のコマンドを実行してください:\n`;
        responseMessage += `git add ${pullRequest.filePath}\n`;
        responseMessage += `git commit -m "chore: PR作成準備"\n`;
        responseMessage += `git push\n\n`;
        responseMessage += `PR情報:\n`;
        responseMessage += `タイトル: ${pullRequest.title}\n`;
        responseMessage += `ターゲットブランチ: ${pullRequest.baseBranch}\n`;
        responseMessage += `ラベル: ${pullRequest.labels.join(', ')}\n`;
      } else {
        responseMessage += `Commit and push this file to automatically create a Pull Request via GitHub Actions.\n\n`;
        responseMessage += `Run the following commands:\n`;
        responseMessage += `git add ${pullRequest.filePath}\n`;
        responseMessage += `git commit -m "chore: prepare PR"\n`;
        responseMessage += `git push\n\n`;
        responseMessage += `PR Information:\n`;
        responseMessage += `Title: ${pullRequest.title}\n`;
        responseMessage += `Target branch: ${pullRequest.baseBranch}\n`;
        responseMessage += `Labels: ${pullRequest.labels.join(', ')}\n`;
      }

      console.log(responseMessage);
    } catch (error) {
      logger.error('Failed to create pull request:', error);
      process.exit(1);
    }
  })
  .command('recent-branches [limit]', 'Get recent branches', (yargs) => {
    return yargs
      .positional('limit', {
        describe: 'Maximum number of branches to return',
        type: 'number',
        default: 10
      });
  }, async (argv) => {
    try {
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose
      });

      const result = await app.getBranchController().getRecentBranches(argv.limit as number);
      
      // Type guard to safely access success/error properties
      if (!result.success) {
        logger.error(`Error getting recent branches: ${result.error.message}`);
        process.exit(1);
      }

      // Output in a pretty format
      console.log('\n=== RECENT BRANCHES ===\n');
      result.data.forEach((branch: { name: string; lastModified: string | number | Date; summary?: { currentWork?: string } }, index: number) => {
        console.log(`${index + 1}. ${branch.name}`);
        console.log(`   Last modified: ${new Date(branch.lastModified).toLocaleString()}`);
        if (branch.summary?.currentWork) {
          console.log(`   Current work: ${branch.summary.currentWork}`);
        }
        console.log();
      });
    } catch (error) {
      logger.error('Failed to get recent branches:', error);
      process.exit(1);
    }
  })
  // Help and examples
  .example('$0 read-global architecture.md', 'Read architecture document from global memory bank')
  .example('$0 write-global tech-stack.md -f ./tech-stack.md', 'Write tech stack document from file')
  .example('$0 read-branch feature/login activeContext.md', 'Read active context from branch')
  .example('$0 create-pull-request feature/my-feature', 'Create a pull request from branch')
  .example('$0 create-pull-request feature/my-feature --title "My awesome feature" --base main', 'Create PR with custom title and base')
  .example('$0 recent-branches', 'Show recent branches')
  .demandCommand(1, 'You need to specify a command')
  .help()
  .alias('help', 'h')
  .wrap(null)
  .epilog('For more information visit https://github.com/yourusername/memory-bank-mcp-server')
  .parse();

// Main function not needed as all logic is in command handlers
