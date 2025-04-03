import { exec } from 'child_process';
import { promisify } from 'util';
import { IGitService } from './IGitService.js';
import { InfrastructureErrors } from '../../shared/errors/InfrastructureError.js';
import { logger } from '../../shared/utils/logger.js';

const execAsync = promisify(exec);

/**
 * Implementation of IGitService using child_process to execute git commands.
 */
export class GitService implements IGitService {
  private readonly serviceLogger = logger.withContext({ component: 'GitService' });

  /**
   * Gets the current Git branch name by executing `git branch --show-current`.
   * @returns Promise resolving to the current branch name.
   * @throws InfrastructureErrors.gitCommandFailed if the command fails or returns an error.
   */
  async getCurrentBranchName(): Promise<string> {
    try {
      this.serviceLogger.info('Attempting to get current branch name via git command...');
      // コマンドを実行するワーキングディレクトリを指定しないと、
      // VS Codeの拡張機能などから呼ばれた場合に意図しない場所で実行される可能性があるため、
      // プロジェクトルートで実行するように cwd を指定する。
      // process.cwd() はこのMCPサーバープロセスが起動された場所を返すはず。
      const { stdout, stderr } = await execAsync('git branch --show-current', { cwd: process.cwd() });

      if (stderr) {
        this.serviceLogger.error('Git command stderr output while getting branch name', { stderr });
        // stderr に何か出力されても、必ずしもエラーとは限らない場合もあるが、
        // ブランチ名取得の場合はエラーとして扱うのが安全。
        throw InfrastructureErrors.gitCommandFailed('git branch --show-current', stderr);
      }

      const branchName = stdout.trim();
      if (!branchName) {
        this.serviceLogger.warn('Git command stdout was empty after trimming.');
        throw InfrastructureErrors.gitCommandFailed('git branch --show-current', 'Command returned empty output.');
      }

      this.serviceLogger.info(`Successfully retrieved current branch name: ${branchName}`);
      return branchName;
    } catch (error: any) {
      this.serviceLogger.error('Error executing git command to get branch name', { error: error.message, stack: error.stack });
      // execAsync が投げるエラーや、↑で投げたエラーをキャッチ
      throw InfrastructureErrors.gitCommandFailed('git branch --show-current', error.message || 'Unknown error during git command execution', error);
    }
  }
}
