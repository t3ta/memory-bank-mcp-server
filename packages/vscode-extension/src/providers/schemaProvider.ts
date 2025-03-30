import * as vscode from 'vscode';
import * as path from 'path';
import { z } from 'zod';

type SchemaMap = { [key: string]: z.ZodSchema<any> };

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
    console.log(`SchemaProvider initialized. Expected schemas dist path: ${this.schemasPackageDistPath}`);
    // Load schemas asynchronously, don't block constructor
    this.loadSchemas().catch(err => {
        console.error("Failed to initialize schemas:", err);
        // Load placeholders as a fallback if initial dynamic load fails critically
        this.loadPlaceholderSchemas();
    });
  }

  /**
   * Dynamically loads Zod schemas from the compiled '@memory-bank/schemas' package.
   */
  private async loadSchemas(): Promise<void> {
    console.log('Attempting to load schemas dynamically...');
    const loadedSchemas: SchemaMap = {}; // Load into a temporary map first
    const documentTypesDirUri = vscode.Uri.file(path.join(this.schemasPackageDistPath, 'document-types'));

    try {
      const entries = await vscode.workspace.fs.readDirectory(documentTypesDirUri);
      console.log(`Found entries in ${documentTypesDirUri.fsPath}:`, entries.map(e => e[0]));

      const importPromises = entries
        .filter(([fileName, fileType]) => fileType === vscode.FileType.File && fileName.endsWith('.js'))
        .map(async ([fileName]) => {
          const modulePath = path.join(documentTypesDirUri.fsPath, fileName);
          const moduleUri = vscode.Uri.file(modulePath);
          console.log(`Attempting to import schema module: ${moduleUri.fsPath}`);
          try {
            // Use dynamic import. Ensure tsconfig allows this (module: NodeNext should work)
            const schemaModule = await import(moduleUri.fsPath);

            // Iterate over exports to find Zod schemas
            for (const exportName in schemaModule) {
              const exportedValue = schemaModule[exportName];
              // Check if the exported value is a Zod schema object
              if (exportedValue instanceof z.ZodSchema && exportedValue._def?.typeName === 'ZodObject') {
                 // Attempt to extract documentType literal from the schema definition
                 const shape = (exportedValue as z.ZodObject<any>).shape;
                 // Check if metadata and documentType exist and documentType is a ZodLiteral
                 if (shape?.metadata?._def?.typeName === 'ZodObject' && shape.metadata.shape?.documentType?._def?.typeName === 'ZodLiteral') {
                    const documentType = shape.metadata.shape.documentType._def.value;
                    if (typeof documentType === 'string') {
                        loadedSchemas[documentType] = exportedValue;
                        console.log(`Loaded schema: ${documentType} from ${fileName}`);
                    } else {
                         console.warn(`Found schema ${exportName} in ${fileName}, but documentType literal value is not a string.`);
                    }
                 } else if (shape?.documentType?._def?.typeName === 'ZodLiteral') {
                    // Fallback for schemas where documentType might be directly in the root shape (like the discriminated union itself, though we load specifics here)
                    const documentType = shape.documentType._def.value;
                     if (typeof documentType === 'string') {
                        loadedSchemas[documentType] = exportedValue;
                        console.log(`Loaded schema (fallback check): ${documentType} from ${fileName}`);
                    } else {
                         console.warn(`Found schema ${exportName} in ${fileName}, but documentType literal value (fallback) is not a string.`);
                    }
                 }
                 else {
                    console.warn(`Found schema ${exportName} in ${fileName}, but couldn't extract documentType literal from metadata. Skipping.`);
                 }
              }
            }
          } catch (importError) {
            console.error(`Failed to import schema module ${moduleUri.fsPath}:`, importError);
            vscode.window.showWarningMessage(`Failed to load schema from ${fileName}. See console for details.`);
          }
        });

        await Promise.all(importPromises);

    } catch (readDirError) {
      // Handle case where directory might not exist (e.g., schemas not built)
      if (readDirError instanceof vscode.FileSystemError && readDirError.code === 'FileNotFound') {
          console.warn(`Schemas directory not found: ${documentTypesDirUri.fsPath}. Schemas package might not be built.`);
          vscode.window.showWarningMessage(`Schemas directory not found. Please build the '@memory-bank/schemas' package.`);
      } else {
          console.error(`Failed to read schemas directory ${documentTypesDirUri.fsPath}:`, readDirError);
          vscode.window.showErrorMessage(`Failed to access schemas directory. Ensure '@memory-bank/schemas' is built.`);
      }
      // Fallback to placeholders if dynamic loading fails
      this.loadPlaceholderSchemas();
      return; // Exit early
    }

    // If dynamic loading succeeded, update the main schemas map
    if (Object.keys(loadedSchemas).length > 0) {
        this.schemas = loadedSchemas;
        console.log(`Schema loading finished. ${Object.keys(this.schemas).length} schemas loaded dynamically.`);
    } else {
        console.warn("No schemas were loaded dynamically. Falling back to placeholders.");
        this.loadPlaceholderSchemas(); // Load placeholders if dynamic loading yielded nothing
    }
  }

  // Keep placeholder loading as a fallback or for testing
  private loadPlaceholderSchemas(): void {
      console.log("Loading placeholder schemas as fallback...");
      if (Object.keys(this.schemas).length > 0) {
          console.log("Dynamic schemas already loaded, skipping placeholders.");
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
              content: z.any(),
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
          console.log('Loaded placeholder schema: progress');

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
          console.log('Loaded placeholder schema: branch_context');


      } catch (error) {
          console.error("Error loading placeholder schemas:", error);
      }
      console.log(`Placeholder loading finished. ${Object.keys(this.schemas).length} placeholder schemas loaded.`);
  }


  /**
   * Retrieves a specific schema by its documentType identifier.
   * @param schemaId The documentType identifier for the schema.
   * @returns The Zod schema object, or undefined if not found.
   */
  public getSchema(schemaId: string): z.ZodSchema<any> | undefined {
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
   public validateDocument(document: unknown): z.SafeParseReturnType<any, any> {
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
      console.warn(`Schema not found for documentType: ${documentType}. Cannot validate.`);
      // Return a specific error structure indicating schema not found
      return { success: false, error: new z.ZodError([{ code: z.ZodIssueCode.custom, message: `Schema definition not found for documentType: '${documentType}'`, path: ['metadata', 'documentType'] }]) };
    }

    console.log(`Validating document with documentType '${documentType}' against its schema.`);
    // Use safeParse for detailed error reporting
    const result = schema.safeParse(document);
    if (!result.success) {
        console.warn(`Validation failed for documentType '${documentType}':`, result.error.errors);
    }
    return result;
  }

  // Add a method to get all loaded schema IDs (document types)
  public getAvailableSchemaIds(): string[] {
    return Object.keys(this.schemas);
  }

  // Force reload schemas (e.g., after building schemas package)
  public async reloadSchemas(): Promise<void> {
      console.log("Reloading schemas...");
      await this.loadSchemas();
  }
}
