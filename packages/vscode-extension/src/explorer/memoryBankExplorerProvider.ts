import * as vscode from 'vscode';
import * as path from 'path';
import { MemoryBankProvider } from '../providers/memoryBankProvider';
import { getCurrentGitBranch } from '../utils/gitUtils'; // Import the git utility

// Define the custom tree item extending vscode.TreeItem
class MemoryBankTreeItem extends vscode.TreeItem {
  // Declare the custom properties explicitly on the class
  public readonly resourceUri?: vscode.Uri;
  public readonly itemType?: 'directory' | 'file' | 'root';

  constructor(
    public readonly label: string, // The display label
    collapsibleState: vscode.TreeItemCollapsibleState, // Whether the item is expandable
    resourceUri?: vscode.Uri, // The URI of the file/folder
    itemType?: 'directory' | 'file' | 'root', // Custom type identifier
    command?: vscode.Command // Command to execute on click (e.g., open file)
  ) {
    // Pass only label and collapsibleState to the super constructor initially
    super(label, collapsibleState);

    // Assign custom properties
    this.resourceUri = resourceUri;
    this.itemType = itemType;
    this.command = command; // Assign command if provided

    // Set properties for display and context based on assigned custom properties
    this.tooltip = `${this.label}`; // Show label as tooltip
    // Show filename as description only for files
    this.description = this.itemType === 'file' && this.resourceUri ? path.basename(this.resourceUri.fsPath) : '';

    // Set icon based on item type using ThemeIcons
    this.iconPath = this.itemType === 'directory'
      ? new vscode.ThemeIcon('folder')
      : this.itemType === 'file'
      ? new vscode.ThemeIcon('json') // Specific icon for JSON files
      : undefined; // No icon for root or unknown types

    // Set context value for contributing context menu items in package.json
    this.contextValue = this.itemType;
  }
}


/**
 * Provides data for the Memory Bank Explorer Tree View.
 * Uses MemoryBankProvider to fetch data.
 */
export class MemoryBankExplorerProvider implements vscode.TreeDataProvider<MemoryBankTreeItem> {

  // Event emitter for tree data changes (needed for refresh)
  private _onDidChangeTreeData: vscode.EventEmitter<MemoryBankTreeItem | undefined | null | void> = new vscode.EventEmitter<MemoryBankTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MemoryBankTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(
      private workspaceRoot: string | undefined,
      private memoryProvider: MemoryBankProvider | undefined // Inject MemoryBankProvider
  ) {
      if (!workspaceRoot) {
          vscode.window.showWarningMessage("Memory Bank Explorer requires an open workspace.");
      }
      if (!memoryProvider) {
          vscode.window.showWarningMessage("Memory Bank Provider is not available for the explorer.");
      }
  }

  /**
   * Refreshes the tree view.
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Gets the tree item representation (visual representation) for the given element.
   * @param element The element for which to get the tree item.
   */
  getTreeItem(element: MemoryBankTreeItem): vscode.TreeItem {
    // Simply return the element itself, as it's already a TreeItem
    return element;
  }

  /**
   * Gets the children of the given element or root if no element is provided.
   * @param element The element for which to get the children.
   * @returns A promise resolving to the children elements.
   */
  async getChildren(element?: MemoryBankTreeItem): Promise<MemoryBankTreeItem[]> {
    // Check for workspaceRoot and memoryProvider early
    if (!this.workspaceRoot || !this.memoryProvider) {
      return [];
    }

    let relativePath = '';

    if (element) {
      // Access itemType directly as it's defined on the class
      switch (element.itemType) {
        case 'root':
          if (element.label === 'Global Memory') {
            relativePath = 'global-memory-bank';
          } else if (element.label.startsWith('Branch Memory')) {
            // Extract branch name from the label (e.g., "Branch Memory (my-branch)")
            const match = element.label.match(/Branch Memory \((.+)\)/);
            const branchName = match ? match[1] : null;
            if (branchName) {
                // Convert branch name for directory path (replace / with -)
                const branchDirName = branchName.replace(/\//g, '-');
                // Construct path using the converted branch name
                relativePath = path.join('branch-memory-bank', branchDirName);
            } else {
                vscode.window.showWarningMessage(`Could not extract branch name from label: ${element.label}`);
                return []; // Prevent listing if branch name extraction fails
            }
          }
          break;
        case 'directory': {
          // Calculate relative path from workspace root and 'docs' folder
          const memoryBankRoot = path.join(this.workspaceRoot, 'docs'); // workspaceRoot is guaranteed non-null here
          if (element.resourceUri) {
            relativePath = path.relative(memoryBankRoot, element.resourceUri.fsPath);
          }
          break;
        }
        case 'file':
        default:
          return []; // Files have no children
      }
    } else {
      // Root level: Show Global and Branch Memory roots
      // Get current branch name dynamically
      const currentBranchName = await getCurrentGitBranch(this.workspaceRoot) ?? 'main'; // Use 'main' as fallback
      // Convert branch name for directory path (replace / with -)
      const branchDirName = currentBranchName.replace(/\//g, '-');
      // Ensure workspaceRoot is non-null before path.join
      const globalRootUri = vscode.Uri.file(path.join(this.workspaceRoot, 'docs', 'global-memory-bank'));
      const branchRootUri = vscode.Uri.file(path.join(this.workspaceRoot, 'docs', 'branch-memory-bank', branchDirName)); // Use converted name
      return [
        // Correct constructor calls with 5 arguments
        new MemoryBankTreeItem('Global Memory', vscode.TreeItemCollapsibleState.Collapsed, globalRootUri, 'root', undefined),
        new MemoryBankTreeItem(`Branch Memory (${currentBranchName})`, vscode.TreeItemCollapsibleState.Collapsed, branchRootUri, 'root', undefined)
      ];
    }

    // List directory content if relativePath is set
    if (typeof relativePath === 'string') {
        // workspaceRoot is guaranteed non-null here
        try {
            const entries = await this.memoryProvider.listDirectory(relativePath);
            // Sort entries: directories first, then files, alphabetically
            entries.sort((a, b) => {
                if (a[1] === vscode.FileType.Directory && b[1] !== vscode.FileType.Directory) return -1;
                if (a[1] !== vscode.FileType.Directory && b[1] === vscode.FileType.Directory) return 1;
                return a[0].localeCompare(b[0]);
            });

            return entries.map(([name, type]) => {
                // workspaceRoot is guaranteed non-null here
                const resourceUri = vscode.Uri.file(path.join(this.workspaceRoot!, 'docs', relativePath, name));
                const collapsibleState = type === vscode.FileType.Directory
                    ? vscode.TreeItemCollapsibleState.Collapsed
                    : vscode.TreeItemCollapsibleState.None;
                const itemType = type === vscode.FileType.Directory ? 'directory' : 'file';
                const command = type === vscode.FileType.File ? {
                    command: 'vscode.open', // Use built-in command to open file
                    title: "Open File",
                    arguments: [resourceUri],
                } : undefined;

                // Correct constructor call with 5 arguments
                return new MemoryBankTreeItem(name, collapsibleState, resourceUri, itemType, command);
            });
        } catch (error) {
            // Handle cases where the branch directory might not exist yet
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                vscode.window.showWarningMessage(`Directory not found for listing children: ${relativePath}`);
                return []; // Return empty if directory doesn't exist
            }
            vscode.window.showErrorMessage(`Failed to list children for ${relativePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            vscode.window.showErrorMessage(`Error listing directory: ${relativePath}`);
            return []; // Return empty on other errors
        }
    }

    return []; // Default return
  }
}
