import * as vscode from 'vscode';
import * as path from 'path';
import { z } from 'zod';

type SchemaMap = { [key: string]: z.ZodSchema<unknown> };

/**
 * Provides access to memory bank document schemas.
 * Loads schemas dynamically from the compiled '@memory-bank/schemas' package.
 */
export class SchemaProvider {
  private schemas: SchemaMap = {};
  private workspaceRoot: string;
  private schemasPackageDistPath: string; // Path to the compiled schemas package dist

  constructor() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('SchemaProvider requires an open workspace.');
      throw new Error('No workspace folder found.');
    }
    this.workspaceRoot = workspaceFolders[0].uri.fsPath;
    // Assuming schemas package is directly under 'packages/' and compiled to 'dist'
    // This might need adjustment based on actual monorepo linking (e.g., node_modules)
    this.schemasPackageDistPath = path.join(this.workspaceRoot, 'packages', 'schemas', 'dist');
    // 初期化情報をステータスバーに表示
    vscode.window.setStatusBarMessage(`Schema provider initialized: ${this.schemasPackageDistPath}`, 5000);
    // Load schemas asynchronously, don't block constructor
    this.loadSchemas().catch(() => {
        // エラーをキャッチするが使用しない
        vscode.window.showErrorMessage("Failed to initialize schemas");
        // Load placeholders as a fallback if initial dynamic load fails critically
        this.loadPlaceholderSchemas();
    });
  }

  /**
   * Dynamically loads Zod schemas from the compiled '@memory-bank/schemas' package.
   */
  private async loadSchemas(): Promise<void> {
    vscode.window.setStatusBarMessage('Loading schemas dynamically...', 3000);
    const loadedSchemas: SchemaMap = {}; // Load into a temporary map first
    const documentTypesDirUri = vscode.Uri.file(path.join(this.schemasPackageDistPath, 'document-types'));

    try {
      const entries = await vscode.workspace.fs.readDirectory(documentTypesDirUri);
      // デバッグ情報は削除

      const importPromises = entries
        .filter(([fileName, fileType]) => fileType === vscode.FileType.File && fileName.endsWith('.js'))
        .map(async ([fileName]) => {
          const modulePath = path.join(documentTypesDirUri.fsPath, fileName);
          const moduleUri = vscode.Uri.file(modulePath);
          
          try {
            // Use dynamic import. Ensure tsconfig allows this (module: NodeNext should work)
            const schemaModule = await import(moduleUri.fsPath);

            // Iterate over exports to find Zod schemas
            for (const exportName in schemaModule) {
              const exportedValue = schemaModule[exportName];
              // Check if the exported value is a Zod schema object
              if (exportedValue instanceof z.ZodSchema && exportedValue._def?.typeName === 'ZodObject') {
                 // Attempt to extract documentType literal from the schema definition
                 const shape = (exportedValue as z.ZodObject<z.ZodRawShape>).shape;
                 // Check if metadata and documentType exist and documentType is a ZodLiteral
                 if (shape?.metadata?._def?.typeName === 'ZodObject' && shape.metadata.shape?.documentType?._def?.typeName === 'ZodLiteral') {
                    const documentType = shape.metadata.shape.documentType._def.value;
                    if (typeof documentType === 'string') {
                        loadedSchemas[documentType] = exportedValue;
                        // デバッグ情報は削除
                    } else {
                        vscode.window.showWarningMessage(`Schema ${exportName} in ${fileName} has invalid documentType value`);
                    }
                 } else if (shape?.documentType?._def?.typeName === 'ZodLiteral') {
                    // Fallback for schemas where documentType might be directly in the root shape (like the discriminated union itself, though we load specifics here)
                    const documentType = shape.documentType._def.value;
                     if (typeof documentType === 'string') {
                        loadedSchemas[documentType] = exportedValue;
                        // デバッグ情報は削除
                    } else {
                        vscode.window.showWarningMessage(`Schema ${exportName} in ${fileName} has invalid documentType value (fallback)`);
                    }
                 }
                 else {
                    vscode.window.showWarningMessage(`Schema ${exportName} in ${fileName} has invalid structure`);
                 }
              }
            }
          } catch {
            // エラーをキャッチするが使用しない
            vscode.window.showErrorMessage(`Failed to load schema from ${fileName}`);
          }
        });

        await Promise.all(importPromises);

    } catch (readDirError) {
      // Handle case where directory might not exist (e.g., schemas not built)
      if (readDirError instanceof vscode.FileSystemError && readDirError.code === 'FileNotFound') {
          vscode.window.showWarningMessage(`Schemas directory not found. Please build the '@memory-bank/schemas' package.`);
      } else {
          vscode.window.showErrorMessage(`Failed to access schemas directory. Ensure '@memory-bank/schemas' is built.`);
      }
      // Fallback to placeholders if dynamic loading fails
      this.loadPlaceholderSchemas();
      return; // Exit early
    }

    // If dynamic loading succeeded, update the main schemas map
    if (Object.keys(loadedSchemas).length > 0) {
        this.schemas = loadedSchemas;
        vscode.window.setStatusBarMessage(`Schemas loaded: ${Object.keys(this.schemas).length}`, 3000);
    } else {
        vscode.window.showWarningMessage("No schemas were loaded dynamically. Using placeholders instead.");
        this.loadPlaceholderSchemas(); // Load placeholders if dynamic loading yielded nothing
    }
  }

  // Keep placeholder loading as a fallback or for testing
  private loadPlaceholderSchemas(): void {
      vscode.window.setStatusBarMessage("Loading placeholder schemas...", 2000);
      if (Object.keys(this.schemas).length > 0) {
          // デバッグコメントを削除
          return; // Avoid overwriting dynamically loaded schemas
      }
      try {
          // Define a basic metadata structure for placeholders
          const placeholderMetadata = z.object({
              id: z.string().uuid().optional(), // Make optional for flexibility in placeholders
              title: z.string().optional(),
              documentType: z.string(), // Keep this required to identify
              path: z.string().optional(),
              tags: z.array(z.string()).optional(),
              lastModified: z.string().datetime().optional(),
              createdAt: z.string().datetime().optional(),
              version: z.number().int().optional(),
          });

          // Placeholder for the base structure
          const basePlaceholder = z.object({
              schema: z.literal('memory_document_v2'),
              metadata: placeholderMetadata,
              content: z.unknown(),
          }).passthrough(); // Use passthrough for flexibility in placeholders

          // Placeholder for 'progress'
          const progressPlaceholder = basePlaceholder.extend({
              metadata: placeholderMetadata.extend({ documentType: z.literal('progress') }),
              content: z.object({
                  workingFeatures: z.array(z.object({ id: z.string(), description: z.string() })).optional(),
                  pendingImplementation: z.array(z.object({ id: z.string(), description: z.string(), priority: z.string() })).optional(),
                  status: z.string().optional(),
                  completionPercentage: z.number().min(0).max(100).optional(),
                  knownIssues: z.array(z.object({ id: z.string(), description: z.string() })).optional(),
              }).passthrough(), // Allow extra fields in content too
          });
          this.schemas['progress'] = progressPlaceholder;
          // デバッグコメントを削除

          // Add more placeholders if needed, e.g., for branch_context
           const branchContextPlaceholder = basePlaceholder.extend({
              metadata: placeholderMetadata.extend({ documentType: z.literal('branch_context') }),
              content: z.object({
                  branchName: z.string().optional(),
                  purpose: z.string().optional(),
                  createdAt: z.string().datetime().optional(),
                  userStories: z.array(z.object({ id: z.string(), description: z.string(), completed: z.boolean(), priority: z.number() })).optional(),
                  additionalNotes: z.string().optional(),
              }).passthrough(),
          });
          this.schemas['branch_context'] = branchContextPlaceholder;
          // デバッグコメントを削除

      } catch {
          // エラーをキャッチするが使用しない
          vscode.window.showErrorMessage("Error creating placeholder schemas");
      }
      vscode.window.setStatusBarMessage(`Placeholder schemas loaded: ${Object.keys(this.schemas).length}`, 3000);
  }


  /**
   * Retrieves a specific schema by its documentType identifier.
   * @param schemaId The documentType identifier for the schema.
   * @returns The Zod schema object, or undefined if not found.
   */
  public getSchema(schemaId: string): z.ZodSchema<unknown> | undefined {
    // Use documentType as the key
    return this.schemas[schemaId];
    // Consider if a fallback to a generic or base schema is needed if not found.
    // For example: return this.schemas[schemaId] ?? this.schemas['generic'];
  }

  /**
   * Validates a document object against a specific schema based on its documentType.
   * @param document The document object to validate (must have metadata.documentType).
   * @returns A ZodSafeParseReturnType indicating success or failure with errors.
   */
   public validateDocument(document: unknown): z.SafeParseReturnType<unknown, unknown> {
    // Basic check to see if it's an object with metadata and documentType
    if (typeof document !== 'object' || document === null || !('metadata' in document) || typeof document.metadata !== 'object' || document.metadata === null || !('documentType' in document.metadata) || typeof document.metadata.documentType !== 'string') {
        // Try to parse as base document first to get better error messages if structure is wrong
        const baseParse = z.object({ metadata: z.object({ documentType: z.string() }).passthrough() }).passthrough().safeParse(document);
        if (!baseParse.success) {
            return { success: false, error: baseParse.error };
        }
        // If base structure is okay but documentType is missing/invalid
        return { success: false, error: new z.ZodError([{ code: z.ZodIssueCode.custom, message: 'Invalid document structure: Missing or invalid metadata.documentType', path: ['metadata', 'documentType'] }]) };
    }

    const documentType = document.metadata.documentType;
    const schema = this.getSchema(documentType);

    if (!schema) {
      vscode.window.showWarningMessage(`Schema not found for documentType: '${documentType}'`);
      // Return a specific error structure indicating schema not found
      return { success: false, error: new z.ZodError([{ code: z.ZodIssueCode.custom, message: `Schema definition not found for documentType: '${documentType}'`, path: ['metadata', 'documentType'] }]) };
    }

    // デバッグコメントを削除
    
    // Use safeParse for detailed error reporting
    const result = schema.safeParse(document);
    if (!result.success) {
        vscode.window.showWarningMessage(`Document validation failed for '${documentType}'`);
    }
    return result;
  }

  // Add a method to get all loaded schema IDs (document types)
  public getAvailableSchemaIds(): string[] {
    return Object.keys(this.schemas);
  }

  // Force reload schemas (e.g., after building schemas package)
  public async reloadSchemas(): Promise<void> {
      vscode.window.setStatusBarMessage("Reloading schemas...", 2000);
      await this.loadSchemas();
  }
}
