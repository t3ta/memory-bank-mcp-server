import React, { useState, useEffect, useRef, useCallback } from 'react';
import MarkdownIt from 'markdown-it';
// import mdMermaid from 'markdown-it-mermaid'; // Mermaidは後で有効化
// import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'; // Monaco Editorは使用しない

// --- VS Code API Handling (Keep for potential future use, but comment out direct usage for now) ---
interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(newState: any): void;
}
let vscodeApiInstance: VsCodeApi | undefined;
function acquireVsCodeApi(): VsCodeApi {
  if (!vscodeApiInstance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).acquireVsCodeApi === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vscodeApiInstance = (window as any).acquireVsCodeApi();
    } else {
      console.warn('acquireVsCodeApi not found, using mock API.');
      vscodeApiInstance = {
        postMessage: (message) => console.log('Mock postMessage:', message),
        getState: () => { console.log('Mock getState'); return {}; },
        setState: (newState) => console.log('Mock setState:', newState),
      };
    }
  }
  return vscodeApiInstance as VsCodeApi;
}
// const vscode = acquireVsCodeApi(); // Comment out for now
// --- End VS Code API Handling ---


// Initialize markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});
// md.use(mdMermaid);

function App() {
  const [documentContent, setDocumentContent] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Use ref for textarea

  // Function to convert JSON to a simple Markdown representation
  const convertJsonToMarkdown = (jsonString: string): string => {
    try {
      JSON.parse(jsonString);
      return '```json\n' + jsonString + '\n```';
    } catch (error) {
      // Basic error display in Markdown
      return `\`\`\`error\nInvalid JSON:\n${error}\n\`\`\`\n\n${jsonString}`;
    }
  };

  // Update preview whenever documentContent changes
  useEffect(() => {
    const markdown = convertJsonToMarkdown(documentContent);
    setPreviewHtml(md.render(markdown));
  }, [documentContent]);


  // Effect for initializing content and setting up VS Code message listener (simplified)
  useEffect(() => {
    // Restore state or set initial content
    // const previousState = vscode.getState() as { text?: string }; // Commented out
    const initialJson = /*previousState?.text ??*/ JSON.stringify({ message: "Editor Initializing...", timestamp: new Date().toISOString() }, null, 2);
    setDocumentContent(initialJson);

    // Listener for messages from the VS Code extension host (simplified)
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'updateContent': // Renamed for clarity, was 'update' in provider
          const newText = message.text;
          console.log("WebView received updateContent from extension.");
          // Update textarea directly if needed, or just state which triggers re-render
          if (textareaRef.current && textareaRef.current.value !== newText) {
             setDocumentContent(newText); // Update state
             // vscode.setState({ text: newText }); // Commented out
          }
          break;
      }
    };
    window.addEventListener('message', messageListener);

    // Inform VS Code that the webview is ready (if using API)
    // console.log("WebView sending 'ready' message.");
    // vscode.postMessage({ type: 'ready' }); // Commented out

    // Cleanup function
    return () => {
      window.removeEventListener('message', messageListener);
    };

  }, []); // Empty dependency array ensures this runs only once on mount

  // Debounced function to send updates to VS Code (simplified)
  const sendUpdateToVsCode = useCallback((text: string) => {
      console.log("WebView sending 'update' message (mock).");
      // vscode.postMessage({ type: 'update', text: text }); // Commented out
      // vscode.setState({ text: text }); // Commented out
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for textarea changes
  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setDocumentContent(newContent); // Update state, triggers preview update
    // Basic JSON validation feedback
    try {
        JSON.parse(newContent);
        // Clear error indication if needed
    } catch (e) {
        // Indicate error if needed
    }
    // Send update back to extension
    sendUpdateToVsCode(newContent);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Editor Panel */}
      <div style={{ flex: 1, borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ padding: '10px', margin: 0, borderBottom: '1px solid #ccc', fontSize: '1.1em' }}>Editor</h2>
        {/* Simple Textarea for editing */}
        <textarea
          ref={textareaRef}
          value={documentContent}
          onChange={handleTextareaChange}
          style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'monospace', resize: 'none', padding: '5px', width: '100%' }}
          aria-label="JSON Editor"
        />
      </div>

      {/* Preview Panel */}
      <div style={{ flex: 1, padding: '10px', overflow: 'auto' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1em' }}>Preview</h2>
        <div
           dangerouslySetInnerHTML={{ __html: previewHtml }}
           style={{ wordWrap: 'break-word' }}
           className="markdown-body"
        />
      </div>
    </div>
  );
}

export default App;
