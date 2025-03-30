import React, { useState, useEffect, useRef, useCallback } from 'react';
import MarkdownIt from 'markdown-it';
// import mdMermaid from 'markdown-it-mermaid'; // Mermaidは後で有効化
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

// --- VS Code API Handling ---
interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(newState: any): void;
}
// Ensure acquireVsCodeApi can be called only once.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let vscodeApiInstance: VsCodeApi | undefined;
function acquireVsCodeApi(): VsCodeApi {
  if (!vscodeApiInstance) {
    // Check if the function exists before calling it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).acquireVsCodeApi === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vscodeApiInstance = (window as any).acquireVsCodeApi();
    } else {
      // Fallback for environments where the API isn't available (e.g., testing)
      console.warn('acquireVsCodeApi not found, using mock API.');
      vscodeApiInstance = {
        postMessage: (message) => console.log('Mock postMessage:', message),
        getState: () => { console.log('Mock getState'); return {}; },
        setState: (newState) => console.log('Mock setState:', newState),
      };
    }
  }
  // At this point, vscodeApiInstance is guaranteed to be assigned
  // either the real API or the mock API.
  return vscodeApiInstance as VsCodeApi; // Use type assertion as we've handled the undefined case
}
const vscode = acquireVsCodeApi();
// --- End VS Code API Handling ---


// Initialize markdown-it
const md = new MarkdownIt({
  html: true, // Allow HTML tags in source
  linkify: true, // Autoconvert URL-like text to links
  typographer: true, // Enable some language-neutral replacement + quotes beautification
});
// md.use(mdMermaid); // Mermaidは後で有効化

function App() {
  const [documentContent, setDocumentContent] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  // Ref to track if the update comes from VS Code to prevent echoing back
  const isUpdatingFromVsCode = useRef(false);

  // Function to convert JSON to a simple Markdown representation
  const convertJsonToMarkdown = (jsonString: string): string => {
    try {
      JSON.parse(jsonString);
      return '```json\n' + jsonString + '\n```';
    } catch (error) {
      return `\`\`\`error\nInvalid JSON:\n${error}\n\`\`\`\n\n${jsonString}`;
    }
  };

  // Update preview whenever documentContent changes
  useEffect(() => {
    const markdown = convertJsonToMarkdown(documentContent);
    setPreviewHtml(md.render(markdown));
  }, [documentContent]);


  // Effect for initializing editor and setting up VS Code message listener
  useEffect(() => {
    // Initialize Monaco Editor
    if (editorContainerRef.current && !editorInstanceRef.current) {
      // Use VS Code state persistence if available, otherwise default content
      const previousState = vscode.getState() as { text?: string };
      const initialJson = previousState?.text ?? JSON.stringify({ message: "Editor Initializing...", timestamp: new Date().toISOString() }, null, 2);
      setDocumentContent(initialJson);

      editorInstanceRef.current = monaco.editor.create(editorContainerRef.current, {
        value: initialJson,
        language: 'json',
        theme: 'vs-dark', // TODO: Detect theme from VS Code message
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: 'on',
      });

      // Add listener for content changes from Monaco Editor
      editorInstanceRef.current.onDidChangeModelContent(() => {
        if (editorInstanceRef.current && !isUpdatingFromVsCode.current) {
          handleEditorChange(editorInstanceRef.current.getValue());
        }
      });
    }

    // Listener for messages from the VS Code extension host
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'updateContent':
          const newText = message.text;
          console.log("WebView received updateContent from extension.");
          isUpdatingFromVsCode.current = true; // Set flag before updating editor
          setDocumentContent(newText); // Update React state
          if (editorInstanceRef.current && editorInstanceRef.current.getValue() !== newText) {
            // Update Monaco editor only if content differs
            editorInstanceRef.current.setValue(newText);
          }
          vscode.setState({ text: newText }); // Persist state in VS Code
          // Reset flag after potential synchronous updates
          requestAnimationFrame(() => {
             isUpdatingFromVsCode.current = false;
          });
          break;
        // TODO: Handle theme changes, etc.
        // case 'setTheme':
        //   monaco.editor.setTheme(message.theme === 'dark' ? 'vs-dark' : 'vs');
        //   break;
      }
    };
    window.addEventListener('message', messageListener);

    // Inform VS Code that the webview is ready
    console.log("WebView sending 'ready' message.");
    vscode.postMessage({ type: 'ready' });

    // Cleanup function
    return () => {
      window.removeEventListener('message', messageListener);
      editorInstanceRef.current?.dispose();
      editorInstanceRef.current = null;
    };

  }, []); // Empty dependency array ensures this runs only once on mount

  // Debounced function to send updates to VS Code
  const sendUpdateToVsCode = useCallback((text: string) => {
      console.log("WebView sending 'update' message.");
      vscode.postMessage({ type: 'update', text: text });
      vscode.setState({ text: text }); // Persist state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No dependencies, vscode api assumed stable

  // Handler for editor changes (called by Monaco listener)
  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || '';
    if (newContent !== documentContent) {
        setDocumentContent(newContent); // This triggers the preview update via useEffect
        // TODO: Debounce this call if performance becomes an issue
        sendUpdateToVsCode(newContent);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Editor Panel */}
      <div style={{ flex: 1, borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ padding: '10px', margin: 0, borderBottom: '1px solid #ccc', fontSize: '1.1em' }}>Editor</h2>
        <div ref={editorContainerRef} style={{ flex: 1, overflow: 'hidden' }} id="monaco-editor-container">
           {/* Monaco Editor mounts here */}
        </div>
      </div>

      {/* Preview Panel */}
      <div style={{ flex: 1, padding: '10px', overflow: 'auto' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1em' }}>Preview</h2>
        <div
           dangerouslySetInnerHTML={{ __html: previewHtml }}
           style={{ wordWrap: 'break-word' }}
           className="markdown-body" // Optional: Add class for styling
        />
      </div>
    </div>
  );
}

export default App;
