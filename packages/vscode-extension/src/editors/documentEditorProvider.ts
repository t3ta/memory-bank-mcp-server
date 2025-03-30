import * as vscode from 'vscode';
import * as path from 'path';
import MarkdownIt from 'markdown-it';
// Removed unused/incorrect internal type imports for markdown-it
import hljs from 'highlight.js'; // Import highlight.js
import { generateMarkdownFromData } from '../markdown/renderers'; // Import the renderer function
// Unused type imports removed
// mdMermaid will be imported dynamically later

// Initialize markdown-it instance for the provider
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str: string, lang: string): string { // Add types to highlight function args
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre><code class="hljs ' + lang + '">' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>';
      } catch (__) {/* ignore */ }
    }
    // Use default escaping if language is not found or highlighting fails
    return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});

// Customize fenced block rendering for Mermaid (Re-adding custom renderer)
const defaultFenceRenderer = md.renderer.rules.fence || function (tokens: any[], idx: number, options: any, env: any, self: any): string { // Add 'any' types
  // Basic fallback renderer if the default is somehow undefined
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : '';
  const langName = info ? ` class="${options.langPrefix}${info}"` : '';
  return `<pre><code${langName}>${escapeHtml(token.content)}</code></pre>\n`;
};

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : '';

  if (info === 'mermaid') {
    // Render as a div with class="mermaid" for Mermaid.js to find
    const mermaidContent = token.content.trim();
    console.log(`[Provider] Rendering Mermaid block via custom renderer. Content:\n${mermaidContent}`);
    // Ensure content is not HTML escaped
    return `<div class="mermaid">${mermaidContent}</div>`;
  }

  // Fallback to default renderer for other languages
  return defaultFenceRenderer(tokens, idx, options, env, self);
};


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

  // Constructor
  private constructor(private readonly context: vscode.ExtensionContext) {
    this.initializeMarkdownIt(); // Call initialization
  }

  // Function to perform any necessary markdown-it initialization.
  // Currently, Mermaid rendering is handled by a custom fence renderer (lines 28-51)
  // and the Mermaid library loaded via CDN in getHtmlForWebview (line 260).
  // Dynamic plugin loading is not used.
  private initializeMarkdownIt(): void {
    console.log('[Provider] Markdown-it initialized. Using custom fence renderer for Mermaid.');
    // No dynamic plugin loading needed here as custom renderer is used.
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

    // Get current theme kind (light/dark/high contrast)
    const themeKind = vscode.window.activeColorTheme.kind;
    let themeClass = 'vscode-light'; // Default to light
    if (themeKind === vscode.ColorThemeKind.Dark) {
      themeClass = 'vscode-dark';
    } else if (themeKind === vscode.ColorThemeKind.HighContrast) {
      themeClass = 'vscode-high-contrast';
    }
    // Or more simply: const themeName = document.body.className; // VS Code adds theme classes to body

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
          /* Basic layout */
          body { display: flex; flex-direction: column; height: 100vh; margin: 0; padding: 0; overflow: hidden; }
          #controls { padding: 5px 10px; border-bottom: 1px solid var(--vscode-editorWidget-border, #ccc); flex-shrink: 0; }
          #controls button { margin-right: 5px; padding: 3px 10px; background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-button-border); border-radius: 3px; cursor: pointer; font-size: 12px; }
          #controls button:hover { background-color: var(--vscode-button-secondaryHoverBackground); }
          #controls button.active { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: var(--vscode-button-background); }
          #main-area { display: flex; flex-grow: 1; overflow: hidden; } /* Container for editor/preview */
          .panel { flex: 1; padding: 10px; overflow-y: auto; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; } /* Ensure panels are flex columns */
          .panel h2 { margin-top: 0; margin-bottom: 8px; flex-shrink: 0; }
          #editor-panel { border-right: 1px solid var(--vscode-editorWidget-border, #ccc); }
          #preview-panel { }
          textarea.editor-area { flex-grow: 1; /* Make textarea fill available space */ width: 100%; border: 1px solid var(--vscode-input-border, #ccc); font-family: var(--vscode-editor-font-family, monospace); resize: none; }

          /* Mode specific styles */
          body.show-editor-only #preview-panel { display: none; }
          body.show-editor-only #editor-panel { border-right: none; }
          body.show-preview-only #editor-panel { display: none; }
          body.show-split #editor-panel, body.show-split #preview-panel { display: flex; flex-direction: column; } /* Ensure panels are visible in split */
          /* Removed invalid meta tag from inside style block */
          .error-message { color: var(--vscode-errorForeground, red); margin-top: 5px; }
          /* Add styles for markdown preview if needed */
          .markdown-body h1, .markdown-body h2 { border-bottom: 1px solid var(--vscode-editorWidget-border, #eee); padding-bottom: 0.3em; }
          .markdown-body code { background-color: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.05)); padding: 0.2em 0.4em; border-radius: 3px; }
          .markdown-body pre > code { padding: 0; }
          .markdown-body pre { background-color: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.05)); padding: 10px; border-radius: 3px; overflow-x: auto; }

          /* Basic Dark Theme Adjustments */
          body.vscode-dark {
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          body.vscode-dark .panel {
             border-color: var(--vscode-editorWidget-border); /* Use theme border color */
          }
          body.vscode-dark h2 {
             border-bottom-color: var(--vscode-editorWidget-border);
          }
          body.vscode-dark textarea.editor-area {
             background-color: var(--vscode-input-background);
             color: var(--vscode-input-foreground);
             border-color: var(--vscode-input-border);
          }
          /* Add more specific dark theme styles as needed */

        </style>
      </head>
      <body class="${themeClass} show-split">
        <div id="controls">
          <button data-mode="editor-only">Editor</button>
          <button data-mode="split" class="active">Split</button>
          <button data-mode="preview-only">Preview</button>
        </div>
        <div id="main-area">
          <div id="editor-panel" class="panel">
            <h2>Editor</h2>
            <textarea id="editor" class="editor-area" nonce="${nonce}">${escapeHtml(documentContent)}</textarea>
            <div id="error-message" class="error-message"></div>
          </div>
          <div id="preview-panel" class="panel">
             <h2>Preview</h2>
             <div id="preview-content" class="markdown-body"></div>
          </div>
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
      // Basic Markdown generation based on parsed content using the imported function
      // Pass the raw jsonString as the second argument for size checking
      markdown = generateMarkdownFromData(parsedData, jsonString);

    } catch (error) {
      // If JSON is invalid, show error in Markdown preview
      // Still pass the raw string to potentially show it in the error message
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
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
