import * as vscode from 'vscode';
import * as path from 'path';
// import * as micromatch from 'micromatch'; // 現在は使用していないのでコメントアウト
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import { generateMarkdownFromData } from '../markdown/renderers';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre><code class="hljs ' + lang + '">' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>';
      } catch {/* ignore */ }
    }
    return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});

const defaultFenceRenderer = md.renderer.rules.fence || function (tokens: any[], idx: number, options: any, env: any, self: any): string {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : '';
  const langName = info ? ` class="${options.langPrefix}${info}"` : '';
  return `<pre><code${langName}>${escapeHtml(token.content)}</code></pre>\n`;
};

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : '';

  if (info === 'mermaid') {
    const mermaidContent = token.content.trim();
    console.log(`[Provider] Rendering Mermaid block via custom renderer. Content:\n${mermaidContent}`);
    return `<div class="mermaid">${mermaidContent}</div>`;
  }

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
      'memoryBank.documentEditor',
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
    return providerRegistration;
  }

  private constructor(private readonly context: vscode.ExtensionContext) {
    this.initializeMarkdownIt();
  }

  /**
   * Initializes markdown-it configuration.
   * Mermaid rendering uses a custom fence renderer and CDN library.
   */
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
    console.log(`[Provider] resolveCustomTextEditor started for: ${document.uri.fsPath}`);

    // カスタムエディタの登録パターンが一致するか特別なチェックは必要ない（VSCodeが既にfilename patternに基づいて選択している）
    // 設定されたパターンはログ出力だけしておく（デバッグ用）
    const config = vscode.workspace.getConfiguration('memory-bank');
    const patterns = config.get<string[]>('documentPathPatterns', []);
    const filePath = document.uri.fsPath;
    console.log(`[Provider Debug] Editor activated for file: ${filePath}`);
    console.log(`[Provider Debug] Configuration patterns (not used for filtering): ${JSON.stringify(patterns)}`);

    // VSCode自体のカスタムエディタセレクタで既にフィルタリングされているため、
    // 追加のパスチェック処理は不要（削除）

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);
    console.log(`[Provider] Webview HTML set for: ${document.uri.fsPath}`);

    webviewPanel.webview.onDidReceiveMessage(e => {
      switch (e.type) {
        case 'update':
          console.log(`Received update from webview for ${document.uri.fsPath}`);
          this._updateTextDocument(document, e.payload);
          this.updatePreview(document, webviewPanel);
          return;
        case 'requestPreview':
          console.log(`[Provider] Received 'requestPreview' from webview for ${document.uri.fsPath}`);
          this.updatePreview(document, webviewPanel);
          return;
        case 'error':
          console.error(`Error message from webview: ${e.payload}`);
          return;
      }
    }, null, this.context.subscriptions);
    console.log(`[Provider] onDidReceiveMessage listener set for: ${document.uri.fsPath}`);

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        if (webviewPanel.visible) {
          console.log(`Document changed externally, updating webview editor and preview for ${document.uri.fsPath}`);
          webviewPanel.webview.postMessage({ type: 'update', text: document.getText() });
          this.updatePreview(document, webviewPanel);
        }
      }
    });
    console.log(`[Provider] onDidChangeTextDocument listener set for: ${document.uri.fsPath}`);

    webviewPanel.onDidDispose(() => {
      console.log(`Webview panel disposed for ${document.uri.fsPath}`);
      changeDocumentSubscription.dispose();
    });

    // Initial content is handled by HTML and 'requestPreview' message.
  }

  /**
   * Generates the HTML content for the editor webview.
   */
  private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
    const nonce = getNonce();
    const documentContent = document.getText() || '{}';

    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'js', 'editor.js'));
    const mermaidCdnUrl = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'; // Mermaid loaded from CDN

    const themeKind = vscode.window.activeColorTheme.kind;
    let themeClass = 'vscode-light';
    if (themeKind === vscode.ColorThemeKind.Dark) {
      themeClass = 'vscode-dark';
    } else if (themeKind === vscode.ColorThemeKind.HighContrast) {
      themeClass = 'vscode-high-contrast';
    }

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}' ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${stylesUri}" rel="stylesheet">
        <title>Memory Bank Editor</title>
        <style>
          body { display: flex; flex-direction: column; height: 100vh; margin: 0; padding: 0; overflow: hidden; }
          #controls { padding: 5px 10px; border-bottom: 1px solid var(--vscode-editorWidget-border, #ccc); flex-shrink: 0; }
          #controls button { margin-right: 5px; padding: 3px 10px; background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-button-border); border-radius: 3px; cursor: pointer; font-size: 12px; }
          #controls button:hover { background-color: var(--vscode-button-secondaryHoverBackground); }
          #controls button.active { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: var(--vscode-button-background); }
          #main-area { display: flex; flex-grow: 1; overflow: hidden; }
          .panel { flex: 1; padding: 10px; overflow-y: auto; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
          .panel h2 { margin-top: 0; margin-bottom: 8px; flex-shrink: 0; }
          #editor-panel { border-right: 1px solid var(--vscode-editorWidget-border, #ccc); }
          #preview-panel { }
          textarea.editor-area { flex-grow: 1; width: 100%; border: 1px solid var(--vscode-input-border, #ccc); font-family: var(--vscode-editor-font-family, monospace); resize: none; }

          body.show-editor-only #preview-panel { display: none; }
          body.show-editor-only #editor-panel { border-right: none; }
          body.show-preview-only #editor-panel { display: none; }
          body.show-split #editor-panel, body.show-split #preview-panel { display: flex; flex-direction: column; }
          .error-message { color: var(--vscode-errorForeground, red); margin-top: 5px; }
          .markdown-body h1, .markdown-body h2 { border-bottom: 1px solid var(--vscode-editorWidget-border, #eee); padding-bottom: 0.3em; }
          .markdown-body code { background-color: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.05)); padding: 0.2em 0.4em; border-radius: 3px; }
          .markdown-body pre > code { padding: 0; }
          .markdown-body pre { background-color: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.05)); padding: 10px; border-radius: 3px; overflow-x: auto; }

          body.vscode-dark {
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          body.vscode-dark .panel {
             border-color: var(--vscode-editorWidget-border);
          }
          body.vscode-dark h2 {
             border-bottom-color: var(--vscode-editorWidget-border);
          }
          body.vscode-dark textarea.editor-area {
             background-color: var(--vscode-input-background);
             color: var(--vscode-input-foreground);
             border-color: var(--vscode-input-border);
          }

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
    console.log(`[Provider] updatePreview called for ${document.uri.fsPath}`);
    const jsonString = document.getText();
    let markdown = '';
    let parsedData: any;

    try {
      parsedData = JSON.parse(jsonString);
      markdown = generateMarkdownFromData(parsedData, jsonString);

    } catch (error: unknown) { // ★ エラーハンドリング修正
      console.error(`[Provider] Error parsing JSON for ${document.uri.fsPath}:`, error);
      // エラー情報をWebviewに送信
      const errorMessage = error instanceof Error ? error.message : String(error);
      webviewPanel.webview.postMessage({
        type: 'error',
        message: `JSON Parse Error: ${errorMessage}`,
        details: error instanceof Error ? error.stack : undefined
      });
      // プレビューは更新しないか、エラー表示用のHTMLを送る
      // 今回はエラーメッセージをエディタ下部に表示するので、プレビューは空にする
       webviewPanel.webview.postMessage({ type: 'updatePreview', html: '<p>Error parsing JSON. See details below the editor.</p>' });
       console.log(`[Provider] Sent 'error' message to webview due to JSON parse error.`);
      return; // エラーがあった場合はここで処理を終了
    }

    // ★ JSONパース成功時のみプレビューを更新
    if (parsedData) {
        const html = md.render(markdown);
        console.log(`[Provider] Generated HTML for preview.`); // HTML内容はログに出さない方が良いかも
        webviewPanel.webview.postMessage({ type: 'updatePreview', html: html });
        console.log(`[Provider] Sent 'updatePreview' message to webview.`);
        // エラーが解消されたらエラーメッセージをクリアするメッセージも送る
        webviewPanel.webview.postMessage({ type: 'clearError' });
    }
  }

  /**
   * Updates the underlying VS Code TextDocument with new content.
   * @param document The document to update.
   * @param jsonString The new content as a string.
   */
  private _updateTextDocument(document: vscode.TextDocument, jsonString: string): void {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      jsonString
    );
    vscode.workspace.applyEdit(edit).then(success => {
      if (!success) {
        console.error(`Failed to apply edit to ${document.uri.fsPath}`);
        vscode.window.showErrorMessage(`Failed to save changes to ${path.basename(document.uri.fsPath)}.`);
      } else {
        console.log(`Successfully applied edit to ${document.uri.fsPath}`);
      }
    }, failureReason => {
      console.error(`Error applying edit to ${document.uri.fsPath}:`, failureReason);
      vscode.window.showErrorMessage(`Error saving changes to ${path.basename(document.uri.fsPath)}.`);
    });
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
