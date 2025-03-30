import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Provider for the Memory Bank Document custom editor.
 * Manages the webview for editing memory bank JSON documents.
 */
export class DocumentEditorProvider implements vscode.CustomTextEditorProvider {

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new DocumentEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      'memoryBank.documentEditor', // Must match the viewType in package.json
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        // Indicate that this editor supports undo/redo
        supportsMultipleEditorsPerDocument: false,
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
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

    let isWebViewReady = false; // Flag to track if webview is ready
    let pendingExternalUpdate: string | null = null; // Store external updates if webview isn't ready

    // Handle messages from the webview (React App)
    webviewPanel.webview.onDidReceiveMessage(e => {
      switch (e.type) {
        case 'ready': // Webview signals it's ready to receive content
          console.log(`Webview ready for ${document.uri.fsPath}`);
          isWebViewReady = true;
          // Send initial content or any pending external update
          const initialContent = pendingExternalUpdate ?? document.getText();
          webviewPanel.webview.postMessage({ type: 'updateContent', text: initialContent });
          pendingExternalUpdate = null; // Clear pending update
          return;
        case 'update': // Webview sends updated content
          console.log(`Received update from webview for ${document.uri.fsPath}`);
          // Prevent updates if the content hasn't actually changed
          if (document.getText() !== e.text) {
            this._updateTextDocument(document, e.text);
          }
          return;
        case 'error': // Webview reports an error
            console.error(`Error message from webview: ${e.message}`);
            vscode.window.showErrorMessage(`Webview error: ${e.message}`);
            return;
        // Add other message types as needed (e.g., for theme changes)
      }
    }, null, this.context.subscriptions); // Ensure disposal

    // Update webview when the document changes outside the editor
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        // Check if the webview panel is still valid and ready
        if (webviewPanel.visible) {
          const newText = document.getText();
          if (isWebViewReady) {
            console.log(`Document changed externally, updating webview for ${document.uri.fsPath}`);
            webviewPanel.webview.postMessage({ type: 'updateContent', text: newText });
          } else {
            console.log(`Document changed externally, but webview not ready. Storing update for ${document.uri.fsPath}`);
            pendingExternalUpdate = newText; // Store the update if webview isn't ready yet
          }
        }
      }
    });

    // Clean up subscription on dispose
    webviewPanel.onDidDispose(() => {
      console.log(`Webview panel disposed for ${document.uri.fsPath}`);
      changeDocumentSubscription.dispose();
    });

    // Note: Initial content push is now handled by the 'ready' message from the webview
  }

  /**
   * Generates the HTML content for the editor webview.
   */
  private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
    const nonce = getNonce();

    // Get URIs for required resources
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webviews', 'editor.js'));
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.css')); // Keep existing CSS or add new one for React app

    // IMPORTANT: You need a build process (e.g., webpack, esbuild) to bundle
    // your React app (src/webviews/editor/index.tsx) into dist/webviews/editor.js

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          style-src ${webview.cspSource} 'unsafe-inline';
          font-src ${webview.cspSource};
          img-src ${webview.cspSource} https: data:;
          script-src 'nonce-${nonce}';
        ">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${stylesUri}" rel="stylesheet">
        <title>Memory Bank Editor</title>
      </head>
      <body>
        <div id="root"></div> <!-- React app mounts here -->

        <script nonce="${nonce}">
          // Pass VS Code API to the webview
          const vscode = acquireVsCodeApi();
          // Pass initial state or other config if needed (optional)
          // const initialState = ${JSON.stringify({ content: document.getText() })};
          // window.initialState = initialState;
        </script>
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  /**
   * Updates the underlying VS Code TextDocument with new content.
   * @param document The document to update.
   * @param jsonString The new content as a string.
   */
  private _updateTextDocument(document: vscode.TextDocument, jsonString: string): void {
    const edit = new vscode.WorkspaceEdit();
    // Replace the entire document content
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0), // Select entire document range
      jsonString
    );
    vscode.workspace.applyEdit(edit).then(success => {
        if (!success) {
            console.error(`Failed to apply edit to ${document.uri.fsPath}`);
            vscode.window.showErrorMessage(`Failed to save changes to ${path.basename(document.uri.fsPath)}.`);
        } else {
            // Optionally trigger save after applying edit, though VS Code's autosave might handle it
            // document.save();
            console.log(`Successfully applied edit to ${document.uri.fsPath}`);
        }
    }, failureReason => {
         console.error(`Error applying edit to ${document.uri.fsPath}:`, failureReason);
         vscode.window.showErrorMessage(`Error saving changes to ${path.basename(document.uri.fsPath)}.`);
    });
  }
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
