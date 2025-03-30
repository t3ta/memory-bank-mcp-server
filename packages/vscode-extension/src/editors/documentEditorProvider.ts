import * as vscode from 'vscode';
import * as path from 'path';
import MarkdownIt from 'markdown-it';
// Unused type imports removed
// mdMermaid will be imported dynamically later

// Initialize markdown-it instance for the provider
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});
// Mermaid plugin will be applied dynamically later

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

  // Make constructor async to handle dynamic import
  private constructor(private readonly context: vscode.ExtensionContext) {
    this.initializeMarkdownIt(); // Call async initialization
  }

  // Async function to initialize markdown-it with the plugin
  private async initializeMarkdownIt(): Promise<void> {
    try {
      // Dynamically import the mermaid plugin
      const mdMermaid = await import('markdown-it-mermaid');
      // Apply the plugin to the markdown-it instance
      // Need to handle potential default export if it's CJS wrapped in ESM
      md.use(mdMermaid.default || mdMermaid);
      console.log('[Provider] markdown-it-mermaid plugin loaded and applied dynamically.');
    } catch (error) {
      console.error('[Provider] Failed to load or apply markdown-it-mermaid dynamically:', error);
      // Handle the error appropriately, maybe disable mermaid rendering
    }
  }

  /**
   * Called when a custom editor is opened for the given document.
   * Sets up the webview panel.
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    console.log(`[Provider] resolveCustomTextEditor started for: ${document.uri.fsPath}`); // Log start

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);
    console.log(`[Provider] Webview HTML set for: ${document.uri.fsPath}`); // Log HTML set

    // Handle messages from the webview
    webviewPanel.webview.onDidReceiveMessage(e => {
      switch (e.type) {
        case 'update': // Message from the editor.js script
          console.log(`Received update from webview for ${document.uri.fsPath}`);
          // Update the document first
          this._updateTextDocument(document, e.payload);
          // Then trigger preview update based on the new document content
          this.updatePreview(document, webviewPanel);
          return;
        case 'requestPreview': // Webview requests initial preview
          console.log(`[Provider] Received 'requestPreview' from webview for ${document.uri.fsPath}`); // Log message reception
          this.updatePreview(document, webviewPanel);
          return;
        case 'error': // Message for reporting errors (e.g., JSON parse error from webview)
          console.error(`Error message from webview: ${e.payload}`);
          // Log the error, maybe show a status bar message
          return;
      }
    }, null, this.context.subscriptions); // Ensure disposal
    console.log(`[Provider] onDidReceiveMessage listener set for: ${document.uri.fsPath}`); // Log listener set

    // Update webview editor and preview when the document changes outside the editor
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        if (webviewPanel.visible) {
          console.log(`Document changed externally, updating webview editor and preview for ${document.uri.fsPath}`);
          // Update the editor content in the webview
          webviewPanel.webview.postMessage({ type: 'update', text: document.getText() });
          // Update the preview content
          this.updatePreview(document, webviewPanel);
        }
      }
    });
    console.log(`[Provider] onDidChangeTextDocument listener set for: ${document.uri.fsPath}`); // Log listener set

    // Clean up subscription on dispose
    webviewPanel.onDidDispose(() => {
      console.log(`Webview panel disposed for ${document.uri.fsPath}`);
      changeDocumentSubscription.dispose();
    });

    // Initial content push for editor is handled by the HTML itself.
    // Initial preview push is handled by the 'requestPreview' message from the webview.
  }

  /**
   * Generates the HTML content for the editor webview.
   */
  private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
    const nonce = getNonce();
    const documentContent = document.getText() || '{}';

    // Basic styles
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.css'));
    // JavaScript for the editor functionality
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'js', 'editor.js'));

    // Mermaid will be loaded from CDN
    const mermaidCdnUrl = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';

    // Return HTML with external script reference
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}' ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${stylesUri}" rel="stylesheet">
        <title>Memory Bank Editor</title>
        <style>
          /* Basic layout for side-by-side view */
          body { display: flex; height: 100vh; margin: 0; padding: 0; overflow: hidden; }
          .panel { flex: 1; padding: 10px; overflow-y: auto; height: 100%; box-sizing: border-box; }
          #editor-panel { border-right: 1px solid var(--vscode-editorWidget-border, #ccc); }
          #preview-panel { }
          /* Removed invalid meta tag from inside style block */
          .error-message { color: var(--vscode-errorForeground, red); margin-top: 5px; }
          /* Add styles for markdown preview if needed */
          .markdown-body h1, .markdown-body h2 { border-bottom: 1px solid var(--vscode-editorWidget-border, #eee); padding-bottom: 0.3em; }
          .markdown-body code { background-color: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.05)); padding: 0.2em 0.4em; border-radius: 3px; }
          .markdown-body pre > code { padding: 0; }
          .markdown-body pre { background-color: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.05)); padding: 10px; border-radius: 3px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div id="editor-panel" class="panel">
          <h2>Editor</h2>
          <textarea id="editor" class="editor-area" nonce="${nonce}">${escapeHtml(documentContent)}</textarea>
          <div id="error-message" class="error-message"></div>
        </div>
        <div id="preview-panel" class="panel">
           <h2>Preview</h2>
           <div id="preview-content" class="markdown-body"></div>
        </div>

        <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
  // Removed stray closing tag and brace that were here

  /**
   * Converts document content to Markdown and sends the rendered HTML to the webview.
   */
  private updatePreview(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): void {
    console.log(`[Provider] updatePreview called for ${document.uri.fsPath}`); // Log entry
    const jsonString = document.getText();
    let markdown = '';
    let parsedData: any;

    try {
      parsedData = JSON.parse(jsonString);
      // Basic Markdown generation based on parsed content
      markdown = this.generateMarkdownFromData(parsedData);

    } catch (error) {
      // If JSON is invalid, show error in Markdown preview
      markdown = `## JSON Parse Error\n\n\`\`\`error\n${error}\n\`\`\`\n\n### Raw Content:\n\`\`\`json\n${jsonString}\n\`\`\``;
      parsedData = null; // Ensure parsedData is null on error
    }

    const html = md.render(markdown);
    // Log the full HTML content to check if <div class="mermaid"> is generated
    console.log(`[Provider] Generated HTML for preview:\n${html}`);
    webviewPanel.webview.postMessage({ type: 'updatePreview', html: html });
    console.log(`[Provider] Sent 'updatePreview' message to webview.`); // Log message sending
  }

  /**
   * Generates a basic Markdown string from parsed JSON data, focusing on common patterns.
   * TODO: Enhance this based on specific document types and schema v2 structure.
   */
  private generateMarkdownFromData(data: any): string {
    if (!data || typeof data !== 'object') {
      return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
    }

    let mdString = '';

    // Handle metadata display (optional, could be a header)
    if (data.metadata && typeof data.metadata === 'object') {
      mdString += `# ${data.metadata.title || 'Document'}\n\n`;
      mdString += `**ID:** ${data.metadata.id || 'N/A'}  \n`;
      mdString += `**Type:** ${data.metadata.documentType || 'N/A'}  \n`;
      mdString += `**Path:** ${data.metadata.path || 'N/A'}  \n`;
      if (data.metadata.tags && Array.isArray(data.metadata.tags)) {
        mdString += `**Tags:** ${data.metadata.tags.map((tag: string) => `\`${tag}\``).join(', ')}  \n`;
      }
      mdString += `**Version:** ${data.metadata.version || 'N/A'}  \n`;
      mdString += `**Last Modified:** ${data.metadata.lastModified || 'N/A'}  \n`;
      mdString += `**Created At:** ${data.metadata.createdAt || 'N/A'}  \n\n`;
      mdString += '---\n\n'; // Separator
    }

    // Handle content - prioritize 'sections' array if it exists (common pattern)
    if (data.content && typeof data.content === 'object') {
      if (Array.isArray(data.content.sections)) {
        data.content.sections.forEach((section: any) => {
          if (section && typeof section === 'object' && section.title && section.content) {
            mdString += `## ${section.title}\n\n${section.content}\n\n`;
          }
        });
      } else {
        // Fallback: Iterate through content keys for simple display
        mdString += `## Content\n\n`;
        for (const key in data.content) {
          if (Object.prototype.hasOwnProperty.call(data.content, key)) {
            const value = data.content[key];
            mdString += `### ${key}\n\n`;
            if (typeof value === 'string') {
              mdString += `${value}\n\n`;
            } else if (Array.isArray(value)) {
              mdString += value.map(item => `- ${JSON.stringify(item)}`).join('\n') + '\n\n';
            } else if (typeof value === 'object' && value !== null) {
              mdString += '```json\n' + JSON.stringify(value, null, 2) + '\n```\n\n';
            } else {
              mdString += `${String(value)}\n\n`;
            }
          }
        }
      }
    } else {
      // If no content object, just stringify the whole thing
      mdString += '```json\n' + JSON.stringify(data, null, 2) + '\n```';
    }


    return mdString;
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
