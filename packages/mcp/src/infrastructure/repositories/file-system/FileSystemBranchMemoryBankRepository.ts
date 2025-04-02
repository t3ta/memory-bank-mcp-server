import path from "path";
import fs from "fs/promises";
import fsExtra from "fs-extra"; // Import fs-extra
import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import { Tag } from "../../../domain/entities/Tag.js"; // Changed from import type
import type { IBranchMemoryBankRepository, RecentBranch } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import { logger } from "../../../shared/utils/logger.js";
import { DomainError } from "../../../shared/errors/DomainError.js"; // Removed DomainErrorCodes, Added DomainErrors
// Import both the class and the enum/namespace
import { InfrastructureError, InfrastructureErrorCodes, InfrastructureErrors } from "../../../shared/errors/InfrastructureError.js";
import type { BranchTagIndex as TagIndex } from "@memory-bank/schemas";


/**
 * Simple file system implementation of branch memory bank repository for testing
 */
export class FileSystemBranchMemoryBankRepository implements IBranchMemoryBankRepository {
  private readonly branchMemoryBankPath: string;
  private readonly componentLogger = logger.withContext({ component: 'FileSystemBranchMemoryBankRepository' });

  /**
   * Constructor
   * @param rootPath Root path for the memory bank
   */
  constructor(rootPath: string) {
    this.branchMemoryBankPath = path.join(rootPath, 'branch-memory-bank');
  }

  // Add resolvePath method for consistent path handling and logging
  private resolvePath(documentPath: string): string {
    const normalizedPath = path.normalize(documentPath);
    if (normalizedPath.includes('..')) {
      // Use a generic file system error for path traversal attempts
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Invalid document path: ${documentPath}. Path traversal attempt detected.`
      );
    }
    const fullPath = path.join(this.branchMemoryBankPath, normalizedPath);
    // this.componentLogger.debug(`[FSBranchRepo] Resolved path: ${fullPath} from documentPath: ${documentPath}`); // Remove log
    return fullPath;
  }


  /**
   * Check if branch exists
   * @param branchName Branch name
   * @returns Promise resolving to boolean indicating if branch exists
   */
  async exists(branchName: string): Promise<boolean> {
    try {
      const branchPath = path.join(this.branchMemoryBankPath, branchName);
      this.componentLogger.debug('Checking if branch exists:', { operation: 'exists', branchPath });
      await fs.access(branchPath);
      this.componentLogger.debug('Branch exists:', { operation: 'exists', branchPath });
      return true;
    } catch (err) {
      this.componentLogger.debug('Branch does not exist:', {
        operation: 'exists',
        branchName,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Initialize branch memory bank
   * @param branchInfo Branch information
   * @returns Promise resolving when initialization is complete
   */
  async initialize(branchInfo: BranchInfo): Promise<void> {
    const safeBranchName = branchInfo.safeName;
    const branchPath = path.join(this.branchMemoryBankPath, safeBranchName);

    this.componentLogger.debug('Initializing branch memory bank:', {
      operation: 'initialize',
      originalName: branchInfo.name,
      safeName: safeBranchName,
      branchPath
    });

    try {
      // Create directory
      await fs.mkdir(branchPath, { recursive: true });
      this.componentLogger.debug('Successfully created branch directory:', { operation: 'initialize', branchPath });

      // Create default branchContext.json
      const defaultContextPath = path.join(branchPath, 'branchContext.json');
      const defaultContextContent = {
        schema: 'memory_document_v2',
        metadata: {
          id: `${safeBranchName}-context`,
          documentType: 'branch_context',
          path: 'branchContext.json',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
        content: {
          value: `Auto-initialized context for branch ${branchInfo.name}`
        }
      };
      // Use fsExtra.outputJson for atomic write and directory creation safety (though dir exists)
      await fsExtra.outputJson(defaultContextPath, defaultContextContent, { spaces: 2 });
      this.componentLogger.debug('Successfully created default branchContext.json:', { operation: 'initialize', path: defaultContextPath });

    } catch (error) {
      this.componentLogger.error('Failed to initialize branch memory bank:', {
        operation: 'initialize',
        error: error instanceof Error ? error.message : 'Unknown error',
        branchPath
      });
      throw InfrastructureErrors.initializationError(
        `Failed to initialize branch memory bank: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error instanceof Error ? error : undefined, branchPath }
      );
    }
  }

  /**
   * Get document from branch
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  async getDocument(branchInfo: BranchInfo, documentPath: DocumentPath): Promise<MemoryDocument | null> {
    // Use resolvePath for consistent path handling and logging
    const filePath = this.resolvePath(path.join(branchInfo.safeName, documentPath.value));
    // this.componentLogger.debug('Trying to read file:', { operation: 'getDocument', filePath }); // Logging is now in resolvePath

    // Special handling for .md requests (prefer .json)
    if (documentPath.value.endsWith('.md')) {
      const jsonPath = documentPath.value.replace('.md', '.json');
      // Use resolvePath for the JSON variant as well
      const jsonFilePath = this.resolvePath(path.join(branchInfo.safeName, jsonPath));
      // this.componentLogger.debug('Also trying JSON variant:', { operation: 'getDocument', jsonFilePath }); // Logging is now in resolvePath

      try {
        // Try .json file first
        const content = await fs.readFile(jsonFilePath, 'utf-8');
        this.componentLogger.debug('Successfully read JSON file:', { operation: 'getDocument', path: jsonFilePath });
        // --- Parse JSON and extract tags ---
        const jsonData = JSON.parse(content);
        const tags = (jsonData.metadata?.tags ?? []).map((tagStr: string) => Tag.create(tagStr));
        // --- End of tag extraction ---
        return MemoryDocument.create({
          path: documentPath, // Keep the original .md path
          content,
          tags: tags, // Use extracted tags
          lastModified: jsonData.metadata?.lastModified ? new Date(jsonData.metadata.lastModified) : new Date() // Use metadata date or current date
        });
      } catch {
        // If .json not found, try .md
        this.componentLogger.debug('JSON file not found, trying MD:', { operation: 'getDocument', path: filePath });
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          this.componentLogger.debug('Successfully read MD file:', { operation: 'getDocument', path: filePath });
          // --- For MD files, tags are not stored in the file itself, assume empty ---
          // (If MD could contain frontmatter with tags, parsing logic would go here)
          return MemoryDocument.create({
            path: documentPath,
            content,
            tags: [], // MD files don't have structured tags in this implementation
            lastModified: new Date() // Use file system mtime for MD? Or keep simple? Let's keep simple for now.
          });
        } catch (err) {
          this.componentLogger.debug('MD file not found either:', {
            operation: 'getDocument',
            path: filePath,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
          return null;
        }
      }
    }

    // Normal read process (JSON or other types)
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath); // Get file stats for lastModified

      if (documentPath.isJSON) {
        // --- Try parsing as JSON ---
        try {
          const jsonData = JSON.parse(content);
          const tags = (jsonData.metadata?.tags ?? []).map((tagStr: string) => Tag.create(tagStr));
          return MemoryDocument.create({
            path: documentPath,
            content,
            tags: tags,
            lastModified: jsonData.metadata?.lastModified ? new Date(jsonData.metadata.lastModified) : stats.mtime // Prefer metadata date, fallback to file mtime
          });
        } catch (parseError) {
          // If JSON parsing fails for a .json file, log a warning but treat as plain text for now? Or return null?
          // Let's return null for corrupted JSON files to avoid unexpected behavior.
          this.componentLogger.warn(`Failed to parse JSON content for ${filePath}, returning null.`, { error: parseError });
          return null;
        }
      } else {
        // --- Treat as Plain Text ---
        this.componentLogger.debug('Reading non-JSON file as plain text:', { operation: 'getDocument', path: filePath });
        return MemoryDocument.create({
          path: documentPath,
          content,
          tags: [], // Plain text files have no embedded tags in this implementation
          lastModified: stats.mtime // Use file modification time
        });
      }
    } catch (err) {
      // Handle file read errors (e.g., file not found)
      this.componentLogger.debug('Failed to read file:', {
        operation: 'getDocument',
        path: filePath,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Save document to branch
   * @param branchInfo Branch information
   * @param document Document to save
   * @returns Promise resolving when done
   */
  async saveDocument(branchInfo: BranchInfo, document: MemoryDocument): Promise<void> {
    const safeBranchName = branchInfo.safeName; // Re-add safeBranchName
    // Use resolvePath for consistent path handling and logging
    const filePath = this.resolvePath(path.join(safeBranchName, document.path.value));
    const branchPath = path.dirname(filePath); // Get branch path from resolved file path

    this.componentLogger.debug('Saving document:', {
      operation: 'saveDocument',
      originalBranchName: branchInfo.name,
      safeBranchName,
      documentPath: document.path.value,
      branchPath,
      filePath,
      contentLength: document.content.length,
      contentPreview: document.content.substring(0, 50) + '...'
    });

    try {
      // Separate directory check and JSON validation for clearer error reporting
      try {
        await fs.access(branchPath);
        this.componentLogger.debug('Branch directory exists:', { operation: 'saveDocument', branchPath });
      } catch (err) {
        this.componentLogger.debug('Creating branch directory:', { operation: 'saveDocument', branchPath });
        await fs.mkdir(branchPath, { recursive: true });
        this.componentLogger.debug('Branch directory created:', { operation: 'saveDocument', branchPath });
      }

      // Try to parse as JSON, but allow plain text
      let isJson = false;
      let jsonData: any = null;
      try {
        jsonData = JSON.parse(document.content);
        isJson = true;
        this.componentLogger.debug('Document content is valid JSON.', {
          operation: 'saveDocument',
          path: document.path.value,
          schema: jsonData.schema,
          documentType: jsonData.metadata?.documentType
        });
      } catch (err) {
        // Not JSON, treat as plain text
        isJson = false;
        this.componentLogger.debug('Document content is not JSON, treating as plain text.', {
          operation: 'saveDocument',
          path: document.path.value,
          error: err instanceof Error ? err.message : 'Unknown parse error'
        });
      }

      if (isJson) {
        // --- Save as JSON ---
        this.componentLogger.debug('Writing JSON file using fsExtra.outputJson:', { operation: 'saveDocument', filePath });
        // Add tags to metadata before saving
        if (!jsonData.metadata) {
          jsonData.metadata = {}; // Ensure metadata object exists
        }
        jsonData.metadata.tags = document.tags.map(tag => tag.value); // Add tags here!
        jsonData.metadata.lastModified = document.lastModified.toISOString(); // Update lastModified
        await fsExtra.outputJson(filePath, jsonData, { spaces: 2 });
        this.componentLogger.debug('Successfully wrote JSON file:', { operation: 'saveDocument', filePath });
      } else {
        // --- Save as Plain Text ---
        this.componentLogger.debug('Writing plain text file using fs.writeFile:', { operation: 'saveDocument', filePath });
        await fs.writeFile(filePath, document.content, 'utf-8');
        this.componentLogger.debug('Successfully wrote plain text file:', { operation: 'saveDocument', filePath });
        // Note: Tags are not saved within the plain text file itself.
        // Tag association would need to be handled by the index if required for plain text.
      }

      // // Test support: If a .json file is created, also create an .md file with the same content
      // // This might be unnecessary now if only JSON is expected
      // if (document.path.value.endsWith('.json')) {
      //   const mdPath = document.path.value.replace('.json', '.md');
      //   const mdFilePath = path.join(branchPath, mdPath);
      //   this.componentLogger.debug('Creating MD version:', { operation: 'saveDocument', path: mdFilePath });
      //   await fs.writeFile(mdFilePath, document.content, 'utf-8'); // Use standard writeFile for MD
      //   this.componentLogger.debug('Successfully wrote MD version:', { operation: 'saveDocument', path: mdFilePath });
      // }

      // Special handling for branchContext (manual handling as it's not in CreateUseCase)
      if (document.path.value === 'activeContext.json' ||
        document.path.value === 'progress.json' ||
        document.path.value === 'systemPatterns.json') {

        // Create branchContext.md for testing if it doesn't exist
        // // Create branchContext.md for testing if it doesn't exist
        // // This might be unnecessary now if only JSON is expected
        // if (!await this.fileExists(path.join(branchPath, 'branchContext.md'))) {
        //   const branchContext = `# Test Branch Context\n\n## Purpose\n\nThis is a test branch.`;
        //   const branchContextPath = path.join(branchPath, 'branchContext.md');
        //   this.componentLogger.debug('Creating default branchContext.md:', { operation: 'saveDocument', path: branchContextPath });
        //   await fs.writeFile(branchContextPath, branchContext, 'utf-8'); // Use standard writeFile
        //   this.componentLogger.debug('Successfully wrote default branchContext.md:', { operation: 'saveDocument', path: branchContextPath });
        // }
      }

    } catch (error) {
      // Detailed error context - Log the raw error object as well
      const errorContext = {
        rawError: error, // Log the original error object
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          code: error instanceof Error && error instanceof DomainError ? error.code : undefined,
          // Add code for non-DomainErrors if available
          errorCode: !(error instanceof DomainError) && error && typeof error === 'object' && 'code' in error ? error.code : undefined
        },
        document: {
          path: document.path.value,
          contentLength: document.content.length,
          isJSON: document.path.value.endsWith('.json')
        },
        branch: {
          name: branchInfo.name,
          safeName: safeBranchName,
          path: branchPath
        },
        filesystem: {
          targetPath: filePath
        }
      };

      this.componentLogger.error('Failed to save document:', { operation: 'saveDocument', ...errorContext });

      // If the error is already a DomainError (e.g., validation error), re-throw it directly
      if (error instanceof DomainError) {
        throw error;
      }

      // Otherwise, wrap it as an InfrastructureError
      throw InfrastructureErrors.fileWriteError(
        `Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error instanceof Error ? error : undefined, path: document.path.value }
      );
    }
  }

  /**
   * Delete document from branch
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns Promise resolving to boolean indicating success
   */
  async deleteDocument(branchInfo: BranchInfo, documentPath: DocumentPath): Promise<boolean> {
    // Use resolvePath for consistent path handling and logging
    const filePath = this.resolvePath(path.join(branchInfo.safeName, documentPath.value));

    try {
      // Use fs-extra's remove for potentially better handling (though unlink is fine)
      await fsExtra.remove(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all documents in branch
   * @param branchInfo Branch information
   * @returns Promise resolving to array of document paths
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    const safeBranchName = branchInfo.safeName;
    const branchPath = path.join(this.branchMemoryBankPath, safeBranchName);
    // this.componentLogger.debug(`[FSBranchRepo] Listing documents in branchPath: ${branchPath}`); // Remove log

    try {
      const files = await fs.readdir(branchPath);
      return files
        .filter(file => !file.startsWith('.') && !file.startsWith('_'))
        .map(file => DocumentPath.create(file));
    } catch (error) {
      // Log the error if reading directory fails
      this.componentLogger.error('Failed to list documents in branch:', {
        operation: 'listDocuments',
        branchName: branchInfo.name,
        branchPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return []; // Return empty array as before, but after logging
    }
  }

  /**
   * Find documents by tags in branch
   * @param branchInfo Branch information
   * @param _tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  async findDocumentsByTags(branchInfo: BranchInfo, _tags: Tag[]): Promise<MemoryDocument[]> {
    const documents: MemoryDocument[] = [];
    const paths = await this.listDocuments(branchInfo);

    for (const path of paths) {
      const doc = await this.getDocument(branchInfo, path);
      if (doc) {
        documents.push(doc);
      }
    }
    return documents;
  }

  /**
   * Get recent branches
   * @param limit Maximum number of branches to return
   * @returns Promise resolving to array of recent branches
   */
  async getRecentBranches(limit?: number): Promise<RecentBranch[]> {
    try {
      const entries = await fs.readdir(this.branchMemoryBankPath);
      const branches: RecentBranch[] = [];

      for (const entry of entries) {
        try {
          const branchInfo = BranchInfo.create(entry);
          const stats = await fs.stat(path.join(this.branchMemoryBankPath, entry));

          branches.push({
            branchInfo,
            lastModified: stats.mtime,
            summary: {}
          } as RecentBranch);
        } catch {
          // Skip invalid branches
        }
      }

      branches.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      return branches.slice(0, limit || 10);
    } catch {
      return [];
    }
  }

  /**
   * Validate branch structure
   * @param branchInfo Branch information
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  async validateStructure(branchInfo: BranchInfo): Promise<boolean> {
    const safeBranchName = branchInfo.safeName;
    this.componentLogger.debug('Validating branch structure:', {
      operation: 'validateStructure',
      originalName: branchInfo.name,
      safeName: safeBranchName
    });
    return this.exists(safeBranchName);
  }

  /**
   * Save tag index for branch
   * @param branchInfo Branch information
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveTagIndex(branchInfo: BranchInfo, tagIndex: TagIndex): Promise<void> {
    const safeBranchName = branchInfo.safeName;
    const indexPath = path.join(this.branchMemoryBankPath, safeBranchName, '_index.json');

    try {
      await fs.writeFile(indexPath, JSON.stringify(tagIndex, null, 2), 'utf-8');
    } catch (error) {
      throw InfrastructureErrors.fileWriteError(
        `Failed to save tag index: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error instanceof Error ? error : undefined, path: indexPath }
      );
    }
  }

  /**
   * Get tag index for branch
   * @param branchInfo Branch information
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getTagIndex(branchInfo: BranchInfo): Promise<TagIndex | null> {
    const safeBranchName = branchInfo.safeName;
    const indexPath = path.join(this.branchMemoryBankPath, safeBranchName, '_index.json');

    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(content) as TagIndex;
    } catch {
      return null;
    }
  }

  /**
   * Find documents by tags in branch using index
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param _matchAll If true, documents must have all tags (AND), otherwise any tag (OR)
   * @returns Promise resolving to array of document paths
   */
  async findDocumentPathsByTagsUsingIndex(params: {
    branchInfo: BranchInfo;
    tags: Tag[];
    matchAll?: boolean;
  }): Promise<DocumentPath[]> {
    const { branchInfo, tags } = params;
    const docs = await this.findDocumentsByTags(branchInfo, tags);
    return docs.map(doc => doc.path);
  }
}
