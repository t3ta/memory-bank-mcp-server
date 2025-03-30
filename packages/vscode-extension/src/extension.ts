import * as vscode from 'vscode';

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Congratulations, your extension "memory-bank-editor" is now active!');

  // Add command registrations and other initialization logic here

  // Example: Register a command
  const disposable = vscode.commands.registerCommand('memoryBank.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from Memory Bank Editor!');
  });

  context.subscriptions.push(disposable);
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate(): void {
  console.log('Your extension "memory-bank-editor" is now deactivated.');
  // Add cleanup logic here
}
