// @ts-check
/**
 * editor.js - Memory Bank Document Editor WebView Script
 * This script handles the interactive behavior of the Memory Bank document editor webview.
 */

(function () {
  const vscode = acquireVsCodeApi();
  let editor, previewContentDiv, errorMessageDiv;
  let lastKnownText = '';

  /**
   * Initialize the editor functionality.
   */
  function initialize() {
    console.log('[Webview] Initializing editor script...'); // Add log at the start
    // Get DOM elements
    editor = document.getElementById('editor');
    previewContentDiv = document.getElementById('preview-content');
    errorMessageDiv = document.getElementById('error-message');

    if (editor) {
      lastKnownText = editor.value;

      // Setup event listeners for editor changes
      editor.addEventListener('input', handleEditorInput);
    } else {
      console.error('[Webview] Editor element not found');
    }

    // Handle messages from the extension
    window.addEventListener('message', handleExtensionMessages);

    // Setup mode toggle buttons
    setupModeToggle();

    console.log('[Webview] Script loaded and listeners attached.');

    // Initialize Mermaid if available
    initializeMermaid();

    // Request initial preview
    requestInitialPreview();

    // Attempt initial Mermaid rendering after a delay
    setTimeout(attemptInitialMermaidRender, 150);

    console.log('[Webview] Editor script initialization complete.');
  }

  /**
   * Initialize Mermaid library if available
   */
  function initializeMermaid() {
    try {
      if (typeof mermaid !== 'undefined') {
        console.log('[Webview] Mermaid library found, initializing...');
        // Initialize with default config
        mermaid.initialize({
          startOnLoad: false, // We'll manually run rendering
          theme: 'default',
          securityLevel: 'loose', // Needed for webview rendering
          flowchart: { useMaxWidth: true, htmlLabels: true },
          logLevel: 3, // Error
        });
        console.log('[Webview] Mermaid initialized successfully');
        return true;
      } else {
        console.warn('[Webview] Mermaid library not found during initialization.');
        return false;
      }
    } catch (err) {
      console.error('[Webview] Error initializing Mermaid:', err);
      return false;
    }
  }

  /**
   * Request the initial preview from the extension
   */
  function requestInitialPreview() {
    console.log("[Webview] Sending 'requestPreview' message to extension.");
    vscode.postMessage({ type: 'requestPreview', payload: lastKnownText });
  }

  /**
   * Handle input events from the editor textarea
   * @param {Event} e - The input event
   */
  function handleEditorInput(e) {
    const newText = e.target.value;
    lastKnownText = newText;
    errorMessageDiv.textContent = '';

    // Basic JSON validation
    try {
      JSON.parse(newText);
      // Send update to extension host for processing and preview generation
      vscode.postMessage({ type: 'update', payload: newText });
    } catch (err) {
      errorMessageDiv.textContent = 'Invalid JSON: ' + err.message;
      // Still send update so extension is aware of invalid state
      vscode.postMessage({ type: 'update', payload: newText });
    }
  }

  /**
   * Handle messages received from the extension
   * @param {MessageEvent} event - The message event
   */
  function handleExtensionMessages(event) {
    const message = event.data;
    switch (message.type) {
      case 'update': // Update editor content
        handleEditorUpdate(message);
        break;
      case 'updatePreview': // Update preview content
        handlePreviewUpdate(message);
        break;
    }
  }

  /**
   * Handle update messages for the editor content
   * @param {object} message - The update message
   */
  function handleEditorUpdate(message) {
    const newText = message.text;
    if (newText !== lastKnownText) {
      console.log('Webview received editor update from extension.');
      editor.value = newText;
      lastKnownText = newText;
      errorMessageDiv.textContent = '';
    }
  }

  /**
   * Handle update messages for the preview content
   * @param {object} message - The update message
   */
  function handlePreviewUpdate(message) {
    console.log("[Webview] Received 'updatePreview' from extension.");
    if (message.html !== undefined) {
      previewContentDiv.innerHTML = message.html; // Set rendered HTML
      console.log('[Webview] Preview HTML updated (length: ' + message.html.length + ')');

      // Attempt to render Mermaid diagrams after updating HTML
      renderMermaidDiagrams();
    } else {
      console.error("[Webview] Received 'updatePreview' message without html content.");
    }
  }

  /**
   * Render Mermaid diagrams in the preview content
   */
  function renderMermaidDiagrams() {
    try {
      if (typeof mermaid !== 'undefined') {
        const mermaidElements = previewContentDiv.querySelectorAll('.mermaid');
        if (mermaidElements && mermaidElements.length > 0) {
          console.log(
            '[Webview] Found ' +
              mermaidElements.length +
              ' mermaid elements. Rendering individually...'
          );
          // Iterate through NodeList and render each element
          Array.from(mermaidElements).forEach((element, index) => {
            try {
              // Remove any previously rendered SVG to prevent duplicates
              const existingSvg = element.querySelector('svg');
              if (existingSvg) {
                element.innerHTML = element.textContent || ''; // Restore original text
              }
              mermaid.run({ nodes: [element] }); // Render one element
              console.log('[Webview] Mermaid rendering attempted on element ' + index);
            } catch (renderErr) {
              console.error(
                '[Webview] Mermaid rendering failed for element ' + index + ':',
                renderErr
              );
              // Add null check before setting innerHTML in catch block
              if (element) {
                  element.innerHTML = '<pre>Mermaid Error:' + renderErr + '</pre>';
              }
            }
          });
        }
      } else {
        console.warn('[Webview] Mermaid library not found when trying to render.');
      }
    } catch (err) {
      console.error('[Webview] Error rendering Mermaid:', err);
    }
  }

  /**
   * Attempt initial rendering of Mermaid diagrams
   */
  function attemptInitialMermaidRender() {
    try {
      if (typeof mermaid !== 'undefined') {
        const initialMermaidElements = previewContentDiv.querySelectorAll('.mermaid');
        if (initialMermaidElements && initialMermaidElements.length > 0) {
          console.log(
            '[Webview] Found ' +
              initialMermaidElements.length +
              ' mermaid elements for initial render. Rendering individually...'
          );
          // Iterate through NodeList and render each element
          Array.from(initialMermaidElements).forEach((element, index) => {
            try {
              // Check if already rendered (simple check)
              if (!element.querySelector('svg')) {
                mermaid.run({ nodes: [element] }); // Render one element
                console.log('[Webview] Initial Mermaid rendering attempted on element ' + index);
              } else {
                console.log(
                  '[Webview] Skipping initial render for already rendered element ' + index
                );
              }
            } catch (renderErr) {
              console.error(
                '[Webview] Initial Mermaid rendering failed for element ' + index + ':',
                renderErr
              );
              // Add null check before setting innerHTML in catch block
              if (element) {
                  element.innerHTML = '<pre>Mermaid Error:' + renderErr + '</pre>';
              }
            }
          });
        } else {
          console.log('[Webview] No mermaid elements found for initial render.');
        }
      } else {
        console.warn('[Webview] Mermaid library not found for initial render.');
      }
    } catch (err) {
      console.error('[Webview] Error during initial Mermaid rendering:', err);
    }
  }

  /**
   * Sets up event listeners for the mode toggle buttons.
   */
  function setupModeToggle() {
      const controls = document.getElementById('controls');
      if (controls) {
          controls.addEventListener('click', (event) => {
              // Check if the clicked target is an HTMLButtonElement
              if (event.target instanceof HTMLButtonElement) {
                  const button = event.target; // Cast to button element
                  const mode = button.getAttribute('data-mode');
                  if (mode) {
                      updateMode(mode);
                  }
              }
          });
      } else {
          console.error('[Webview] Controls element not found');
      }
  }

  /**
   * Updates the body class and button states based on the selected mode.
   * @param {string} newMode - The mode to switch to ('editor-only', 'split', 'preview-only').
   */
  function updateMode(newMode) {
      // Remove existing mode classes from body
      document.body.classList.remove('show-editor-only', 'show-split', 'show-preview-only');
      // Add the new mode class
      document.body.classList.add(`show-${newMode}`);

      // Update button active states
      const buttons = document.querySelectorAll('#controls button');
      buttons.forEach(button => {
          if (button.getAttribute('data-mode') === newMode) {
              button.classList.add('active');
          } else {
              button.classList.remove('active');
          }
      });
      console.log(`[Webview] Switched to mode: ${newMode}`);
      // Persist mode preference if needed (using vscode.setState)
      // vscode.setState({ viewMode: newMode });
  }

  // Initialize after the DOM is fully loaded
  if (document.readyState === 'loading') { // Loading hasn't finished yet
      window.addEventListener('DOMContentLoaded', initialize);
  } else { // DOMContentLoaded has already fired
      initialize();
  }
})();
