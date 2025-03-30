import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Provider for the Memory Bank Document custom editor.
 * Manages the webview for editing memory bank JSON documents.
 */
export class DocumentEditorProvider implements vscode.CustomTextEditorProvider {

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new DocumentEditorProvider(context);
    // Register the provider for the viewType defined in package.json
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      'memoryBank.documentEditor', // Must match the viewType in package.json
      provider,
      {
        // Optionally enable webview persistence
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    );
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Called when a custom editor is opened for the given document.
   * Sets up the webview panel.
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    console.log(`Resolving custom editor for: ${document.uri.fsPath}`);

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true, // Enable JavaScript in the webview
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')] // Restrict webview access
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

    // TODO: Add message handling to sync document changes between webview and VS Code
    // Example:
    // webviewPanel.webview.onDidReceiveMessage(e => {
    //   switch (e.type) {
    //     case 'update':
    //       this.updateTextDocument(document, e.payload);
    //       return;
    //   }
    // });

    // TODO: Add logic to update webview when the document changes outside the editor
    // const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
    //   if (e.document.uri.toString() === document.uri.toString()) {
    //     webviewPanel.webview.postMessage({ type: 'update', text: document.getText() });
    //   }
    // });

    // // Clean up subscription on dispose
    // webviewPanel.onDidDispose(() => {
    //   changeDocumentSubscription.dispose();
    // });
  }

  /**
   * Generates the HTML content for the editor webview.
   */
  private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
    // Use a nonce to only allow specific scripts to run
    const nonce = getNonce();

    // Get document content
    const documentContent = document.getText() || '{}'; // Default to empty object if file is empty

    // TODO: In the future, load React app or more sophisticated UI here
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <!-- Use a content security policy to only allow loading images from https or from our extension directory, and only allow scripts that have a specific nonce -->
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Memory Bank Editor</title>
        <style>
          body { font-family: sans-serif; padding: 1em; }
          textarea { width: 95%; height: 80vh; font-family: monospace; }
        </style>
      </head>
      <body>
        <h1>Memory Bank Document Editor</h1>
        <p>Editing: ${document.uri.fsPath}</p>
        <textarea id="editor" nonce="${nonce}">${escapeHtml(documentContent)}</textarea>
        <button id="save-button" nonce="${nonce}">Save (Not Implemented)</button>

        <!-- Basic script for demonstration -->
        <script nonce="${nonce}">
          // Basic example - real implementation would use message passing
          // const vscode = acquireVsCodeApi();
          // const editor = document.getElementById('editor');
          // editor.addEventListener('input', (e) => {
          //   // Send update message to extension host (needs implementation)
          //   // vscode.postMessage({ type: 'update', payload: e.target.value });
          // });
          console.log("Webview script loaded.");
        </script>
      </body>
      </html>`;
  }

  // TODO: Implement method to update the actual TextDocument when webview sends changes
  // private updateTextDocument(document: vscode.TextDocument, text: string) { ... }
}

// Utility function to generate a nonce
function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Utility function to escape HTML characters in text content
function escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;") // Correctly replace less than
         .replace(/>/g, "&gt;") // Correctly replace greater than
         .replace(/"/g, "&quot;") // Correctly replace double quote
         .replace(/'/g, "&#039;"); // Keep single quote replacement
 }
