import { Argv } from 'yargs';
import { CommandBase } from '../../command-base.js';
import createApplication from '../../../main/index.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Command to create a pull request from branch memory bank
 */
export class CreatePullRequestCommand extends CommandBase {
  readonly command = 'create-pull-request <branch> [title]';
  readonly description = 'Create a pull request from branch memory bank';

  /**
   * Configure command arguments and options
   */
  builder(yargs: Argv): Argv {
    return yargs
      .positional('branch', {
        describe: 'Branch name',
        type: 'string',
        demandOption: true,
      })
      .positional('title', {
        describe: 'PR title',
        type: 'string',
      })
      .option('base', {
        type: 'string',
        description:
          'Target branch for the PR (default: develop for feature branches, master for fix branches)',
      })
      .option('language', {
        type: 'string',
        choices: ['en', 'ja'],
        description: 'Language for PR content',
        default: 'ja',
      })
      .option('skip-patterns', {
        type: 'boolean',
        description: 'Skip including systemPatterns in PR (use for memory-intensive repos)',
        default: false,
      })
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
      .example(
        '$0 create-pull-request feature/my-feature "My feature title"',
        'Create a pull request'
      )
      .example(
        '$0 create-pull-request feature/my-feature "My feature title" --base main',
        'Create PR with custom base'
      );
  }

  /**
   * Execute the command
   */
  async handler(argv: any): Promise<void> {
    try {
      const app = await createApplication({
        memoryRoot: argv.docs as string,
        language: argv.language as 'en' | 'ja',
        verbose: argv.verbose,
      });

      // Use the pull request tool
      const pullRequestTool = app.getPullRequestTool();
      const pullRequest = await pullRequestTool.createPullRequest(
        argv.branch as string,
        argv.title as string | undefined,
        argv.base as string | undefined,
        argv.language as string,
        argv.skipPatterns as boolean
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
      this.handleError(error, 'Failed to create pull request');
    }
  }
}
