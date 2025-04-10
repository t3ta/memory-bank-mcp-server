import * as vscode from 'vscode';
import { MemoryBankProvider } from './providers/memoryBankProvider';
import { SchemaProvider } from './providers/schemaProvider';
import { MemoryBankExplorerProvider } from './explorer/memoryBankExplorerProvider';
import { DocumentEditorProvider } from './editors/documentEditorProvider';
import { AIService } from './services/aiService';

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext): void {
  // 初期化ログはコメントアウト
  // vscode.window.showInformationMessage('--- Activating Memory Bank Editor ---');
  vscode.window.showInformationMessage('Memory Bank Editor is activating...');

  // デバッグ用のログなのでコメントアウト
  // vscode.window.showInformationMessage('Congratulations, your extension \"memory-bank-editor\" is now active!');

  let memoryProvider: MemoryBankProvider | undefined;
  let schemaProvider: SchemaProvider | undefined;
  let aiService: AIService | undefined;

  try {
    memoryProvider = new MemoryBankProvider();
    // デバッグ用のログなのでコメントアウト
    // vscode.window.showInformationMessage('MemoryBankProvider instantiated successfully.');
  } catch (error) {
    // console.errorは許可されているのでそのまま残す（エラー表示は重要）
    console.error('Failed to instantiate MemoryBankProvider:', error);
    vscode.window.showErrorMessage(`Failed to initialize Memory Bank Provider: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    schemaProvider = new SchemaProvider();
    // デバッグ用のログなのでコメントアウト
    // vscode.window.showInformationMessage('SchemaProvider instantiated successfully.');
  } catch (error) {
    // console.errorは許可されているのでそのまま残す（エラー表示は重要）
    console.error('Failed to instantiate SchemaProvider:', error);
    vscode.window.showErrorMessage(`Failed to initialize Schema Provider: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    aiService = new AIService();
    // デバッグ用のログなのでコメントアウト
    // vscode.window.showInformationMessage('AIService instantiated successfully.');
  } catch (error) {
    // console.errorは許可されているのでそのまま残す（エラー表示は重要）
    console.error('Failed to instantiate AIService:', error);
    vscode.window.showErrorMessage(`Failed to initialize AI Service: ${error instanceof Error ? error.message : String(error)}`);
  }


  // --- Test Commands ---

  const testReadCommand = vscode.commands.registerCommand('memoryBank.testRead', async () => {
    if (!memoryProvider) {
        vscode.window.showErrorMessage('Memory Bank Provider is not available.');
        return;
    }
    const testFilePath = 'global-memory-bank/core/architecture.json';
    try {
      const content = await memoryProvider.getDocumentContent(testFilePath);
      // デバッグ情報はステータスバーに表示する
      // vscode.window.showInformationMessage(`Read content length: ${content.length}`);
      vscode.window.showInformationMessage(`Successfully read ${testFilePath}! Content length: ${content.length}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to read test file ${testFilePath}.`);
      // console.errorは許可されているのでそのまま残す（エラー表示は重要）
      console.error(`Error in memoryBank.testRead command:`, error);
    }
  });

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
      vscode.window.showErrorMessage(`Failed to write test file ${testFilePath}.`);
      // console.errorは許可されているのでそのまま残す（エラー表示は重要）
      console.error(`Error in memoryBank.testWrite command:`, error);
    }
  });

  const testSchemaCommand = vscode.commands.registerCommand('memoryBank.testSchema', () => {
    if (!schemaProvider) {
        vscode.window.showErrorMessage('Schema Provider is not available.');
        return;
    }
    const documentTypeToTest = 'progress';

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


    const validResult = schemaProvider.validateDocument(validTestData);
    if (validResult.success) {
        vscode.window.showInformationMessage(`Validation successful for valid test data against schema '${documentTypeToTest}'.`);
        // デバッグ用のログなのでコメントアウト
        // vscode.window.showInformationMessage("Valid data validation result:", validResult.data);
    } else {
        vscode.window.showErrorMessage(`Validation FAILED for valid test data against schema '${documentTypeToTest}'.`);
        // console.errorは許可されているのでそのまま残す（エラー表示は重要）
        console.error("Valid data validation error:", validResult.error.errors);
    }

    const invalidResult = schemaProvider.validateDocument(invalidTestData);
    if (!invalidResult.success) {
        vscode.window.showInformationMessage(`Validation correctly failed for invalid test data against schema '${documentTypeToTest}'.`);
        // デバッグ用のログなのでコメントアウト
        // vscode.window.showInformationMessage("Invalid data validation errors:", invalidResult.error.errors);
    } else {
        vscode.window.showErrorMessage(`Validation INCORRECTLY passed for invalid test data against schema '${documentTypeToTest}'.`);
        // console.errorは許可されているのでそのまま残す（エラー表示は重要）
        console.error("Invalid data validation passed unexpectedly:", invalidResult.data);
    }

     const retrievedSchema = schemaProvider.getSchema(documentTypeToTest);
     if (retrievedSchema) {
         // デバッグ用のログなのでコメントアウト
         // vscode.window.showInformationMessage(`Successfully retrieved schema object for '${documentTypeToTest}'.`);
         // ステータスバーに表示する
         vscode.window.showInformationMessage(`Retrieved schema object for '${documentTypeToTest}'.`);
     } else {
         // console.errorは許可されているのでそのまま残す（エラー表示は重要）
         console.error(`Failed to retrieve schema object for '${documentTypeToTest}'.`);
         vscode.window.showErrorMessage(`Failed to retrieve schema object for '${documentTypeToTest}'.`);
     }
  });

  // --- Register Tree View ---
  let explorerProvider: MemoryBankExplorerProvider | undefined;
  const workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : undefined;

  if (workspaceRoot && memoryProvider) {
      explorerProvider = new MemoryBankExplorerProvider(workspaceRoot, memoryProvider);
      vscode.window.registerTreeDataProvider('memoryBankDocuments', explorerProvider);
      vscode.window.showInformationMessage('MemoryBankExplorerProvider registered for view: memoryBankDocuments');

      const refreshCommand = vscode.commands.registerCommand('memoryBank.refreshExplorer', () => {
          explorerProvider?.refresh();
          vscode.window.showInformationMessage('Memory Bank Explorer refreshed.');
      });
      context.subscriptions.push(refreshCommand);

  } else {
      vscode.window.showWarningMessage("Memory Bank Explorer cannot be initialized because no workspace root is defined.");
  }

  // --- Register Custom Editor ---
  context.subscriptions.push(DocumentEditorProvider.register(context));
  vscode.window.showInformationMessage('DocumentEditorProvider registered.');


  // --- Register Test Commands ---
  context.subscriptions.push(testReadCommand, testWriteCommand, testSchemaCommand);

  // --- Test AI Service Command ---
  const testAICommand = vscode.commands.registerCommand('memoryBank.testAI', async () => {
    if (!aiService || !aiService.isReady()) {
        vscode.window.showErrorMessage('AI Service is not available or not configured. Please check settings.');
        return;
    }
    const prompt = await vscode.window.showInputBox({ prompt: 'Enter a prompt for Gemini:' });
    if (!prompt) {
        return;
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
  context.subscriptions.push(testAICommand);
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate(): void {
  vscode.window.showInformationMessage('Your extension \"memory-bank-editor\" is now deactivated.');
}