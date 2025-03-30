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

// Customize fenced block rendering for Mermaid (Re-adding custom renderer)
const defaultFenceRenderer = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
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

  // Make constructor async to handle dynamic import
  private constructor(private readonly context: vscode.ExtensionContext) {
    this.initializeMarkdownIt(); // Call async initialization
  }

  // Async function to initialize markdown-it with the plugin
  private async initializeMarkdownIt(): Promise<void> {
    try {
      // Dynamically import the mermaid plugin
      const mdMermaid = await import('markdown-it-mermaid');
      // Apply the plugin to the markdown-it instance - REMOVED for custom renderer approach
      // md.use(mdMermaid.default || mdMermaid);
      // console.log('[Provider] markdown-it-mermaid plugin loaded and applied dynamically.');
      console.log('[Provider] Skipping dynamic mermaid plugin loading, using custom fence renderer.');
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
      <body class="${themeClass}">
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
   * Generates a Markdown string from parsed JSON data based on its document type.
   */
  private generateMarkdownFromData(data: any): string {
    if (!data || typeof data !== 'object') {
      return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
    }

    let mdString = '';
    const metadata = data.metadata || {};
    const content = data.content || {};
    const documentType = metadata.documentType || 'generic'; // Default to generic

    // --- Render Metadata ---
    mdString += `# ${metadata.title || 'Document'}\n\n`;
    mdString += `**ID:** ${metadata.id || 'N/A'}  \n`;
    mdString += `**Type:** \`${documentType}\`  \n`; // Display type prominently
    mdString += `**Path:** ${metadata.path || 'N/A'}  \n`;
    if (metadata.tags && Array.isArray(metadata.tags)) {
      mdString += `**Tags:** ${metadata.tags.map((tag: string) => `\`${tag}\``).join(', ')}  \n`;
    }
    mdString += `**Version:** ${metadata.version || 'N/A'}  \n`;
    mdString += `**Last Modified:** ${metadata.lastModified || 'N/A'}  \n`;
    mdString += `**Created At:** ${metadata.createdAt || 'N/A'}  \n\n`;
    mdString += '---\n\n';

    // --- Render Content based on Type ---
    mdString += `## Content\n\n`;

    switch (documentType) {
      case 'progress':
        mdString += this.renderProgressContent(content);
        break;
      case 'active_context':
        mdString += this.renderActiveContextContent(content);
        break;
      case 'branch_context':
        mdString += this.renderBranchContextContent(content);
        break;
      case 'system_patterns':
         mdString += this.renderSystemPatternsContent(content);
         break;
      // Add cases for other specific document types here
      case 'generic':
      case 'core': // Treat 'core' like 'generic' for now
      default:
        // Use the existing generic rendering logic for 'generic' or unknown types
        mdString += this.renderGenericContent(content);
        break;
    }

    return mdString;
  }

  // --- Type-Specific Rendering Functions (Stubs for now) ---

  private renderGenericContent(content: any): string {
     let mdString = '';
     if (content && typeof content === 'object') {
         if (Array.isArray(content.sections)) {
             content.sections.forEach((section: any) => {
                 if (section && typeof section === 'object' && section.title && section.content) {
                     mdString += `### ${section.title}\n\n${section.content}\n\n`; // Use H3 for sections within content
                 }
             });
         } else {
             // Fallback: Iterate through content keys
             for (const key in content) {
                 if (Object.prototype.hasOwnProperty.call(content, key)) {
                     const value = content[key];
                     mdString += `### ${key}\n\n`;
                     if (typeof value === 'string') {
                         // Render multiline strings correctly
                         mdString += value.replace(/\n/g, '  \n') + '\n\n'; // Add double space for line breaks
                     } else if (Array.isArray(value)) {
                         // Render arrays as lists or JSON blocks
                         if (value.every(item => typeof item === 'string' || typeof item === 'number')) {
                             mdString += value.map(item => `- ${item}`).join('\n') + '\n\n';
                         } else {
                             mdString += value.map(item => `- \`${JSON.stringify(item)}\``).join('\n') + '\n\n';
                         }
                     } else if (typeof value === 'object' && value !== null) {
                         mdString += '```json\n' + JSON.stringify(value, null, 2) + '\n```\n\n';
                     } else {
                         mdString += `${String(value)}\n\n`;
                     }
                 }
             }
         }
     }
      if (!mdString) { // Handle empty content object
          mdString = '_(No specific content found or content is not an object)_';
      }
     return mdString;
  }

  private renderProgressContent(content: any): string {
    console.log("[Provider] Rendering 'progress' type");
    let mdString = '';

    if (!content || typeof content !== 'object') {
        return '_(Invalid or empty progress content)_';
    }

    if (content.status) {
      mdString += `**Status:** ${content.status}\n\n`;
    }
    if (content.completionPercentage !== undefined && typeof content.completionPercentage === 'number') {
      // Basic progress bar simulation
      const percentage = Math.max(0, Math.min(100, content.completionPercentage));
      const filledCount = Math.round(percentage / 10);
      const emptyCount = 10 - filledCount;
      mdString += `**Completion:** \`[${'#'.repeat(filledCount)}${'-'.repeat(emptyCount)}]\` ${percentage}%\n\n`;
    }

    if (Array.isArray(content.workingFeatures) && content.workingFeatures.length > 0) {
      mdString += `### Working Features\n`;
      mdString += content.workingFeatures.map((feature: any) => {
          const status = feature.status || 'in-progress';
          const check = status === 'completed' ? '[x]' : '[ ]';
          return `- ${check} ${feature.description || feature.id || 'N/A'} _(${status})_`;
      }).join('\n') + '\n\n';
    }

    if (Array.isArray(content.pendingImplementation) && content.pendingImplementation.length > 0) {
      mdString += `### Pending Implementation\n`;
      // Group by priority if available
      const grouped: { [key: string]: any[] } = {};
      content.pendingImplementation.forEach((item: any) => {
          const priority = item.priority || 'medium';
          if (!grouped[priority]) grouped[priority] = [];
          grouped[priority].push(item);
      });

      ['high', 'medium', 'low'].forEach(priority => {
          if (grouped[priority] && grouped[priority].length > 0) {
              mdString += `**Priority: ${priority.toUpperCase()}**\n`;
              mdString += grouped[priority].map((item: any) => `- ${item.description || item.id || 'N/A'}`).join('\n') + '\n';
          }
      });
       mdString += '\n';
    }

     if (Array.isArray(content.knownIssues) && content.knownIssues.length > 0) {
      mdString += `### Known Issues\n`;
      mdString += content.knownIssues.map((issue: any) => {
          let issueStr = `- **${issue.id || 'Issue'}:** ${issue.description || 'No description'} _(Status: ${issue.status || 'open'})_`;
          if (issue.solution) {
              issueStr += `\n  - **Solution:** ${issue.solution}`;
          }
          return issueStr;
      }).join('\n\n') + '\n\n';
    }

    // Add any other top-level keys from content using generic rendering as fallback
    const handledKeys = ['status', 'completionPercentage', 'workingFeatures', 'pendingImplementation', 'knownIssues'];
    const remainingContent: any = {};
    for (const key in content) {
        if (Object.prototype.hasOwnProperty.call(content, key) && !handledKeys.includes(key)) {
            remainingContent[key] = content[key];
        }
    }
    if (Object.keys(remainingContent).length > 0) {
         mdString += `### Other Information\n\n`;
         mdString += this.renderGenericContent(remainingContent); // Use generic renderer for the rest
    }

    return mdString || '_(Progress content seems empty)_';
  }

  private renderActiveContextContent(content: any): string {
    console.log("[Provider] Rendering 'active_context' type");
    let mdString = '';

    if (!content || typeof content !== 'object') {
        return '_(Invalid or empty active_context content)_';
    }

    if (content.currentWork) {
      mdString += `### Current Work\n**${content.currentWork}**\n\n`;
    }

    if (Array.isArray(content.recentChanges) && content.recentChanges.length > 0) {
      mdString += `### Recent Changes\n`;
      // Sort by date descending if possible
      try {
          content.recentChanges.sort((a: any, b: any) => {
              // Handle potential invalid dates
              const dateA = a.date ? new Date(a.date).getTime() : 0;
              const dateB = b.date ? new Date(b.date).getTime() : 0;
              return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
          });
      } catch (e) { console.warn("Could not sort recent changes by date", e); }

      mdString += content.recentChanges.map((change: any) => {
          let dateStr = '';
          try {
              dateStr = change.date ? new Date(change.date).toLocaleString() : '';
          } catch (e) { /* ignore invalid date */ }
          return `- **${dateStr || (change.id || 'Change')}:** ${change.description || 'N/A'}`;
      }).join('\n') + '\n\n';
    }

    if (Array.isArray(content.activeDecisions) && content.activeDecisions.length > 0) {
      mdString += `### Active Decisions\n`;
      mdString += content.activeDecisions.map((decision: any) =>
        `- ${decision.description || decision.id || 'N/A'}`
      ).join('\n') + '\n\n';
    }

    if (Array.isArray(content.considerations) && content.considerations.length > 0) {
      mdString += `### Considerations\n`;
      mdString += content.considerations.map((item: any) =>
        `- ${item.description || item.id || 'N/A'} _(Status: ${item.status || 'open'})_`
      ).join('\n') + '\n\n';
    }

    if (Array.isArray(content.nextSteps) && content.nextSteps.length > 0) {
       mdString += `### Next Steps\n`;
       // Group by priority if available
       const grouped: { [key: string]: any[] } = {};
       content.nextSteps.forEach((item: any) => {
           const priority = item.priority || 'medium';
           if (!grouped[priority]) grouped[priority] = [];
           grouped[priority].push(item);
       });

       ['high', 'medium', 'low'].forEach(priority => {
           if (grouped[priority] && grouped[priority].length > 0) {
               mdString += `**Priority: ${priority.toUpperCase()}**\n`;
               mdString += grouped[priority].map((item: any) => `- ${item.description || item.id || 'N/A'}`).join('\n') + '\n';
           }
       });
        mdString += '\n';
    }

    // Add any other top-level keys using generic rendering
    const handledKeys = ['currentWork', 'recentChanges', 'activeDecisions', 'considerations', 'nextSteps'];
    const remainingContent: any = {};
     for (const key in content) {
        if (Object.prototype.hasOwnProperty.call(content, key) && !handledKeys.includes(key)) {
            remainingContent[key] = content[key];
        }
    }
    if (Object.keys(remainingContent).length > 0) {
         mdString += `### Other Information\n\n`;
         mdString += this.renderGenericContent(remainingContent);
    }

    return mdString || '_(Active context content seems empty)_';
  }

  private renderBranchContextContent(content: any): string {
    console.log("[Provider] Rendering 'branch_context' type");
    let mdString = '';

    if (!content || typeof content !== 'object') {
        return '_(Invalid or empty branch_context content)_';
    }

    if (content.branchName) {
      mdString += `### Branch Name\n\`${content.branchName}\`\n\n`;
    }
    if (content.purpose) {
      mdString += `### Purpose\n${content.purpose.replace(/\n/g, '  \n')}\n\n`; // Handle multiline purpose
    }
     if (content.createdAt) {
        try {
            mdString += `**Created At:** ${new Date(content.createdAt).toLocaleString()}\n\n`;
        } catch(e) { /* ignore invalid date */ }
    }

    if (Array.isArray(content.userStories) && content.userStories.length > 0) {
      mdString += `### User Stories\n`;
      // Sort by priority if available
      try {
          content.userStories.sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99));
      } catch (e) { console.warn("Could not sort user stories by priority", e); }

      mdString += content.userStories.map((story: any) => {
          const check = story.completed ? '[x]' : '[ ]';
          let storyLine = `- ${check} **${story.id || 'Story'}:** ${story.description || 'N/A'}`;
          if (story.priority !== undefined) {
              storyLine += ` _(Priority: ${story.priority})_`;
          }
          return storyLine;
      }).join('\n') + '\n\n';
    }

     if (content.additionalNotes) {
      mdString += `### Additional Notes\n${content.additionalNotes.replace(/\n/g, '  \n')}\n\n`; // Handle multiline notes
    }

    // Add any other top-level keys using generic rendering
    const handledKeys = ['branchName', 'purpose', 'createdAt', 'userStories', 'additionalNotes'];
    const remainingContent: any = {};
     for (const key in content) {
        if (Object.prototype.hasOwnProperty.call(content, key) && !handledKeys.includes(key)) {
            remainingContent[key] = content[key];
        }
    }
    if (Object.keys(remainingContent).length > 0) {
         mdString += `### Other Information\n\n`;
         mdString += this.renderGenericContent(remainingContent);
    }

    return mdString || '_(Branch context content seems empty)_';
  }

   private renderSystemPatternsContent(content: any): string {
    console.log("[Provider] Rendering 'system_patterns' type");
    let mdString = '';

     if (!content || typeof content !== 'object') {
        return '_(Invalid or empty system_patterns content)_';
    }

    if (Array.isArray(content.technicalDecisions) && content.technicalDecisions.length > 0) {
        mdString += `### Technical Decisions\n\n`;
        content.technicalDecisions.forEach((decision: any, index: number) => {
            mdString += `**${index + 1}. ${decision.title || decision.id || 'Decision'}**\n\n`; // Add extra newline
            if (decision.context) mdString += `   - **Context:**\n     ${decision.context.replace(/\n/g, '\n     ')}\n\n`; // Indent multiline
            if (decision.decision) mdString += `   - **Decision:**\n     ${decision.decision.replace(/\n/g, '\n     ')}\n\n`; // Indent multiline
            if (decision.status) mdString += `   - **Status:** ${decision.status}\n`;
            if (decision.date) {
                 try {
                    mdString += `   - **Date:** ${new Date(decision.date).toLocaleDateString()}\n`;
                 } catch(e) { /* ignore invalid date */ }
            }
            if (decision.consequences && typeof decision.consequences === 'object') {
                if (Array.isArray(decision.consequences.positive) && decision.consequences.positive.length > 0) {
                    mdString += `   - **Positive Consequences:**\n` + decision.consequences.positive.map((p: string) => `     - ${p.replace(/\n/g, ' ')}`).join('\n') + '\n'; // Ensure single line per consequence
                }
                 if (Array.isArray(decision.consequences.negative) && decision.consequences.negative.length > 0) {
                    mdString += `   - **Negative Consequences:**\n` + decision.consequences.negative.map((n: string) => `     - ${n.replace(/\n/g, ' ')}`).join('\n') + '\n'; // Ensure single line per consequence
                }
            }
             if (Array.isArray(decision.alternatives) && decision.alternatives.length > 0) {
                 mdString += `   - **Alternatives Considered:**\n` + decision.alternatives.map((alt: any) => `     - ${typeof alt === 'string' ? alt.replace(/\n/g, ' ') : JSON.stringify(alt)}`).join('\n') + '\n'; // Ensure single line per alternative
             }
            mdString += '\n---\n\n'; // Use separator between decisions
        });
    }

     if (Array.isArray(content.implementationPatterns) && content.implementationPatterns.length > 0) {
        mdString += `### Implementation Patterns\n\n`;
         content.implementationPatterns.forEach((pattern: any, index: number) => {
             mdString += `**${index + 1}. ${pattern.name || pattern.id || 'Pattern'}**\n\n`; // Add extra newline
             if (pattern.description) mdString += `   > ${pattern.description.replace(/\n/g, '\n   > ')}\n\n`; // Use blockquote for description
             // Add more details if needed based on pattern structure
             mdString += '\n';
         });
    }

    // Add any other top-level keys using generic rendering
    const handledKeys = ['technicalDecisions', 'implementationPatterns'];
    const remainingContent: any = {};
     for (const key in content) {
        if (Object.prototype.hasOwnProperty.call(content, key) && !handledKeys.includes(key)) {
            remainingContent[key] = content[key];
        }
    }
    if (Object.keys(remainingContent).length > 0) {
         mdString += `### Other Information\n\n`;
         mdString += this.renderGenericContent(remainingContent);
    }


    return mdString || '_(System patterns content seems empty)_';
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
