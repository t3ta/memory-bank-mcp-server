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

  /**
   * Writes content to a memory bank document. Creates the file if it doesn't exist.
   * @param relativePath The path relative to the memory bank root.
   * @param content The content to write to the document.
   * @throws Error if the file cannot be written.
   */
  public async updateDocumentContent(relativePath: string, content: string): Promise<void> {
    // Assuming memory bank root is 'docs' within the workspace for now.
    const memoryBankRoot = path.join(this.workspaceRoot, 'docs');
    const fileUri = vscode.Uri.file(path.join(memoryBankRoot, relativePath));

    try {
      console.log(`Writing file: ${fileUri.fsPath}`);
      const writeData = Buffer.from(content, 'utf8');
      await vscode.workspace.fs.writeFile(fileUri, writeData);
      console.log(`Successfully wrote file: ${relativePath}`);
    } catch (error) {
      console.error(`Error writing file ${fileUri.fsPath}:`, error);
      vscode.window.showErrorMessage(`Failed to write memory bank document: ${relativePath}`);
      throw new Error(`Failed to write document: ${relativePath}. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Lists files and directories within a given relative path in the memory bank.
   * @param relativePath The path relative to the memory bank root.
   * @returns A promise resolving to an array of [name, fileType] tuples.
   * @throws Error if the directory cannot be read.
   */
  public async listDirectory(relativePath: string): Promise<[string, vscode.FileType][]> {
    // Assuming memory bank root is 'docs' within the workspace for now.
    const memoryBankRoot = path.join(this.workspaceRoot, 'docs');
    const dirUri = vscode.Uri.file(path.join(memoryBankRoot, relativePath));

    try {
      console.log(`Listing directory: ${dirUri.fsPath}`);
      const entries = await vscode.workspace.fs.readDirectory(dirUri);
      console.log(`Successfully listed directory: ${relativePath}`);
      // Filter out unwanted files like .DS_Store if necessary
      return entries.filter(([name]) => !name.startsWith('.'));
    } catch (error) {
      // If the directory doesn't exist, return an empty array or handle specific errors
      if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
          console.warn(`Directory not found for listing: ${dirUri.fsPath}`);
          return [];
      }
      console.error(`Error listing directory ${dirUri.fsPath}:`, error);
      vscode.window.showErrorMessage(`Failed to list memory bank directory: ${relativePath}`);
      throw new Error(`Failed to list directory: ${relativePath}. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Add methods for comparing branches etc. later
}
