import path from 'path';
import {
  IBranchMemoryBankRepository,
  RecentBranch,
} from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import { IConfigProvider } from '../../config/interfaces/IConfigProvider.js';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from '../../../shared/errors/InfrastructureError.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { FileSystemMemoryDocumentRepository } from './FileSystemMemoryDocumentRepository.js';
import { extractListItems, extractSectionContent } from '../../../shared/utils/index.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * File system implementation of branch memory bank repository
 */
export class FileSystemBranchMemoryBankRepository implements IBranchMemoryBankRepository {
  private readonly branchMemoryBankPath: string;
  private readonly coreDocuments = [
    'branchContext.md',
    'activeContext.md',
    'systemPatterns.md',
    'progress.md',
  ];
  private readonly defaultTemplates: Record<string, string | ((branchName: string) => string)> = {
    'branchContext.md': (branchName: string) => `# ブランチコンテキスト

## 目的

ブランチ: ${branchName}
作成日時: ${new Date().toISOString().split('T')[0]}

このブランチは、[ブランチの目的を記述]

## ユーザーストーリー

### 解決する課題

- [解決する課題1]
- [解決する課題2]
- [解決する課題3]

### 必要な機能

- [必要な機能1]
- [必要な機能2]
- [必要な機能3]

### 期待される動作

- [期待される動作1]
- [期待される動作2]
- [期待される動作3]
`,
    'activeContext.md': `# アクティブコンテキスト

## 現在の作業内容

[現在取り組んでいる作業の説明]

## 最近の変更点

- [変更点1]
- [変更点2]
- [変更点3]

## アクティブな決定事項

- [決定事項1]
- [決定事項2]
- [決定事項3]

## 検討事項

- [検討事項1]
- [検討事項2]
- [検討事項3]

## 次のステップ

1. [次のステップ1]
2. [次のステップ2]
3. [次のステップ3]
`,
    'systemPatterns.md': `# システムパターン

## 技術的決定事項

### [決定事項のタイトル]

#### コンテキスト
[決定の背景や理由]

#### 決定事項
[具体的な決定内容]

#### 影響
- [影響1]
- [影響2]
- [影響3]

## 関連ファイルとディレクトリ構造

\`\`\`
[関連するディレクトリ構造]
\`\`\`
`,
    'progress.md': `# 進捗状況

## 動作している機能

- [機能1]
- [機能2]
- [機能3]

## 未実装の機能

- [未実装の機能1]
- [未実装の機能2]
- [未実装の機能3]

## 現在の状態

[現在の実装状態の説明]

## 実装計画

[今後の実装計画]

## 既知の問題

- [問題1]
- [問題2]
- [問題3]
`,
  };

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
        `Failed to save document to branch memory bank: ${document.path.value}`,
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
   * List all documents in branch
   * @param branchInfo Branch information
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      return await documentRepository.list();
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list documents in branch memory bank`,
        { originalError: error }
      );
    }
  }

  /**
   * Find documents by tags in branch
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  async findDocumentsByTags(branchInfo: BranchInfo, tags: Tag[]): Promise<MemoryDocument[]> {
    try {
      const documentRepository = this.getRepositoryForBranch(branchInfo);
      return await documentRepository.findByTags(tags);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to find documents by tags in branch memory bank`,
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
          const activeContextPath = path.join(branchPath, 'activeContext.md');

          const isDirectory = await this.fileSystemService.directoryExists(branchPath);
          const hasActiveContext = await this.fileSystemService.fileExists(activeContextPath);

          if (isDirectory && hasActiveContext) {
            // Get last modified date of active context
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
          // Get active context document to extract summary
          const activeContextPath = DocumentPath.create('activeContext.md');
          const activeContext = await this.getDocument(branchInfo, activeContextPath);

          if (activeContext) {
            const content = activeContext.content;

            // Extract current work and recent changes
            const currentWork = extractSectionContent(content, '## 現在の作業内容');
            const recentChanges = extractListItems(content, '## 最近の変更点')?.map((item) =>
              item.trim()
            );

            recentBranches.push({
              branchInfo,
              lastModified,
              summary: {
                currentWork,
                recentChanges,
              },
            });
          } else {
            // Include branch even without active context details
            recentBranches.push({
              branchInfo,
              lastModified,
              summary: {},
            });
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
   * Get memory document repository for branch
   * @param branchInfo Branch information
   * @returns FileSystemMemoryDocumentRepository
   */
  private getRepositoryForBranch(branchInfo: BranchInfo): FileSystemMemoryDocumentRepository {
    const branchPath = this.configProvider.getBranchMemoryPath(branchInfo.name);
    return new FileSystemMemoryDocumentRepository(branchPath, this.fileSystemService);
  }
}
