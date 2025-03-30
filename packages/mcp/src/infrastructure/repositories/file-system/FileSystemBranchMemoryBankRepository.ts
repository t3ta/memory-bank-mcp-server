import path from "path";
import fs from "fs/promises";
import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import type { Tag } from "../../../domain/entities/Tag.js";
import type { IBranchMemoryBankRepository, RecentBranch } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import { logger } from "../../../shared/utils/logger.js";
import { DomainError, DomainErrors } from "../../../shared/errors/DomainError.js"; // Removed DomainErrorCodes, Added DomainErrors
import { InfrastructureErrors } from "../../../shared/errors/InfrastructureError.js"; // Added InfrastructureErrors
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
      await fs.mkdir(branchPath, { recursive: true });
      this.componentLogger.debug('Successfully created branch directory:', { operation: 'initialize', branchPath });
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
    const safeBranchName = branchInfo.safeName;
    const filePath = path.join(this.branchMemoryBankPath, safeBranchName, documentPath.value);

    this.componentLogger.debug('Trying to read file:', { operation: 'getDocument', filePath });

    // Special handling for .md requests (prefer .json)
    if (documentPath.value.endsWith('.md')) {
      const jsonPath = documentPath.value.replace('.md', '.json');
      const jsonFilePath = path.join(this.branchMemoryBankPath, safeBranchName, jsonPath);

      this.componentLogger.debug('Also trying JSON variant:', { operation: 'getDocument', jsonFilePath });

      try {
        // Try .json file first
        const content = await fs.readFile(jsonFilePath, 'utf-8');
        this.componentLogger.debug('Successfully read JSON file:', { operation: 'getDocument', path: jsonFilePath });
        return MemoryDocument.create({
          path: documentPath, // Keep the original .md path
          content,
          tags: [],
          lastModified: new Date()
        });
      } catch {
        // If .json not found, try .md
        this.componentLogger.debug('JSON file not found, trying MD:', { operation: 'getDocument', path: filePath });
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          this.componentLogger.debug('Successfully read MD file:', { operation: 'getDocument', path: filePath });
          return MemoryDocument.create({
            path: documentPath,
            content,
            tags: [],
            lastModified: new Date()
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

    // Normal read process
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return MemoryDocument.create({
        path: documentPath,
        content,
        tags: [],
        lastModified: new Date()
      });
    } catch {
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
    const safeBranchName = branchInfo.safeName;
    const branchPath = path.join(this.branchMemoryBankPath, safeBranchName);
    const filePath = path.join(branchPath, document.path.value);

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

      // Validate JSON
      try {
        const parsedContent = JSON.parse(document.content);
        this.componentLogger.debug('Document content validated as JSON:', {
          operation: 'saveDocument',
          schema: parsedContent.schema,
          documentType: parsedContent.metadata?.documentType
        });
      } catch (err) {
        this.componentLogger.error('Invalid JSON content:', {
          operation: 'saveDocument',
          error: err instanceof Error ? err.message : 'Unknown error',
          content: document.content.substring(0, 100) + '...' // Log only first 100 chars
        });
        throw DomainErrors.validationError(
          'Document content is not valid JSON',
          { cause: err instanceof Error ? err : undefined, path: document.path.value }
        );
      }

      // Write file
      this.componentLogger.debug('Writing file:', { operation: 'saveDocument', filePath });
      await fs.writeFile(filePath, document.content, 'utf-8');
      this.componentLogger.debug('Successfully wrote file:', { operation: 'saveDocument', filePath });

      // Test support: If a .json file is created, also create an .md file with the same content
      if (document.path.value.endsWith('.json')) {
        const mdPath = document.path.value.replace('.json', '.md');
        const mdFilePath = path.join(branchPath, mdPath);
        this.componentLogger.debug('Creating MD version:', { operation: 'saveDocument', path: mdFilePath });
        await fs.writeFile(mdFilePath, document.content, 'utf-8');
        this.componentLogger.debug('Successfully wrote MD version:', { operation: 'saveDocument', path: mdFilePath });
      }

      // Special handling for branchContext (manual handling as it's not in CreateUseCase)
      if (document.path.value === 'activeContext.json' ||
        document.path.value === 'progress.json' ||
        document.path.value === 'systemPatterns.json') {

        // Create branchContext.md for testing if it doesn't exist
        if (!await this.fileExists(path.join(branchPath, 'branchContext.md'))) {
          const branchContext = `# Test Branch Context\n\n## Purpose\n\nThis is a test branch.`;
          const branchContextPath = path.join(branchPath, 'branchContext.md');
          this.componentLogger.debug('Creating default branchContext.md:', { operation: 'saveDocument', path: branchContextPath });
          await fs.writeFile(branchContextPath, branchContext, 'utf-8');
          this.componentLogger.debug('Successfully wrote default branchContext.md:', { operation: 'saveDocument', path: branchContextPath });
        }
      }

    } catch (error) {
      // Detailed error context
      const errorContext = {
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          code: error instanceof Error && error instanceof DomainError ? error.code : undefined
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
      throw InfrastructureErrors.fileWriteError(
        `Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error instanceof Error ? error : undefined, path: document.path.value }
      );
    }
  }

  /**
   * Check if file exists
   * @param filePath File path
   * @returns true if exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      this.componentLogger.debug('File exists:', { operation: 'fileExists', filePath });
      return true;
    } catch {
      this.componentLogger.debug('File does not exist:', { operation: 'fileExists', filePath });
      return false;
    }
  }

  /**
   * Delete document from branch
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns Promise resolving to boolean indicating success
   */
  async deleteDocument(branchInfo: BranchInfo, documentPath: DocumentPath): Promise<boolean> {
    const safeBranchName = branchInfo.safeName;
    const filePath = path.join(this.branchMemoryBankPath, safeBranchName, documentPath.value);

    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all documents in branch
   * @param branchInfo Branch information
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    const safeBranchName = branchInfo.safeName;
    const branchPath = path.join(this.branchMemoryBankPath, safeBranchName);

    try {
      const files = await fs.readdir(branchPath);
      return files
        .filter(file => !file.startsWith('.') && !file.startsWith('_'))
        .map(file => DocumentPath.create(file));
    } catch {
      return [];
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
