import * as vscode from 'vscode';
import { MemoryBankProvider } from './providers/memoryBankProvider';
import { SchemaProvider } from './providers/schemaProvider';
import { MemoryBankExplorerProvider } from './explorer/memoryBankExplorerProvider';
import { DocumentEditorProvider } from './editors/documentEditorProvider';
import { AIService } from './services/aiService'; // Import AIService

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext): void {
  // Log entry point to confirm activation attempt
  console.log('--- Activating Memory Bank Editor ---');
  vscode.window.showInformationMessage('Memory Bank Editor is activating...'); // Show message to user

  console.log('Congratulations, your extension "memory-bank-editor" is now active!'); // Keep original log

  let memoryProvider: MemoryBankProvider | undefined;
  let schemaProvider: SchemaProvider | undefined;
  let aiService: AIService | undefined; // Declare AIService variable

  try {
    memoryProvider = new MemoryBankProvider();
    console.log('MemoryBankProvider instantiated successfully.');
  } catch (error) {
    console.error('Failed to instantiate MemoryBankProvider:', error);
    vscode.window.showErrorMessage(`Failed to initialize Memory Bank Provider: ${error instanceof Error ? error.message : String(error)}`);
    // Don't necessarily stop activation, maybe some features can work without it? Or maybe stop. Decide later.
  }

  try {
    schemaProvider = new SchemaProvider();
    console.log('SchemaProvider instantiated successfully.');
  } catch (error) {
    console.error('Failed to instantiate SchemaProvider:', error);
    vscode.window.showErrorMessage(`Failed to initialize Schema Provider: ${error instanceof Error ? error.message : String(error)}`);
    // Decide if activation should stop here too.
  }

  try {
    aiService = new AIService(); // Instantiate AIService
    console.log('AIService instantiated successfully.');
  } catch (error) {
    console.error('Failed to instantiate AIService:', error);
    vscode.window.showErrorMessage(`Failed to initialize AI Service: ${error instanceof Error ? error.message : String(error)}`);
    // AI features might be disabled if this fails, but activation can continue
  }


  // --- Test Commands ---

  // Test Reading
  const testReadCommand = vscode.commands.registerCommand('memoryBank.testRead', async () => {
    if (!memoryProvider) {
        vscode.window.showErrorMessage('Memory Bank Provider is not available.');
        return;
    }
    const testFilePath = 'global-memory-bank/core/architecture.json';
    try {
      const content = await memoryProvider.getDocumentContent(testFilePath);
      console.log(`Read content length: ${content.length}`);
      vscode.window.showInformationMessage(`Successfully read ${testFilePath}! Check console for content length.`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to read test file ${testFilePath}. See console for details.`);
      console.error(`Error in memoryBank.testRead command:`, error);
    }
  });

  // Test Writing
  const testWriteCommand = vscode.commands.registerCommand('memoryBank.testWrite', async () => {
    if (!memoryProvider) {
        vscode.window.showErrorMessage('Memory Bank Provider is not available.');
        return;
    }
    const testFilePath = 'branch-memory-bank/feature-vscode-extension/test-write.json';
    const testContent = JSON.stringify({
      message: "Test write successful!",
      timestamp: new Date().toISOString()
    }, null, 2);

    try {
      await memoryProvider.updateDocumentContent(testFilePath, testContent);
      vscode.window.showInformationMessage(`Successfully wrote test file: ${testFilePath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to write test file ${testFilePath}. See console for details.`);
      console.error(`Error in memoryBank.testWrite command:`, error);
    }
  });

  // Test Schema Validation
  const testSchemaCommand = vscode.commands.registerCommand('memoryBank.testSchema', () => {
    if (!schemaProvider) {
        vscode.window.showErrorMessage('Schema Provider is not available.');
        return;
    }
    const documentTypeToTest = 'progress'; // Test with the progress schema

    // Construct valid test data including metadata and schema version
    const validTestData = {
        schema: 'memory_document_v2',
        metadata: {
            id: 'test-valid-uuid',
            title: 'Valid Test Progress',
            documentType: documentTypeToTest,
            path: 'test/valid.json',
            tags: ['test'],
            lastModified: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            version: 1,
        },
        content: {
            status: "Testing",
            completionPercentage: 50
        }
    };

    // Construct invalid test data including metadata and schema version
    const invalidTestData = {
        schema: 'memory_document_v2',
        metadata: {
            id: 'test-invalid-uuid',
            title: 'Invalid Test Progress',
            documentType: documentTypeToTest,
            path: 'test/invalid.json',
            tags: ['test'],
            lastModified: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            version: 1,
        },
        content: {
            status: 123, // Invalid type
            extraField: true // Extra field (should fail if schema is strict)
        }
    };


    // Test valid data - Pass only the document object
    const validResult = schemaProvider.validateDocument(validTestData);
    if (validResult.success) {
        vscode.window.showInformationMessage(`Validation successful for valid test data against schema '${documentTypeToTest}'.`);
        console.log("Valid data validation result:", validResult.data);
    } else {
        vscode.window.showErrorMessage(`Validation FAILED for valid test data against schema '${documentTypeToTest}'. See console.`);
        console.error("Valid data validation error:", validResult.error.errors);
    }

    // Test invalid data - Pass only the document object
    const invalidResult = schemaProvider.validateDocument(invalidTestData);
    if (!invalidResult.success) {
        vscode.window.showInformationMessage(`Validation correctly failed for invalid test data against schema '${documentTypeToTest}'. See console.`);
        console.log("Invalid data validation errors:", invalidResult.error.errors);
    } else {
        vscode.window.showErrorMessage(`Validation INCORRECTLY passed for invalid test data against schema '${documentTypeToTest}'.`);
        console.error("Invalid data validation passed unexpectedly:", invalidResult.data);
    }

     // Test getting a schema using the documentType we tested validation with
     const retrievedSchema = schemaProvider.getSchema(documentTypeToTest);
     if (retrievedSchema) {
         console.log(`Successfully retrieved schema object for '${documentTypeToTest}'.`);
     } else {
         console.error(`Failed to retrieve schema object for '${documentTypeToTest}'.`);
     }
  });

  // --- Register Tree View ---
  let explorerProvider: MemoryBankExplorerProvider | undefined;
  const workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : undefined;

  if (workspaceRoot && memoryProvider) { // Ensure memoryProvider is also available
      explorerProvider = new MemoryBankExplorerProvider(workspaceRoot, memoryProvider); // Pass memoryProvider
      // Register the TreeDataProvider using the view ID defined in package.json
      vscode.window.registerTreeDataProvider('memoryBankDocuments', explorerProvider);
      console.log('MemoryBankExplorerProvider registered for view: memoryBankDocuments');

      // Register the refresh command defined in package.json
      const refreshCommand = vscode.commands.registerCommand('memoryBank.refreshExplorer', () => {
          explorerProvider?.refresh(); // Use optional chaining in case initialization failed
          vscode.window.showInformationMessage('Memory Bank Explorer refreshed.');
      });
      context.subscriptions.push(refreshCommand);

  } else {
      console.warn("Memory Bank Explorer cannot be initialized because no workspace root is defined.");
      // Optionally inform the user if the explorer cannot be shown
      // vscode.window.showWarningMessage("Memory Bank Explorer requires an open folder.");
  }

  // --- Register Custom Editor ---
  // The register method handles the registration and returns the disposable
  context.subscriptions.push(DocumentEditorProvider.register(context));
  console.log('DocumentEditorProvider registered.');


  // Push all test commands into subscriptions
  context.subscriptions.push(testReadCommand, testWriteCommand, testSchemaCommand);
  // Note: TreeDataProvider registration doesn't return a disposable in the same way,
  // but the refresh command's disposable was already pushed if the provider was created.

  // Test AI Service Command
  const testAICommand = vscode.commands.registerCommand('memoryBank.testAI', async () => {
    if (!aiService || !aiService.isReady()) {
        vscode.window.showErrorMessage('AI Service is not available or not configured. Please check settings.');
        return;
    }
    const prompt = await vscode.window.showInputBox({ prompt: 'Enter a prompt for Gemini:' });
    if (!prompt) {
        return; // User cancelled
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Calling Gemini API...",
        cancellable: false
    }, async (progress) => {
        progress.report({ increment: 0 });
        try {
            const result = await aiService.generateContent('gemini-1.5-flash', prompt); // Use flash model for testing
            progress.report({ increment: 100 });
            if (result !== null) {
                // Display result in a new untitled document
                const doc = await vscode.workspace.openTextDocument({ content: result, language: 'markdown' });
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage('Gemini response received.');
            } else {
                vscode.window.showErrorMessage('Failed to get response from Gemini API. Check logs.');
            }
        } catch (error) {
            progress.report({ increment: 100 });
            console.error("Error during testAI command:", error);
            vscode.window.showErrorMessage(`Error calling Gemini API: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
  });
  context.subscriptions.push(testAICommand); // Add test command to subscriptions

  // Add other command registrations and initialization logic here
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate(): void {
  console.log('Your extension "memory-bank-editor" is now deactivated.');
  // Add cleanup logic here
}
