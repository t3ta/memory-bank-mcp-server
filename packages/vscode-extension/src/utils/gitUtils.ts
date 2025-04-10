import * as cp from 'child_process';
import * as _vscode from 'vscode';

/**
 * Gets the current Git branch name for the given workspace folder.
 * Executes the `git rev-parse --abbrev-ref HEAD` command.
 * @param workspaceFolderPath The path to the workspace folder.
 * @returns A promise resolving to the current branch name, or null if not in a git repo or an error occurs.
 */
export async function getCurrentGitBranch(workspaceFolderPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    // Execute git command in the workspace root
    cp.exec('git rev-parse --abbrev-ref HEAD', { cwd: workspaceFolderPath }, (err, stdout, _stderr) => {
      if (err) {
        // エラーをUIに表示するほどではないが、console.warnの代わりに
        // vscode.window.showWarningMessage('Could not determine current Git branch.'); 
        // のようにUIに表示することも可能
        // Don't show error message to user unless necessary, just log warning
        // vscode.window.showWarningMessage('Could not determine current Git branch.');
        resolve(null); // Resolve with null if not a git repo or error
        return;
      }
      const branchName = stdout.trim();
      // デバッグ用のログなのでコメントアウト
      resolve(branchName);
    });
  });
}
