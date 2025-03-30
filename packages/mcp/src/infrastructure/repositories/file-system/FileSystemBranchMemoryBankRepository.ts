import { join } from 'path';
import type { BranchTagIndex, JsonDocumentV2 } from "@memory-bank/schemas";
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { IBranchMemoryBankRepository, RecentBranch } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { FileSystemService } from '../../storage/FileSystemService.js';
import { InfrastructureErrors } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';

type DocumentChange = string | { description: string };

type ActiveContextDocument = {
  schema: "memory_document_v2";
  documentType: 'active_context';
  path: string;
  title: string;
  tags: string[];
  lastModified: Date;
  currentWork?: string;
  recentChanges?: DocumentChange[];
  version: number;
  createdAt: Date;
};

/**
 * Type guard for DocumentChange
 */
function isDocumentChangeObject(change: DocumentChange): change is { description: string } {
  return typeof change === 'object' && 'description' in change;
}

/**
 * ブランチメモリーバンクリポジトリのファイルシステム実装
 */
export class FileSystemBranchMemoryBankRepository implements IBranchMemoryBankRepository {
  private readonly componentLogger = logger.withContext({ component: 'FileSystemBranchMemoryBankRepository' });

  constructor(private readonly fileSystemService: FileSystemService) {}

  async exists(branchName: string): Promise<boolean> {
    const operation = 'exists';
    try {
      this.componentLogger.debug(`Checking branch existence`, { branchName });
      const branchInfo = BranchInfo.create(branchName);
      const branchDirPath = this.getBranchDirectoryPath(branchInfo);
      return await this.fileSystemService.directoryExists(branchDirPath);
    } catch (error) {
      this.componentLogger.error('Failed to check branch existence', { operation, branchName, error });
      throw InfrastructureErrors.fileSystemError(
        `Failed to check branch existence: ${branchName}`,
        { operation, branchName }
      );
    }
  }

  async initialize(branchInfo: BranchInfo): Promise<void> {
    const operation = 'initialize';
    try {
      this.componentLogger.debug('Initializing branch', { branchName: branchInfo.name });
      const branchDirPath = this.getBranchDirectoryPath(branchInfo);
      await this.fileSystemService.createDirectory(branchDirPath);
    } catch (error) {
      this.componentLogger.error('Failed to initialize branch', { operation, branchName: branchInfo.name, error });
      throw InfrastructureErrors.initializationError(
        `Failed to initialize branch: ${branchInfo.name}`,
        { operation, branchName: branchInfo.name }
      );
    }
  }

  async getDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<MemoryDocument | null> {
    const operation = 'getDocument';
    try {
      this.componentLogger.debug('Reading document', { branchName: branchInfo.name, path: path.value });
      const filePath = this.getDocumentFilePath(branchInfo, path);

      if (!(await this.fileSystemService.fileExists(filePath))) {
        return null;
      }

      const content = await this.fileSystemService.readFile(filePath);
      const jsonContent = JSON.parse(content) as JsonDocumentV2;
      return MemoryDocument.fromJSON(jsonContent, path);
    } catch (error) {
      this.componentLogger.error('Failed to read document', { operation, branchName: branchInfo.name, path: path.value, error });
      throw InfrastructureErrors.fileReadError(
        `Failed to read document: ${path.value}`,
        { operation, branchName: branchInfo.name, path: path.value }
      );
    }
  }

  async saveDocument(branchInfo: BranchInfo, document: MemoryDocument): Promise<void> {
    const operation = 'saveDocument';
    try {
      this.componentLogger.debug('Writing document', { branchName: branchInfo.name, path: document.path.value });
      const filePath = this.getDocumentFilePath(branchInfo, document.path);
      await this.fileSystemService.writeFile(filePath, JSON.stringify(document.toJSON(), null, 2));

      // Update tag index after saving document
      await this.updateTagIndex(branchInfo);
    } catch (error) {
      this.componentLogger.error('Failed to write document', { operation, branchName: branchInfo.name, path: document.path.value, error });
      throw InfrastructureErrors.fileWriteError(
        `Failed to write document: ${document.path.value}`,
        { operation, branchName: branchInfo.name, path: document.path.value }
      );
    }
  }

  async deleteDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<boolean> {
    const operation = 'deleteDocument';
    try {
      this.componentLogger.debug('Deleting document', { branchName: branchInfo.name, path: path.value });
      const filePath = this.getDocumentFilePath(branchInfo, path);

      if (!(await this.fileSystemService.fileExists(filePath))) {
        return false;
      }

      await this.fileSystemService.deleteFile(filePath);
      await this.updateTagIndex(branchInfo);
      return true;
    } catch (error) {
      this.componentLogger.error('Failed to delete document', { operation, branchName: branchInfo.name, path: path.value, error });
      throw InfrastructureErrors.fileDeleteError(
        `Failed to delete document: ${path.value}`,
        { operation, branchName: branchInfo.name, path: path.value }
      );
    }
  }

  async listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    const operation = 'listDocuments';
    try {
      this.componentLogger.debug('Listing documents', { branchName: branchInfo.name });
      const branchDirPath = this.getBranchDirectoryPath(branchInfo);
      const paths = await this.fileSystemService.listFiles(branchDirPath);
      return paths
        .filter(path => path.endsWith('.json') && !path.endsWith('.tag_index.json'))
        .map(path => DocumentPath.create(path));
    } catch (error) {
      this.componentLogger.error('Failed to list documents', { operation, branchName: branchInfo.name, error });
      throw InfrastructureErrors.fileSystemError(
        `Failed to list documents for branch: ${branchInfo.name}`,
        { operation, branchName: branchInfo.name }
      );
    }
  }

  async findDocumentsByTags(branchInfo: BranchInfo, tags: Tag[]): Promise<MemoryDocument[]> {
    const operation = 'findDocumentsByTags';
    try {
      this.componentLogger.debug('Finding documents by tags', { branchName: branchInfo.name, tags: tags.map(t => t.value) });
      const paths = await this.findDocumentPathsByTagsUsingIndex({ branchInfo, tags });
      const documents: MemoryDocument[] = [];

      for (const path of paths) {
        const doc = await this.getDocument(branchInfo, path);
        if (doc) {
          documents.push(doc);
        }
      }

      return documents;
    } catch (error) {
      this.componentLogger.error('Failed to find documents by tags', { operation, branchName: branchInfo.name, tags: tags.map(t => t.value), error });
      throw InfrastructureErrors.fileSystemError(
        `Failed to find documents by tags for branch: ${branchInfo.name}`,
        { operation, branchName: branchInfo.name, tags: tags.map(t => t.value) }
      );
    }
  }

  async getRecentBranches(limit: number = 10): Promise<RecentBranch[]> {
    const operation = 'getRecentBranches';
    try {
      this.componentLogger.debug('Getting recent branches', { limit });
      const branchDirPath = 'branch-memory-bank';
      const branchDirs = await this.fileSystemService.listFiles(branchDirPath);
      const recentBranches: RecentBranch[] = [];

      for (const branchDir of branchDirs) {
        try {
          const branchName = branchDir.split('/').pop() || '';
          const branchInfo = BranchInfo.create(branchName);
          const activeContextPath = DocumentPath.create('activeContext.json');
          const document = await this.getDocument(branchInfo, activeContextPath);

          if (document) {
            const jsonDoc = document.toJSON();
            let currentWork: string | undefined;
            let recentChanges: string[] = [];

            if (jsonDoc.documentType === 'active_context') {
              const activeContext = jsonDoc as ActiveContextDocument;
              currentWork = activeContext.currentWork;
              recentChanges = (activeContext.recentChanges || []).map(change =>
                isDocumentChangeObject(change) ? change.description : change
              );
            }

            recentBranches.push({
              branchInfo,
              lastModified: new Date(jsonDoc.lastModified),
              summary: {
                currentWork,
                recentChanges,
              },
            });
          }
        } catch (error) {
          this.componentLogger.warn('Failed to process branch for recent branches', { branchDir, error });
          continue;
        }
      }

      // Sort by lastModified (newest first) and limit results
      return recentBranches
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
        .slice(0, limit);
    } catch (error) {
      this.componentLogger.error('Failed to get recent branches', { operation, limit, error });
      throw InfrastructureErrors.fileSystemError(
        'Failed to get recent branches',
        { operation, limit }
      );
    }
  }

  async validateStructure(branchInfo: BranchInfo): Promise<boolean> {
    const operation = 'validateStructure';
    try {
      this.componentLogger.debug('Validating branch structure', { branchName: branchInfo.name });
      const branchDirPath = this.getBranchDirectoryPath(branchInfo);
      const exists = await this.fileSystemService.directoryExists(branchDirPath);
      if (!exists) {
        return false;
      }

      const requiredFiles = [
        'branchContext.json',
        'activeContext.json',
        'systemPatterns.json',
        'progress.json'
      ];

      for (const file of requiredFiles) {
        const filePath = join(branchDirPath, file);
        if (!(await this.fileSystemService.fileExists(filePath))) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.componentLogger.error('Failed to validate branch structure', { operation, branchName: branchInfo.name, error });
      throw InfrastructureErrors.fileSystemError(
        `Failed to validate branch structure: ${branchInfo.name}`,
        { operation, branchName: branchInfo.name }
      );
    }
  }

  async saveTagIndex(branchInfo: BranchInfo, tagIndex: BranchTagIndex): Promise<void> {
    const operation = 'saveTagIndex';
    try {
      this.componentLogger.debug('Saving tag index', { branchName: branchInfo.name });
      const indexPath = this.getTagIndexPath(branchInfo);
      await this.fileSystemService.writeFile(indexPath, JSON.stringify(tagIndex, null, 2));
    } catch (error) {
      this.componentLogger.error('Failed to save tag index', { operation, branchName: branchInfo.name, error });
      throw InfrastructureErrors.fileWriteError(
        `Failed to save tag index for branch: ${branchInfo.name}`,
        { operation, branchName: branchInfo.name }
      );
    }
  }

  async findDocumentPathsByTagsUsingIndex(params: {
    branchInfo: BranchInfo;
    tags: Tag[];
    matchAll?: boolean;
  }): Promise<DocumentPath[]> {
    const { branchInfo, tags, matchAll = true } = params;
    const operation = 'findDocumentPathsByTagsUsingIndex';
    const tagValues = tags.map(tag => tag.value);

    try {
      this.componentLogger.debug('Finding documents by tags using index', {
        branchName: branchInfo.name,
        tags: tagValues,
        matchAll
      });

      const tagIndex = await this.getTagIndex(branchInfo);
      if (!tagIndex) {
        return [];
      }

      // Extract document paths from tag index
      const matchingPaths = new Set<string>();
      const { index } = tagIndex;

      for (const tagEntry of index) {
        if (tagValues.includes(tagEntry.tag)) {
          const paths = tagEntry.documents.map(doc => doc.path);
          if (matchAll) {
            if (matchingPaths.size === 0) {
              paths.forEach(path => matchingPaths.add(path));
            } else {
              const intersection = new Set<string>();
              paths.forEach(path => {
                if (matchingPaths.has(path)) {
                  intersection.add(path);
                }
              });
              matchingPaths.clear();
              intersection.forEach(path => matchingPaths.add(path));
            }
            if (matchingPaths.size === 0) break;
          } else {
            paths.forEach(path => matchingPaths.add(path));
          }
        }
      }

      return Array.from(matchingPaths).map(path => DocumentPath.create(path));
    } catch (error) {
      this.componentLogger.error('Failed to find documents by tags using index', {
        operation,
        branchName: branchInfo.name,
        tags: tagValues,
        matchAll,
        error
      });
      throw InfrastructureErrors.fileSystemError(
        `Failed to find documents by tags using index for branch: ${branchInfo.name}`,
        { operation, branchName: branchInfo.name, tags: tagValues, matchAll }
      );
    }
  }

  private async updateTagIndex(branchInfo: BranchInfo): Promise<void> {
    // Create new tag index
    const tagIndex: BranchTagIndex = {
      schema: "tag_index_v1",
      metadata: {
        indexType: "branch",
        branchName: branchInfo.name,
        lastUpdated: new Date(),
        documentCount: 0,
        tagCount: 0
      },
      index: []
    };

    // Build tag index from documents
    const documents = await this.listDocuments(branchInfo);
    const tagMap = new Map<string, Set<string>>();

    for (const path of documents) {
      const document = await this.getDocument(branchInfo, path);
      if (!document) continue;

      const docMeta = {
        path: path.value,
        title: document.title || path.value,
        id: path.value,
        lastModified: document.lastModified
      };

      document.tags.forEach(tag => {
        if (!tagMap.has(tag.value)) {
          tagMap.set(tag.value, new Set());
        }
        tagMap.get(tag.value)?.add(JSON.stringify(docMeta));
      });
    }

    // Convert tag map to index array
    tagIndex.index = Array.from(tagMap.entries()).map(([tag, docSet]) => ({
      tag,
      documents: Array.from(docSet).map(docJson => JSON.parse(docJson))
    }));

    // Update metadata
    tagIndex.metadata.documentCount = documents.length;
    tagIndex.metadata.tagCount = tagIndex.index.length;

    // Save tag index
    await this.saveTagIndex(branchInfo, tagIndex);
  }

  async getTagIndex(branchInfo: BranchInfo): Promise<BranchTagIndex | null> {
    const operation = 'getTagIndex';
    const indexPath = this.getTagIndexPath(branchInfo);

    try {
      this.componentLogger.debug('Reading tag index', { branchName: branchInfo.name });

      if (!(await this.fileSystemService.fileExists(indexPath))) {
        return null;
      }

      const content = await this.fileSystemService.readFile(indexPath);
      return JSON.parse(content) as BranchTagIndex;
    } catch (error) {
      this.componentLogger.error('Failed to read tag index', { operation, branchName: branchInfo.name, error });
      throw InfrastructureErrors.fileSystemError(
        `Failed to read tag index for branch: ${branchInfo.name}`,
        { operation, branchName: branchInfo.name }
      );
    }
  }

  private getBranchDirectoryPath(branchInfo: BranchInfo): string {
    return join('branch-memory-bank', branchInfo.name);
  }

  private getDocumentFilePath(branchInfo: BranchInfo, documentPath: DocumentPath): string {
    return join(this.getBranchDirectoryPath(branchInfo), documentPath.value);
  }

  private getTagIndexPath(branchInfo: BranchInfo): string {
    return join(this.getBranchDirectoryPath(branchInfo), '.tag_index.json');
  }
}
