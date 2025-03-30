# Memory Bank Editor (VS Code Extension)

This VS Code extension provides tools to easily view and edit Memory Bank documents directly within the editor. It aims to offer schema validation, real-time feedback, and eventually AI-powered features for managing knowledge effectively.

## Development Setup

1.  **Navigate to the extension directory:**
    ```bash
    cd packages/vscode-extension
    ```

2.  **Install dependencies:**
    Make sure you have `yarn` installed.
    ```bash
    yarn install
    ```

3.  **Build the extension:**
    This compiles the TypeScript code into JavaScript.
    ```bash
    yarn build
    ```

4.  **Watch for changes (optional):**
    To automatically rebuild the extension when you make code changes:
    ```bash
    yarn watch
    ```

## Running the Extension

1.  **Open the main project root (`memory-bank-mcp-server`) in VS Code.**
2.  **Press `F5`** or go to `Run > Start Debugging`. This will open a new VS Code window (the **Extension Development Host**) with the `Memory Bank Editor` extension loaded.

## Basic Usage (Current State)

*   The extension activates automatically when VS Code starts. You should see a log message in the Debug Console of the *main* VS Code window: `Congratulations, your extension "memory-bank-editor" is now active!`
*   **Test Command:** Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) in the *Extension Development Host* window and type `Memory Bank: Test Read`. Select the command.
    *   This command attempts to read the file `docs/global-memory-bank/core/architecture.json` relative to the workspace root.
    *   If successful, it will show an information message: `Successfully read ...! Check console for content length.`
    *   Check the Debug Console in the *main* VS Code window for more detailed logs, including any errors.

## Features (Planned)

*   **Memory Bank Explorer:** A tree view in the activity bar to navigate Memory Bank documents.
*   **Document Editor:** A custom editor for `.json` files within the memory bank, providing schema validation and potentially form-based editing.
*   **Branch Comparison:** Tools to compare memory bank content between different branches.
*   **Document Relationships:** Visualization of links and references between documents.
*   **AI Integration:** Features for detecting duplicates, suggesting consolidations, and checking consistency using Gemini AI.

## Contributing

Please refer to the main project's contribution guidelines. Ensure code adheres to the ESLint and Prettier configurations within this package.
