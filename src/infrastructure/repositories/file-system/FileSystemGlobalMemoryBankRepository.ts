import path from 'path';
import { IGlobalMemoryBankRepository } from '../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import { IConfigProvider } from '../../config/interfaces/IConfigProvider.js';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from '../../../shared/errors/InfrastructureError.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { FileSystemMemoryDocumentRepository } from './FileSystemMemoryDocumentRepository.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * File system implementation of global memory bank repository
 */
export class FileSystemGlobalMemoryBankRepository implements IGlobalMemoryBankRepository {
  private readonly documentRepository: FileSystemMemoryDocumentRepository;
  private readonly globalMemoryPath: string;
  private readonly defaultStructure: Record<string, string> = {
    'architecture.md':
      '# システムアーキテクチャ\n\ntags: #architecture #system-design\n\n## 概要\n\n[システムアーキテクチャの説明]\n\n## コンポーネント\n\n[主要なシステムコンポーネントの一覧と説明]\n\n## 設計上の決定事項\n\n[重要なアーキテクチャ上の決定事項]\n',
    'coding-standards.md':
      '# コーディング規約\n\ntags: #standards #best-practices\n\n## 一般的なガイドライン\n\n[一般的なコーディングガイドライン]\n\n## 言語固有の規約\n\n[言語固有の規約について]\n',
    'domain-models.md':
      '# ドメインモデル\n\ntags: #domain #models #architecture\n\n## コアモデル\n\n[コアドメインモデルの定義]\n\n## 関連性\n\n[モデル間の関連性について]\n',
    'glossary.md':
      '# 用語集\n\ntags: #glossary #terminology\n\n## 用語\n\n[プロジェクト固有の用語の一覧と定義]\n\n## 略語\n\n[よく使用される略語の一覧と定義]\n',
    'tech-stack.md':
      '# 技術スタック\n\ntags: #tech-stack #infrastructure\n\n## バックエンド技術\n\n[バックエンド技術の一覧]\n\n## フロントエンド技術\n\n[フロントエンド技術の一覧]\n\n## インフラストラクチャ\n\n[インフラストラクチャコンポーネントの説明]\n',
    'user-guide.md':
      '# ユーザーガイド\n\ntags: #guide #documentation\n\n## 概要\n\n[システムの概要]\n\n## 使用方法\n\n[システムの使用方法について]\n',
    'tags/index.md':
      '# タグインデックス\n\ntags: #index #meta\n\n## タグ一覧\n\n[タグの一覧と説明]\n',
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
    this.globalMemoryPath = this.configProvider.getGlobalMemoryPath();
    this.documentRepository = new FileSystemMemoryDocumentRepository(
      this.globalMemoryPath,
      this.fileSystemService
    );
  }

  /**
   * Initialize global memory bank
   * @returns Promise resolving when initialization is complete
   */
  async initialize(): Promise<void> {
    try {
      logger.debug('Initializing global memory bank');

      // Ensure the directory exists
      await this.fileSystemService.createDirectory(this.globalMemoryPath);
      await this.fileSystemService.createDirectory(path.join(this.globalMemoryPath, 'tags'));

      // Check if files exist, create default structure if needed
      await this.ensureDefaultStructure();

      // Update tags index
      await this.updateTagsIndex();

      logger.debug('Global memory bank initialized');
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to initialize global memory bank: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get document from global memory bank
   * @param path Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  async getDocument(path: DocumentPath): Promise<MemoryDocument | null> {
    try {
      return await this.documentRepository.findByPath(path);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get document from global memory bank: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Save document to global memory bank
   * @param document Document to save
   * @returns Promise resolving when done
   */
  async saveDocument(document: MemoryDocument): Promise<void> {
    try {
      await this.documentRepository.save(document);

      // Update tags index if document is markdown
      if (document.isMarkdown) {
        await this.updateTagsIndex();
      }
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save document to global memory bank: ${document.path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Delete document from global memory bank
   * @param path Document path
   * @returns Promise resolving to boolean indicating success
   */
  async deleteDocument(path: DocumentPath): Promise<boolean> {
    try {
      const result = await this.documentRepository.delete(path);

      // Update tags index if document was deleted
      if (result) {
        await this.updateTagsIndex();
      }

      return result;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete document from global memory bank: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * List all documents in global memory bank
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(): Promise<DocumentPath[]> {
    try {
      return await this.documentRepository.list();
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list documents in global memory bank`,
        { originalError: error }
      );
    }
  }

  /**
   * Find documents by tags in global memory bank
   * @param tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  async findDocumentsByTags(tags: Tag[]): Promise<MemoryDocument[]> {
    try {
      return await this.documentRepository.findByTags(tags);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to find documents by tags in global memory bank`,
        { originalError: error }
      );
    }
  }

  /**
   * Update tags index in global memory bank
   * @returns Promise resolving when done
   */
  async updateTagsIndex(): Promise<void> {
    try {
      logger.debug('Updating global memory bank tags index');

      // Get all documents
      const allPaths = await this.listDocuments();
      const documents: MemoryDocument[] = [];

      for (const docPath of allPaths) {
        // Skip the tags index itself
        if (docPath.value === 'tags/index.md') {
          continue;
        }

        const doc = await this.getDocument(docPath);
        if (doc) {
          documents.push(doc);
        }
      }

      // Collect all tags with their documents
      const tagMap: Map<string, { count: number; documents: string[] }> = new Map();

      for (const doc of documents) {
        for (const tag of doc.tags) {
          const existing = tagMap.get(tag.value);

          if (existing) {
            existing.count += 1;
            existing.documents.push(doc.path.value);
          } else {
            tagMap.set(tag.value, {
              count: 1,
              documents: [doc.path.value],
            });
          }
        }
      }

      // Create tags index content
      let indexContent = '# タグインデックス\n\ntags: #index #meta\n\n';

      // Add table header
      indexContent += '| タグ | 件数 | ドキュメント |\n';
      indexContent += '|-----|------|-------------|\n';

      // Sort tags by name
      const sortedTags = Array.from(tagMap.keys()).sort();

      for (const tag of sortedTags) {
        const info = tagMap.get(tag)!;

        // Format document links
        const docLinks = info.documents
          .map((d) => {
            // Get doc title if possible
            const doc = documents.find((doc) => doc.path.value === d);
            const title = doc?.title || d;

            return `[${title}](/${d})`;
          })
          .join(', ');

        indexContent += `| #${tag} | ${info.count} | ${docLinks} |\n`;
      }

      // Create or update tags index
      const indexPath = DocumentPath.create('tags/index.md');

      // Get current document if exists
      const currentIndex = await this.getDocument(indexPath);

      if (currentIndex) {
        await this.saveDocument(currentIndex.updateContent(indexContent));
      } else {
        const newIndex = MemoryDocument.create({
          path: indexPath,
          content: indexContent,
          tags: [Tag.create('index'), Tag.create('meta')],
          lastModified: new Date(),
        });

        await this.saveDocument(newIndex);
      }

      logger.debug('Global memory bank tags index updated');
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to update tags index in global memory bank: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Validate global memory bank structure
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  async validateStructure(): Promise<boolean> {
    try {
      logger.debug('Validating global memory bank structure');

      // Check if directory exists
      const dirExists = await this.fileSystemService.directoryExists(this.globalMemoryPath);

      if (!dirExists) {
        return false;
      }

      // Check if tags directory exists
      const tagsDir = path.join(this.globalMemoryPath, 'tags');
      const tagsDirExists = await this.fileSystemService.directoryExists(tagsDir);

      if (!tagsDirExists) {
        return false;
      }

      // Check if required files exist
      for (const filePath of Object.keys(this.defaultStructure)) {
        const fullPath = path.join(this.globalMemoryPath, filePath);
        const fileExists = await this.fileSystemService.fileExists(fullPath);

        if (!fileExists) {
          return false;
        }
      }

      logger.debug('Global memory bank structure is valid');
      return true;
    } catch (error) {
      logger.error('Error validating global memory bank structure', error);
      return false;
    }
  }

  /**
   * Ensure default structure exists
   * @returns Promise resolving when done
   */
  private async ensureDefaultStructure(): Promise<void> {
    try {
      logger.debug('Ensuring global memory bank default structure');

      for (const [relativePath, content] of Object.entries(this.defaultStructure)) {
        const fullPath = path.join(this.globalMemoryPath, relativePath);

        // Create directory if needed
        const dirPath = path.dirname(fullPath);
        await this.fileSystemService.createDirectory(dirPath);

        // Check if file exists
        const fileExists = await this.fileSystemService.fileExists(fullPath);

        if (!fileExists) {
          // Create file with default content
          await this.fileSystemService.writeFile(fullPath, content);
          logger.debug(`Created default file: ${relativePath}`);
        }
      }

      logger.debug('Global memory bank default structure ensured');
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to ensure default structure: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
