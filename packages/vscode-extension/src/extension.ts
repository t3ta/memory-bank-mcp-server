import * as vscode from 'vscode';
import { MemoryBankProvider } from './providers/memoryBankProvider'; // Import the provider

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Congratulations, your extension "memory-bank-editor" is now active!');

  let provider: MemoryBankProvider | undefined;
  try {
    provider = new MemoryBankProvider();
    console.log('MemoryBankProvider instantiated successfully.');
  } catch (error) {
    console.error('Failed to instantiate MemoryBankProvider:', error);
    // Optionally show an error message to the user
    vscode.window.showErrorMessage(`Failed to initialize Memory Bank Provider: ${error instanceof Error ? error.message : String(error)}`);
    return; // Stop activation if provider fails
  }

  // Example: Register a command to test reading a file
  const testReadCommand = vscode.commands.registerCommand('memoryBank.testRead', async () => {
    if (!provider) {
        vscode.window.showErrorMessage('Memory Bank Provider is not available.');
        return;
    }
    const testFilePath = 'global-memory-bank/core/architecture.json'; // Example file
    try {
      const content = await provider.getDocumentContent(testFilePath);
      console.log(`Read content length: ${content.length}`);
      vscode.window.showInformationMessage(`Successfully read ${testFilePath}! Check console for content length.`);
      // You could also show a portion of the content, but be mindful of length
      // vscode.window.showInformationMessage(`Content snippet: ${content.substring(0, 100)}...`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to read test file ${testFilePath}. See console for details.`);
      console.error(`Error in memoryBank.testRead command:`, error);
    }
  });

  context.subscriptions.push(testReadCommand);

  // Add other command registrations and initialization logic here
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate(): void {
  console.log('Your extension "memory-bank-editor" is now deactivated.');
  // Add cleanup logic here
}
