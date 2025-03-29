import path from "path";
import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import type { Tag } from "../../../domain/entities/Tag.js";
import type { IBranchMemoryBankRepository, RecentBranch } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import type { BranchTagIndex } from "@memory-bank/schemas"; // ★ BaseTagIndex から BranchTagIndex に変更

import { DomainError } from "../../../shared/errors/DomainError.js"; // Corrected import
import { InfrastructureError, InfrastructureErrorCodes } from "../../../shared/errors/InfrastructureError.js";
import { extractSectionContent } from "../../../shared/utils/index.js";
import { logger } from "../../../shared/utils/logger.js";
import type { IConfigProvider } from "../../config/index.js";
import type { IFileSystemService } from "../../storage/interfaces/IFileSystemService.js";
import { FileSystemMemoryDocumentRepository } from "./FileSystemMemoryDocumentRepository.js";
import { InfrastructureErrors } from "../../../shared/errors/InfrastructureError.js"; // Import factory


/**
 * File system implementation of branch memory bank repository
 */
export class FileSystemBranchMemoryBankRepository implements IBranchMemoryBankRepository {
  private readonly componentLogger = logger.withContext({ component: 'FileSystemBranchMemoryBankRepository' }); // Add component logger
  private readonly branchMemoryBankPath: string;
  private readonly coreDocuments = [
    'branchContext.json',
    'activeContext.json',
    'systemPatterns.json',
    'progress.json',
  ];
  private readonly defaultTemplates: Record<string, string | ((branchName: string) => string)> = {
    'branchContext.json': (branchName: string) => {
      const now = new Date();
      return JSON.stringify(
        {
          schema: 'memory_document_v2',
          metadata: {
            id: this.generateUUID(),
            title: 'ブランチコンテキスト',
            documentType: 'branch_context',
            path: 'branchContext.json',
            tags: ['branch-context'],
            lastModified: now.toISOString(),
            createdAt: now.toISOString(),
            version: 1,
          },
          content: {
            branchName: branchName,
            purpose: 'このブランチの目的を記述してください',
            createdAt: now.toISOString(),
            userStories: [
              {
                id: this.generateUUID(),
                description: '解決する課題1',
                completed: false,
                priority: 1,
              },
              {
                id: this.generateUUID(),
                description: '解決する課題2',
                completed: false,
                priority: 2,
              },
              {
                id: this.generateUUID(),
                description: '解決する課題3',
                completed: false,
                priority: 3,
              },
            ],
            additionalNotes: '',
          },
        },
        null,
        2
      );
    },
    'activeContext.json': () => {
      const now = new Date();
      return JSON.stringify(
        {
          schema: 'memory_document_v2',
          metadata: {
            id: this.generateUUID(),
            title: 'アクティブコンテキスト',
            documentType: 'active_context',
            path: 'activeContext.json',
            tags: ['active-context'],
            lastModified: now.toISOString(),
            createdAt: now.toISOString(),
            version: 1,
          },
          content: {
            currentWork: '現在取り組んでいる作業の説明',
            recentChanges: [
              {
                date: now.toISOString(),
                description: '変更点1',
              },
              {
                date: now.toISOString(),
                description: '変更点2',
              },
              {
                date: now.toISOString(),
                description: '変更点3',
              },
            ],
            activeDecisions: [
              {
                id: this.generateUUID(),
                description: '決定事項1',
              },
              {
                id: this.generateUUID(),
                description: '決定事項2',
              },
              {
                id: this.generateUUID(),
                description: '決定事項3',
              },
            ],
            considerations: [
              {
                id: this.generateUUID(),
                description: '検討事項1',
                status: 'open',
              },
              {
                id: this.generateUUID(),
                description: '検討事項2',
                status: 'open',
              },
              {
                id: this.generateUUID(),
                description: '検討事項3',
                status: 'open',
              },
            ],
            nextSteps: [
              {
                id: this.generateUUID(),
                description: '次のステップ1',
                priority: 'high',
              },
              {
                id: this.generateUUID(),
                description: '次のステップ2',
                priority: 'medium',
              },
              {
                id: this.generateUUID(),
                description: '次のステップ3',
                priority: 'low',
              },
            ],
          },
        },
        null,
        2
      );
    },
    'systemPatterns.json': () => {
      const now = new Date();
      return JSON.stringify(
        {
          schema: 'memory_document_v2',
          metadata: {
            id: this.generateUUID(),
            title: 'システムパターン',
            documentType: 'system_patterns',
            path: 'systemPatterns.json',
            tags: ['system-patterns'],
            lastModified: now.toISOString(),
            createdAt: now.toISOString(),
            version: 1,
          },
          content: {
            technicalDecisions: [
              {
                id: this.generateUUID(),
                title: '決定事項のタイトル',
                context: '決定の背景や理由',
                decision: '具体的な決定内容',
                consequences: {
                  positive: ['影響1', '影響2', '影響3'],
                  negative: [],
                },
                status: 'proposed',
                date: now.toISOString(),
                alternatives: [],
              },
            ],
            implementationPatterns: [],
          },
        },
        null,
        2
      );
    },
    'progress.json': () => {
      const now = new Date();
      return JSON.stringify(
        {
          schema: 'memory_document_v2',
          metadata: {
            id: this.generateUUID(),
            title: '進捗状況',
            documentType: 'progress',
            path: 'progress.json',
            tags: ['progress'],
            lastModified: now.toISOString(),
            createdAt: now.toISOString(),
            version: 1,
          },
          content: {
            workingFeatures: [
              {
                id: this.generateUUID(),
                description: '機能1',
                implementedAt: now.toISOString(),
              },
              {
                id: this.generateUUID(),
                description: '機能2',
                implementedAt: now.toISOString(),
              },
              {
                id: this.generateUUID(),
                description: '機能3',
                implementedAt: now.toISOString(),
              },
            ],
            pendingImplementation: [
              {
                id: this.generateUUID(),
                description: '未実装の機能1',
                priority: 'high',
              },
              {
                id: this.generateUUID(),
                description: '未実装の機能2',
                priority: 'medium',
              },
              {
                id: this.generateUUID(),
                description: '未実装の機能3',
                priority: 'low',
              },
            ],
            status: '現在の実装状態の説明',
            completionPercentage: 0,
            knownIssues: [
              {
                id: this.generateUUID(),
                description: '問題1',
                severity: 'high',
              },
              {
                id: this.generateUUID(),
                description: '問題2',
                severity: 'medium',
              },
              {
                id: this.generateUUID(),
                description: '問題3',
                severity: 'low',
              },
            ],
          },
        },
        null,
        2
      );
    },
  };

  /**
   * Generate a UUID for document IDs
   * @returns UUID string
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Constructor
   * @param fileSystemService File system service
   * @param configProvider Configuration provider
   */
  constructor(
    private readonly fileSystemService: IFileSystemService,
    private readonly configProvider: IConfigProvider
  ) {
    this.branchMemoryBankPath = path.join(
      this.configProvider.getConfig().docsRoot,
      'branch-memory-bank'
    );
  }

  /**
   * Check if branch memory bank exists
   * @param branchName Branch name
   * @returns Promise resolving to boolean indicating if branch exists
   */
  async exists(branchName: string): Promise<boolean> {
    const operation = 'checkBranchExists';
    this.componentLogger.debug(`Starting ${operation}`, { branchName });
    try {
      const branchPath = this.configProvider.getBranchMemoryPath(branchName);
      this.componentLogger.debug(`Checking existence of directory`, { branchPath });
      const exists = await this.fileSystemService.directoryExists(branchPath);
      this.componentLogger.debug(`${operation} completed`, { branchName, exists });
      return exists;
    } catch (error) {
      if (error instanceof DomainError) {
        // If the branch name is invalid (DomainError from getBranchMemoryPath), it doesn't exist
        this.componentLogger.warn(`Invalid branch name provided for ${operation}`, { branchName, error });
        return false;
      }

      // Wrap other errors as InfrastructureError
      this.componentLogger.error(`Error during ${operation}`, { branchName, error });
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to ${operation} for branch ${branchName}: ${(error as Error).message}`,
        { originalError: error, operation, branchName }, // Keep original details
        { cause: error instanceof Error ? error : undefined } // Pass original error as cause
      );
    }
  }

  /**
   * Initialize branch memory bank
   * @param branchInfo Branch information
   * @returns Promise resolving when initialization is complete
   */
  async initialize(branchInfo: BranchInfo): Promise<void> {
    const operation = 'initializeBranchMemoryBank';
    this.componentLogger.debug(`Starting ${operation}`, { branchName: branchInfo.name });

    try {
      const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);
      this.componentLogger.debug(`Branch path determined`, { branchPath });

      // Create directory if it doesn't exist
      await this.fileSystemService.createDirectory(branchPath);
      this.componentLogger.debug(`Directory created or already exists`, { branchPath });

      // Create core documents if they don't exist
      for (const document of this.coreDocuments) {
        const filePath = path.join(branchPath, document);
        const exists = await this.fileSystemService.fileExists(filePath);

        if (!exists) {
          this.componentLogger.debug(`Core document does not exist, creating...`, { document, filePath });
          const templateFn = this.defaultTemplates[document];
          let content: string;

          if (typeof templateFn === 'function') {
            content = templateFn(branchInfo.name);
          } else {
            content = templateFn;
          }

          await this.fileSystemService.writeFile(filePath, content);
          this.componentLogger.info(`Created core document`, { document, branchName: branchInfo.name, filePath });
        } else {
          this.componentLogger.debug(`Core document already exists`, { document, filePath });
        }
      }

      this.componentLogger.info(`${operation} completed successfully`, { branchName: branchInfo.name });
    } catch (error) {
      if (error instanceof DomainError) {
        // DomainErrors should be thrown as is
        this.componentLogger.warn(`DomainError during ${operation}`, { branchName: branchInfo.name, error });
        throw error;
      }

      // Wrap other errors as InfrastructureError
      this.componentLogger.error(`Error during ${operation}`, { branchName: branchInfo.name, error });
      // Use the general FILE_SYSTEM_ERROR code directly as there's no specific factory for general FS errors
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to ${operation} for branch ${branchInfo.name}: ${(error as Error).message}`,
        { originalError: error, operation, branchName: branchInfo.name }, // Keep original details
        { cause: error instanceof Error ? error : undefined } // Pass original error as cause
      );
    }
  }

  /**
   * Get document from branch
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  async getDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<MemoryDocument | null> {
    const operation = 'getDocumentFromBranch';
    this.componentLogger.debug(`Starting ${operation}`, { branchName: branchInfo.name, documentPath: path.value });
    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      const document = await documentRepository.findByPath(path);
      this.componentLogger.debug(`${operation} completed`, { branchName: branchInfo.name, documentPath: path.value, found: !!document });
      return document;
    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { branchName: branchInfo.name, documentPath: path.value, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        // Re-throw known error types
        throw error;
      }

      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileReadError(
        path.value,
        error instanceof Error ? error : undefined,
        { operation, branchName: branchInfo.name }
      );
    }
  }

  /**
   * Save document to branch
   * @param branchInfo Branch information
   * @param document Document to save
   * @returns Promise resolving when done
   */
  async saveDocument(branchInfo: BranchInfo, document: MemoryDocument): Promise<void> {
    const documentPathValue = document.path instanceof DocumentPath ? document.path.value : document.path;
    const operation = 'saveDocumentToBranch';
    this.componentLogger.debug(`Starting ${operation}`, { branchName: branchInfo.name, documentPath: documentPathValue });
    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      await documentRepository.save(document);
      this.componentLogger.debug(`${operation} completed`, { branchName: branchInfo.name, documentPath: documentPathValue });
    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { branchName: branchInfo.name, documentPath: documentPathValue, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        // Re-throw known error types
        throw error;
      }

      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileWriteError(
        documentPathValue,
        error instanceof Error ? error : undefined,
        { operation, branchName: branchInfo.name }
      );
    }
  }

  /**
   * Delete document from branch
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving to boolean indicating success
   */
  async deleteDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<boolean> {
    const operation = 'deleteDocumentFromBranch';
    this.componentLogger.debug(`Starting ${operation}`, { branchName: branchInfo.name, documentPath: path.value });
    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      const deleted = await documentRepository.delete(path);
      this.componentLogger.debug(`${operation} completed`, { branchName: branchInfo.name, documentPath: path.value, deleted });
      return deleted;
    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { branchName: branchInfo.name, documentPath: path.value, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        // Re-throw known error types
        throw error;
      }

      // Wrap unknown errors using the general FILE_SYSTEM_ERROR code
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to ${operation} for document ${path.value} in branch ${branchInfo.name}: ${(error as Error).message}`,
        { originalError: error, operation, branchName: branchInfo.name, documentPath: path.value }, // Keep original details
        { cause: error instanceof Error ? error : undefined } // Pass original error as cause
      );
    }
  }

  /**
   * Get recent branches
   * @param limit Maximum number of branches to return (default: 10)
   * @returns Promise resolving to array of recent branches
   */
  async getRecentBranches(limit: number = 10): Promise<RecentBranch[]> {
    const operation = 'getRecentBranches';
    this.componentLogger.debug(`Starting ${operation}`, { limit });

    try {
      // Ensure the branch memory bank directory exists
      await this.fileSystemService.createDirectory(this.branchMemoryBankPath);
      this.componentLogger.debug(`Branch memory bank directory ensured`, { path: this.branchMemoryBankPath });

      // List all directories in the branch memory bank directory
      const entries = await this.fileSystemService.listFiles(this.branchMemoryBankPath);
      this.componentLogger.debug(`Listed entries in branch memory bank directory`, { count: entries.length });

      const branchInfos: {
        branchInfo: BranchInfo;
        path: string;
        lastModified: Date;
      }[] = [];

      // Get last modified times for each branch directory
      for (const entry of entries) {
        const dirName = path.basename(entry);
        let branchName: string | undefined;
        try {
          // Convert directory name to branch name (replace dash with slash)
          branchName = dirName.replace(/^(feature|fix)-/, '$1/');
          const branchInfo = BranchInfo.create(branchName);
          const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);

          // Check if it's a directory and has active context document
          const activeContextJsonPath = path.join(branchPath, 'activeContext.json');
          const activeContextMdPath = path.join(branchPath, 'activeContext.md');

          const isDirectory = await this.fileSystemService.directoryExists(branchPath);
          const hasActiveContextJson = await this.fileSystemService.fileExists(activeContextJsonPath);
          const hasActiveContextMd = await this.fileSystemService.fileExists(activeContextMdPath);

          if (isDirectory && (hasActiveContextJson || hasActiveContextMd)) {
            const activeContextPath = hasActiveContextJson ? activeContextJsonPath : activeContextMdPath;
            const stats = await this.fileSystemService.getFileStats(activeContextPath);
            this.componentLogger.debug(`Found valid branch directory`, { branchName, lastModified: stats.lastModified });
            branchInfos.push({
              branchInfo,
              path: branchPath,
              lastModified: stats.lastModified,
            });
          } else {
             this.componentLogger.debug(`Skipping entry (not a valid branch directory or missing active context)`, { entry });
          }
        } catch (error) {
          // Skip invalid branch directories or errors during processing
          this.componentLogger.warn(`Skipping invalid branch directory or error processing entry`, { entry, dirName, branchNameAttempt: branchName, error });
        }
      }

      // Sort by last modified date (descending)
      branchInfos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
      this.componentLogger.debug(`Sorted branch directories by last modified date`, { count: branchInfos.length });

      // Limit the results
      const limited = branchInfos.slice(0, limit);
      this.componentLogger.debug(`Limited branches to ${limit}`, { count: limited.length });

      // Build full branch info
      const recentBranches: RecentBranch[] = [];

      for (const { branchInfo, lastModified } of limited) {
        try {
          this.componentLogger.debug(`Processing branch for summary`, { branchName: branchInfo.name });
          // Try both JSON and MD paths for backwards compatibility
          const activeContextJsonPath = DocumentPath.create('activeContext.json');
          const activeContextMdPath = DocumentPath.create('activeContext.md');

          // Try to get the document, first JSON then MD
          let activeContext = await this.getDocument(branchInfo, activeContextJsonPath);
          if (!activeContext) {
            this.componentLogger.debug(`activeContext.json not found, trying activeContext.md`, { branchName: branchInfo.name });
            activeContext = await this.getDocument(branchInfo, activeContextMdPath);
          }

          if (activeContext) {
            this.componentLogger.debug(`Found active context document`, { branchName: branchInfo.name, path: activeContext.path.value });
            const content = activeContext.content;
            let currentWork: string | undefined;
            let recentChanges: string[] | undefined;

            // Extract current work and recent changes
            if (activeContext.isJSON) {
              try {
                const jsonContent = JSON.parse(content);
                currentWork = jsonContent.content?.currentWork;
                recentChanges = jsonContent.content?.recentChanges?.map(
                  (change: any) => change.description
                );
                 this.componentLogger.debug(`Parsed JSON active context`, { branchName: branchInfo.name });
              } catch (jsonError) {
                this.componentLogger.warn(`Error parsing JSON content for active context`, { branchName: branchInfo.name, error: jsonError });
                // Fallback to markdown parsing if JSON fails
                currentWork = extractSectionContent(content, '## 現在の作業内容');
                recentChanges = content.split('\n').filter(line => line.trim().startsWith('- ')).map((line: string) => line.replace(/^-\s*/, '').trim());
                this.componentLogger.debug(`Fell back to Markdown parsing for active context`, { branchName: branchInfo.name });
              }
            } else {
              // Fallback to Markdown parsing for backward compatibility
              currentWork = extractSectionContent(content, '## 現在の作業内容');
              recentChanges = content.split('\n').filter(line => line.trim().startsWith('- ')).map((line: string) => line.replace(/^-\s*/, '').trim());
              this.componentLogger.debug(`Parsed Markdown active context`, { branchName: branchInfo.name });
            }

            recentBranches.push({
              branchInfo,
              lastModified,
              summary: { currentWork, recentChanges },
            } as RecentBranch);

          } else {
            this.componentLogger.warn(`Active context document not found for branch`, { branchName: branchInfo.name });
            // Include branch even without active context details
            recentBranches.push({
              branchInfo,
              lastModified,
              summary: {},
            } as RecentBranch);
          }
        } catch (error) {
          // Skip branches with errors during summary generation
          this.componentLogger.error(`Error processing branch summary`, { branchName: branchInfo.name, error });
        }
      }

      this.componentLogger.info(`${operation} completed successfully`, { count: recentBranches.length });
      return recentBranches;
    } catch (error) {
       this.componentLogger.error(`Error during ${operation}`, { error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        // Re-throw known error types
        throw error;
      }

      // Wrap unknown errors using the general FILE_SYSTEM_ERROR code
      this.componentLogger.error(`Error during ${operation}`, { limit, error }); // Add limit to log context
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to ${operation}: ${(error as Error).message}`,
        { originalError: error, operation, limit }, // Keep original details
        { cause: error instanceof Error ? error : undefined } // Pass original error as cause
      );
    }
  }

  /**
   * Validate branch structure
   * @param branchInfo Branch information
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  async validateStructure(branchInfo: BranchInfo): Promise<boolean> {
    const operation = 'validateBranchStructure';
    this.componentLogger.debug(`Starting ${operation}`, { branchName: branchInfo.name });
    try {
      const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);
      this.componentLogger.debug(`Branch path determined`, { branchPath });

      // Check if directory exists
      const dirExists = await this.fileSystemService.directoryExists(branchPath);
      if (!dirExists) {
        this.componentLogger.warn(`Branch directory does not exist`, { operation, branchName: branchInfo.name, branchPath });
        return false;
      }
      this.componentLogger.debug(`Branch directory exists`, { branchPath });

      // Check if all core documents exist
      for (const document of this.coreDocuments) {
        const filePath = path.join(branchPath, document);
        const fileExists = await this.fileSystemService.fileExists(filePath);
        if (!fileExists) {
          this.componentLogger.warn(`Core document missing`, { operation, branchName: branchInfo.name, document, filePath });
          return false;
        }
         this.componentLogger.debug(`Core document exists`, { document, filePath });
      }

      this.componentLogger.info(`${operation} completed successfully, structure is valid`, { branchName: branchInfo.name });
      return true;
    } catch (error) {
      // Log the error but return false as validation failed
      this.componentLogger.error(`Error during ${operation}`, { branchName: branchInfo.name, error });
      return false;
    }
  }

  /**
   * Gets a document repository for the specific branch
   * @param branchInfo Branch information
   * @returns Memory document repository for the branch
   */
  private getRepositoryForBranch(branchInfo: BranchInfo): FileSystemMemoryDocumentRepository {
    const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);
    return new FileSystemMemoryDocumentRepository(branchPath, this.fileSystemService);
  }

  /**
   * Save tag index for branch
   * @param branchInfo Branch information
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveTagIndex(branchInfo: BranchInfo, tagIndex: BranchTagIndex): Promise<void> { // ★ BaseTagIndex から BranchTagIndex に変更
    const operation = 'saveTagIndex';
    const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);
    const indexPath = path.join(branchPath, '_index.json');
    this.componentLogger.debug(`Starting ${operation}`, { branchName: branchInfo.name, indexPath });

    try {
      // Convert to JSON string with pretty formatting
      const jsonContent = JSON.stringify(tagIndex, null, 2);
      this.componentLogger.debug(`Tag index JSON content generated`, { branchName: branchInfo.name });

      // Write to file
      await this.fileSystemService.writeFile(indexPath, jsonContent);
      this.componentLogger.info(`${operation} completed successfully`, { branchName: branchInfo.name, indexPath });
    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { branchName: branchInfo.name, indexPath, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        // Re-throw known error types
        throw error;
      }
      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileWriteError(
        indexPath,
        error instanceof Error ? error : undefined,
        { operation, branchName: branchInfo.name }
      );
    }
  }

  /**
   * Get tag index for branch
   * @param branchInfo Branch information
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getTagIndex(branchInfo: BranchInfo): Promise<BranchTagIndex | null> { // ★ BaseTagIndex から BranchTagIndex に変更
    const operation = 'getTagIndex';
    const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);
    const indexPath = path.join(branchPath, '_index.json');
    this.componentLogger.debug(`Starting ${operation}`, { branchName: branchInfo.name, indexPath });

    try {
      // Check if file exists
      const exists = await this.fileSystemService.fileExists(indexPath);
      if (!exists) {
        this.componentLogger.debug(`Tag index file not found`, { operation, branchName: branchInfo.name, indexPath });
        return null;
      }
      this.componentLogger.debug(`Tag index file exists`, { indexPath });

      // Read file content
      const content = await this.fileSystemService.readFile(indexPath);
      this.componentLogger.debug(`Tag index file content read`, { indexPath, size: content.length });

      // Parse JSON
      const tagIndex = JSON.parse(content) as BranchTagIndex; // ★ BaseTagIndex から BranchTagIndex に変更
      this.componentLogger.info(`${operation} completed successfully`, { branchName: branchInfo.name, indexPath });
      return tagIndex;

    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { branchName: branchInfo.name, indexPath, error });

      // If file not found error occurred during readFile (should be caught by exists check, but as safety)
      if (error instanceof InfrastructureError && error.code === `INFRA_ERROR.${InfrastructureErrorCodes.FILE_NOT_FOUND}`) {
         this.componentLogger.warn(`Tag index file not found during read operation`, { operation, branchName: branchInfo.name, indexPath });
        return null;
      }

      // Re-throw known error types
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      // Wrap unknown errors (e.g., JSON parse error) using the factory
      throw InfrastructureErrors.fileReadError(
        indexPath,
        error instanceof Error ? error : undefined,
        { operation, branchName: branchInfo.name, reason: 'Failed to read or parse tag index' }
      );
    }
  }

  /**
   * Find documents by tags in branch
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @returns Promise resolving to array of memory documents
   */
  async findDocumentsByTags(branchInfo: BranchInfo, tags: Tag[]): Promise<MemoryDocument[]> {
    const operation = 'findDocumentsByTags';
    const tagValues = tags.map(t => t.value);
    this.componentLogger.debug(`Starting ${operation}`, { branchName: branchInfo.name, tags: tagValues });

    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      const paths = await documentRepository.list();
      this.componentLogger.debug(`Listed documents in branch`, { branchName: branchInfo.name, count: paths.length });
      const documents: MemoryDocument[] = [];

      for (const docPath of paths) {
        // Use getDocument which already has logging/error handling
        const doc = await this.getDocument(branchInfo, docPath);
        if (doc) {
          documents.push(doc);
        }
      }
      this.componentLogger.debug(`Retrieved all documents`, { branchName: branchInfo.name, count: documents.length });

      // Filter documents that have any of the specified tags
      const filteredDocs = documents.filter((doc: MemoryDocument) => {
        if (tags.length === 0) return true; // Return all if no tags specified
        return tags.some((searchTag: Tag) => doc.hasTag(searchTag));
      });
      this.componentLogger.info(`${operation} completed successfully`, { branchName: branchInfo.name, tags: tagValues, foundCount: filteredDocs.length });
      return filteredDocs;

    } catch (error: unknown) {
      this.componentLogger.error(`Error during ${operation}`, { branchName: branchInfo.name, tags: tagValues, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
         // Re-throw known error types (getDocument might throw these)
        throw error;
      }
      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileReadError(
        `Branch: ${branchInfo.name}`, // Use branch name as path context is less relevant here
        error instanceof Error ? error : undefined,
        { operation, branchName: branchInfo.name, tags: tagValues, reason: 'Failed during document listing or filtering' }
      );
    }
  }

  /**
   * Find documents by tags in branch using index
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags (AND); if false, any tag (OR)
   * @returns Promise resolving to array of document paths
   */
  // パラメータをオブジェクトリテラル型に変更 (IBranchMemoryBankRepository に合わせる)
  async findDocumentPathsByTagsUsingIndex(params: {
    branchInfo: BranchInfo;
    tags: Tag[];
    matchAll?: boolean;
  }): Promise<DocumentPath[]> {
   const { branchInfo, tags, matchAll = false } = params; // 分割代入
   const operation = 'findDocumentPathsByTagsUsingIndex';
   const tagValues = tags.map(t => t.value);
   this.componentLogger.debug(`Starting ${operation}`, { branchName: branchInfo.name, tags: tagValues, matchAll });

   try {
     // Get tag index (getTagIndex already has logging)
     const tagIndex = await this.getTagIndex(branchInfo);

     if (!tagIndex) {
       // Fall back to regular method if no index exists
       this.componentLogger.warn(`No tag index found, falling back to findDocumentsByTags`, { operation, branchName: branchInfo.name });
       // findDocumentsByTags already has logging
       const docs = await this.findDocumentsByTags(branchInfo, tags);
       const paths = docs.map((doc) => doc.path);
       this.componentLogger.info(`${operation} completed via fallback`, { branchName: branchInfo.name, tags: tagValues, matchAll, foundCount: paths.length });
       return paths;
     }
     this.componentLogger.debug(`Tag index loaded`, { branchName: branchInfo.name });

     // Helper function to get document paths for a single tag from the index
     const getPathsForTag = (tagValue: string): string[] => {
       const entry = tagIndex.index.find((e) => e.tag === tagValue);
       const paths = entry ? entry.documents.map((docRef) => docRef.path) : [];
       this.componentLogger.debug(`Paths retrieved for tag`, { tagValue, count: paths.length });
       return paths;
     };

     let resultPaths: string[] = [];

     if (matchAll) { // AND logic
       this.componentLogger.debug(`Executing AND logic for tags`, { tags: tagValues });
       if (tags.length === 0) {
          this.componentLogger.debug(`No tags provided for AND logic, returning empty array`);
          return [];
       }
       const firstTagValue = tags[0].value;
       let matchedPaths = getPathsForTag(firstTagValue);
       this.componentLogger.debug(`Initial paths for first tag`, { firstTagValue, count: matchedPaths.length });

       for (let i = 1; i < tags.length; i++) {
         const tagValue = tags[i].value;
         const tagPaths = getPathsForTag(tagValue);
         const tagPathSet = new Set(tagPaths);
         this.componentLogger.debug(`Filtering with paths for tag`, { tagValue, count: tagPaths.length });
         matchedPaths = matchedPaths.filter((path: string) => tagPathSet.has(path));
         this.componentLogger.debug(`Paths remaining after filtering`, { count: matchedPaths.length });
         if (matchedPaths.length === 0) break; // Early exit
       }
       resultPaths = matchedPaths;

     } else { // OR logic
        this.componentLogger.debug(`Executing OR logic for tags`, { tags: tagValues });
       const pathSet = new Set<string>();
       for (const tag of tags) {
         const tagValue = tag.value;
         const tagPaths = getPathsForTag(tagValue);
         for (const docPath of tagPaths) {
           pathSet.add(docPath);
         }
       }
       resultPaths = Array.from(pathSet);
     }
     this.componentLogger.debug(`Final paths determined`, { count: resultPaths.length });

     // Convert string paths to DocumentPath objects
     const documentPaths = resultPaths.map((p) => DocumentPath.create(p));
     this.componentLogger.info(`${operation} completed successfully using index`, { branchName: branchInfo.name, tags: tagValues, matchAll, foundCount: documentPaths.length });
     return documentPaths;

   } catch (error: unknown) {
      this.componentLogger.error(`Error during ${operation}`, { branchName: branchInfo.name, tags: tagValues, matchAll, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        // Re-throw known error types (getTagIndex or findDocumentsByTags might throw these)
       throw error;
     }
     // Wrap unknown errors using the factory
     throw InfrastructureErrors.fileReadError(
       `Branch Index: ${branchInfo.name}`, // Context is index reading/processing
       error instanceof Error ? error : undefined,
       { operation, branchName: branchInfo.name, tags: tagValues, matchAll, reason: 'Failed during index processing' }
     );
   }
 }
  /**
   * List all documents in branch
   * @param branchInfo Branch information
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    const operation = 'listDocuments';
    this.componentLogger.debug(`Starting ${operation}`, { branchName: branchInfo.name });

    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      const documents = await documentRepository.list();
      this.componentLogger.debug(`${operation} completed`, { branchName: branchInfo.name, count: documents.length });
      return documents;
    } catch (error: unknown) {
      this.componentLogger.error(`Error during ${operation}`, { branchName: branchInfo.name, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        // Re-throw known error types
        throw error;
      }
      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileReadError(
        `Branch: ${branchInfo.name}`,
        error instanceof Error ? error : undefined,
        { operation, branchName: branchInfo.name }
      );
    }
  }
}
