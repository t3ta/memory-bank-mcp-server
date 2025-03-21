import path from "path";
import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import type { Tag } from "../../../domain/entities/Tag.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import type { IBranchMemoryBankRepository, RecentBranch } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import type { TagIndex } from "../../../schemas/tag-index/tag-index-schema.js";
import { DomainError } from "../../../shared/errors/DomainError.js";
import { InfrastructureError, InfrastructureErrorCodes } from "../../../shared/errors/InfrastructureError.js";
import { extractSectionContent } from "../../../shared/utils/index.js";
import { logger } from "../../../shared/utils/logger.js";
import type { IConfigProvider } from "../../config/index.js";
import type { IFileSystemService } from "../../storage/interfaces/IFileSystemService.js";
import { FileSystemMemoryDocumentRepository } from "./FileSystemMemoryDocumentRepository.js";



/**
 * File system implementation of branch memory bank repository
 */
export class FileSystemBranchMemoryBankRepository implements IBranchMemoryBankRepository {
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
      this.configProvider.getConfig().memoryBankRoot,
      'branch-memory-bank'
    );
  }

  /**
   * Check if branch memory bank exists
   * @param branchName Branch name
   * @returns Promise resolving to boolean indicating if branch exists
   */
  async exists(branchName: string): Promise<boolean> {
    try {
      const branchPath = this.configProvider.getBranchMemoryPath(branchName);

      return await this.fileSystemService.directoryExists(branchPath);
    } catch (error) {
      if (error instanceof DomainError) {
        // If the branch name is invalid, it doesn't exist
        return false;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if branch memory bank exists: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Initialize branch memory bank
   * @param branchInfo Branch information
   * @returns Promise resolving when initialization is complete
   */
  async initialize(branchInfo: BranchInfo): Promise<void> {
    try {
      logger.debug(`Initializing branch memory bank for ${branchInfo.name}`);

      const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);

      // Create directory if it doesn't exist
      await this.fileSystemService.createDirectory(branchPath);

      // Create core documents if they don't exist
      for (const document of this.coreDocuments) {
        const filePath = path.join(branchPath, document);
        const exists = await this.fileSystemService.fileExists(filePath);

        if (!exists) {
          const templateFn = this.defaultTemplates[document];
          let content: string;

          if (typeof templateFn === 'function') {
            content = templateFn(branchInfo.name);
          } else {
            content = templateFn;
          }

          await this.fileSystemService.writeFile(filePath, content);
          logger.debug(`Created core document: ${document} for branch ${branchInfo.name}`);
        }
      }

      logger.debug(`Branch memory bank initialized for ${branchInfo.name}`);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to initialize branch memory bank: ${(error as Error).message}`,
        { originalError: error }
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
    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      return await documentRepository.findByPath(path);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get document from branch memory bank: ${path.value}`,
        { originalError: error }
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
    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      await documentRepository.save(document);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save document to branch memory bank: ${document.path instanceof DocumentPath ? document.path.value : document.path}`,
        { originalError: error }
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
    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      return await documentRepository.delete(path);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete document from branch memory bank: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get recent branches
   * @param limit Maximum number of branches to return (default: 10)
   * @returns Promise resolving to array of recent branches
   */
  async getRecentBranches(limit: number = 10): Promise<RecentBranch[]> {
    try {
      logger.debug(`Getting recent branches (limit: ${limit})`);

      // Ensure the branch memory bank directory exists
      await this.fileSystemService.createDirectory(this.branchMemoryBankPath);

      // List all directories in the branch memory bank directory
      const entries = await this.fileSystemService.listFiles(this.branchMemoryBankPath);

      const branchInfos: {
        branchInfo: BranchInfo;
        path: string;
        lastModified: Date;
      }[] = [];

      // Get last modified times for each branch directory
      for (const entry of entries) {
        try {
          // Get the directory name (without path)
          const dirName = path.basename(entry);

          // Convert directory name to branch name (replace dash with slash)
          const branchName = dirName.replace(/^(feature|fix)-/, '$1/');

          // Create BranchInfo
          const branchInfo = BranchInfo.create(branchName);

          // Check if it's a directory and has active context document
          const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);
          // Check for both .json and .md versions for backwards compatibility
          const activeContextJsonPath = path.join(branchPath, 'activeContext.json');
          const activeContextMdPath = path.join(branchPath, 'activeContext.md');

          const isDirectory = await this.fileSystemService.directoryExists(branchPath);
          const hasActiveContextJson =
            await this.fileSystemService.fileExists(activeContextJsonPath);
          const hasActiveContextMd = await this.fileSystemService.fileExists(activeContextMdPath);

          if (isDirectory && (hasActiveContextJson || hasActiveContextMd)) {
            // Get last modified date of active context (prefer json version)
            const activeContextPath = hasActiveContextJson
              ? activeContextJsonPath
              : activeContextMdPath;
            const stats = await this.fileSystemService.getFileStats(activeContextPath);

            branchInfos.push({
              branchInfo,
              path: branchPath,
              lastModified: stats.lastModified,
            });
          }
        } catch (error) {
          // Skip invalid branch directories
          logger.debug(`Skipping invalid branch directory: ${entry}`, error);
        }
      }

      // Sort by last modified date (descending)
      branchInfos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

      // Limit the results
      const limited = branchInfos.slice(0, limit);

      // Build full branch info
      const recentBranches: RecentBranch[] = [];

      for (const { branchInfo, lastModified } of limited) {
        try {
          // Try both JSON and MD paths for backwards compatibility
          const activeContextJsonPath = DocumentPath.create('activeContext.json');
          const activeContextMdPath = DocumentPath.create('activeContext.md');

          // Try to get the document, first JSON then MD
          let activeContext = await this.getDocument(branchInfo, activeContextJsonPath);
          if (!activeContext) {
            activeContext = await this.getDocument(branchInfo, activeContextMdPath);
          }

          if (activeContext) {
            const content = activeContext.content;

            // Extract current work and recent changes
            // Check if document is in JSON format
            if (activeContext.isJSON) {
              try {
                const jsonContent = JSON.parse(content);
                const currentWork = jsonContent.content?.currentWork;
                const recentChanges = jsonContent.content?.recentChanges?.map(
                  (change: any) => change.description
                );

                recentBranches.push({
                branchInfo,
                lastModified,
                summary: {
                currentWork,
                recentChanges,
                },
                } as RecentBranch);
                continue;
              } catch (jsonError) {
                logger.debug(`Error parsing JSON content for ${branchInfo.name}:`, jsonError);
              }
            }

            // Fallback to Markdown parsing for backward compatibility
            const currentWork = extractSectionContent(content, '## 現在の作業内容');
            const recentChanges = content
              .split('\n')
              .filter(line => line.trim().startsWith('- '))
              .map((line: string) => line.replace(/^-\s*/, '').trim()
              );

            recentBranches.push({
              branchInfo,
              lastModified,
              summary: {
                currentWork,
                recentChanges,
              },
            } as RecentBranch);
          } else {
            // Include branch even without active context details
            recentBranches.push({
              branchInfo,
              lastModified,
              summary: {},
            } as RecentBranch);
          }
        } catch (error) {
          // Skip branches with errors
          logger.debug(`Error processing branch ${branchInfo.name}:`, error);
        }
      }

      logger.debug(`Found ${recentBranches.length} recent branches`);
      return recentBranches;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to get recent branches: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Validate branch structure
   * @param branchInfo Branch information
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  async validateStructure(branchInfo: BranchInfo): Promise<boolean> {
    try {
      logger.debug(`Validating branch structure for ${branchInfo.name}`);

      const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);

      // Check if directory exists
      const dirExists = await this.fileSystemService.directoryExists(branchPath);

      if (!dirExists) {
        logger.debug(`Branch directory does not exist: ${branchPath}`);
        return false;
      }

      // Check if all core documents exist
      for (const document of this.coreDocuments) {
        const filePath = path.join(branchPath, document);
        const fileExists = await this.fileSystemService.fileExists(filePath);

        if (!fileExists) {
          logger.debug(`Core document missing: ${document}`);
          return false;
        }
      }

      logger.debug(`Branch structure is valid for ${branchInfo.name}`);
      return true;
    } catch (error) {
      logger.error(`Error validating branch structure for ${branchInfo.name}:`, error);
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
  async saveTagIndex(branchInfo: BranchInfo, tagIndex: TagIndex): Promise<void> {
    try {
      logger.debug(`Saving tag index for branch ${branchInfo.name}`);

      const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);
      const indexPath = path.join(branchPath, '_index.json');

      // Convert to JSON string with pretty formatting
      const jsonContent = JSON.stringify(tagIndex, null, 2);

      // Write to file
      await this.fileSystemService.writeFile(indexPath, jsonContent);

      logger.debug(`Tag index saved for branch ${branchInfo.name}`);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save tag index for branch ${branchInfo.name}: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get tag index for branch
   * @param branchInfo Branch information
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getTagIndex(branchInfo: BranchInfo): Promise<TagIndex | null> {
    try {
      logger.debug(`Getting tag index for branch ${branchInfo.name}`);

      const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);
      const indexPath = path.join(branchPath, '_index.json');

      // Check if file exists
      const exists = await this.fileSystemService.fileExists(indexPath);

      if (!exists) {
        logger.debug(`No tag index found for branch ${branchInfo.name}`);
        return null;
      }

      // Read file content
      const content = await this.fileSystemService.readFile(indexPath);

      // Parse JSON
      const tagIndex = JSON.parse(content) as TagIndex;

      logger.debug(`Tag index loaded for branch ${branchInfo.name}`);
      return tagIndex;
    } catch (error) {
      if (
        error instanceof InfrastructureError &&
        error.code === `INFRA_ERROR.${InfrastructureErrorCodes.FILE_NOT_FOUND}`
      ) {
        return null;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get tag index for branch ${branchInfo.name}: ${(error as Error).message}`,
        { originalError: error }
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
    try {
      logger.debug(`Finding documents by tags in branch ${branchInfo.name}`);

      const documentRepository = this.getRepositoryForBranch(branchInfo);
      const paths = await documentRepository.list();
      const documents: MemoryDocument[] = [];

      for (const docPath of paths) {
        const doc = await documentRepository.findByPath(docPath);
        if (doc) {
          documents.push(doc);
        }
      }

      // Filter documents that have any of the specified tags
      return documents.filter((doc: MemoryDocument) => {
        // If no tags specified, return all documents
        if (tags.length === 0) return true;

        // Check if any of the search tags matches document's tags
        // Since doc is properly typed as MemoryDocument, we can use hasTag
        return tags.some((searchTag: Tag) => doc.hasTag(searchTag));
      });
    } catch (error: unknown) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags: ${(error as Error).message}`,
        { originalError: error }
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
  async findDocumentPathsByTagsUsingIndex(
    branchInfo: BranchInfo,
    tags: Tag[],
    matchAll: boolean = false
  ): Promise<DocumentPath[]> {
    try {
      logger.debug(`Finding documents by tags using index in branch ${branchInfo.name}`);

      // Get tag index
      const tagIndex = await this.getTagIndex(branchInfo);

      if (!tagIndex) {
        // Fall back to regular method if no index exists
        logger.debug(`No tag index found, falling back to regular method`);
        const docs = await this.findDocumentsByTags(branchInfo, tags);
        // Convert properly typed MemoryDocument objects to DocumentPath objects
        return docs.map((doc) => doc.path);
      }

      let resultPaths: string[] = [];

      if (matchAll) {
        // AND logic - document must have all tags
        if (tags.length === 0) return [];

        // Start with all documents for the first tag
        const firstTag = tags[0].value;
        let matchedPaths = tagIndex.index[firstTag] || [];

        // Filter for each additional tag
        for (let i = 1; i < tags.length; i++) {
          const tagValue = tags[i].value;
          const tagPaths = tagIndex.index[tagValue] || [];

          // Keep only paths that are in both sets
          matchedPaths = matchedPaths.filter((path) => tagPaths.includes(path));

          // Early exit if no matches
          if (matchedPaths.length === 0) break;
        }

        resultPaths = matchedPaths;
      } else {
        // OR logic - document can have any of the tags
        const pathSet = new Set<string>();

        // Collect all paths for all tags
        for (const tag of tags) {
          const tagValue = tag.value;
          const tagPaths = tagIndex.index[tagValue] || [];

          // Add to result set
          for (const docPath of tagPaths) {
            pathSet.add(docPath);
          }
        }

        resultPaths = Array.from(pathSet);
      }

      // Convert string paths to DocumentPath objects
      return resultPaths.map((p) => DocumentPath.create(p));
    } catch (error: unknown) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags using index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
  /**
   * List all documents in branch
   * @param branchInfo Branch information
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      return await documentRepository.list();
    } catch (error: unknown) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
