import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Provides interaction logic with the memory bank file system within the VS Code workspace.
 */
export class MemoryBankProvider {
  private workspaceRoot: string;

  constructor() {
    // Determine the workspace root. Handle potential multi-root workspaces if necessary.
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      // Handle the case where no workspace is open
      // For now, throw an error or log a warning. A more robust solution might be needed.
      vscode.window.showErrorMessage('Memory Bank Editor requires an open workspace.');
      throw new Error('No workspace folder found.');
    }
    // Assuming single root workspace for now
    this.workspaceRoot = workspaceFolders[0].uri.fsPath;
    console.log(`MemoryBankProvider initialized for workspace: ${this.workspaceRoot}`);
  }

  /**
   * Reads the content of a memory bank document.
   * @param relativePath The path relative to the memory bank root (e.g., 'global-memory-bank/core/architecture.json').
   * @returns The content of the document as a string.
   * @throws Error if the file cannot be read.
   */
  public async getDocumentContent(relativePath: string): Promise<string> {
    // Assuming memory bank root is 'docs' within the workspace for now.
    // This should ideally be configurable.
    const memoryBankRoot = path.join(this.workspaceRoot, 'docs');
    const fileUri = vscode.Uri.file(path.join(memoryBankRoot, relativePath));

    try {
      console.log(`Reading file: ${fileUri.fsPath}`);
      const readData = await vscode.workspace.fs.readFile(fileUri);
      const content = Buffer.from(readData).toString('utf8');
      console.log(`Successfully read file: ${relativePath}`);
      return content;
    } catch (error) {
      console.error(`Error reading file ${fileUri.fsPath}:`, error);
      vscode.window.showErrorMessage(`Failed to read memory bank document: ${relativePath}`);
      // Re-throw or handle appropriately
      throw new Error(`Failed to read document: ${relativePath}. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Add methods for writing, listing files, comparing branches etc. later
}
