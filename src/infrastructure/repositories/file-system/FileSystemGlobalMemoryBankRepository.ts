import path from 'node:path';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import type { IGlobalMemoryBankRepository } from '../../../domain/repositories/IGlobalMemoryBankRepository.js';
import type { TagIndex } from '../../../schemas/tag-index/tag-index-schema.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IConfigProvider } from '../../config/index.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import { FileSystemMemoryDocumentRepository } from './FileSystemMemoryDocumentRepository.js';


/**
 * File system implementation of global memory bank repository
 */
export class FileSystemGlobalMemoryBankRepository implements IGlobalMemoryBankRepository {
  private readonly documentRepository: FileSystemMemoryDocumentRepository;
  private readonly globalMemoryPath: string;
  private readonly defaultStructure: Record<string, string> = {
    'architecture.json':
      '{\n  "schema": "memory_document_v2",\n  "metadata": {\n    "id": "architecture",\n    "title": "システムアーキテクチャ",\n    "documentType": "generic",\n    "path": "architecture.json",\n    "tags": ["architecture", "system-design"],\n    "lastModified": "' + new Date().toISOString() + '",\n    "createdAt": "' + new Date().toISOString() + '",\n    "version": 1\n  },\n  "content": {\n    "sections": [\n      {\n        "title": "概要",\n        "content": "[システムアーキテクチャの説明]"\n      },\n      {\n        "title": "コンポーネント",\n        "content": "[主要なシステムコンポーネントの一覧と説明]"\n      },\n      {\n        "title": "設計上の決定事項",\n        "content": "[重要なアーキテクチャ上の決定事項]"\n      }\n    ]\n  }\n}',
    'coding-standards.json':
      '{\n  "schema": "memory_document_v2",\n  "metadata": {\n    "id": "coding-standards",\n    "title": "コーディング規約",\n    "documentType": "generic",\n    "path": "coding-standards.json",\n    "tags": ["standards", "best-practices"],\n    "lastModified": "' + new Date().toISOString() + '",\n    "createdAt": "' + new Date().toISOString() + '",\n    "version": 1\n  },\n  "content": {\n    "sections": [\n      {\n        "title": "一般的なガイドライン",\n        "content": "[一般的なコーディングガイドライン]"\n      },\n      {\n        "title": "言語固有の規約",\n        "content": "[言語固有の規約について]"\n      }\n    ]\n  }\n}',
    'domain-models.json':
      '{\n  "schema": "memory_document_v2",\n  "metadata": {\n    "id": "domain-models",\n    "title": "ドメインモデル",\n    "documentType": "generic",\n    "path": "domain-models.json",\n    "tags": ["domain", "models", "architecture"],\n    "lastModified": "' + new Date().toISOString() + '",\n    "createdAt": "' + new Date().toISOString() + '",\n    "version": 1\n  },\n  "content": {\n    "sections": [\n      {\n        "title": "コアモデル",\n        "content": "[コアドメインモデルの定義]"\n      },\n      {\n        "title": "関連性",\n        "content": "[モデル間の関連性について]"\n      }\n    ]\n  }\n}',
    'glossary.json':
      '{\n  "schema": "memory_document_v2",\n  "metadata": {\n    "id": "glossary",\n    "title": "用語集",\n    "documentType": "generic",\n    "path": "glossary.json",\n    "tags": ["glossary", "terminology"],\n    "lastModified": "' + new Date().toISOString() + '",\n    "createdAt": "' + new Date().toISOString() + '",\n    "version": 1\n  },\n  "content": {\n    "sections": [\n      {\n        "title": "用語",\n        "content": "[プロジェクト固有の用語の一覧と定義]"\n      },\n      {\n        "title": "略語",\n        "content": "[よく使用される略語の一覧と定義]"\n      }\n    ]\n  }\n}',
    'tech-stack.json':
      '{\n  "schema": "memory_document_v2",\n  "metadata": {\n    "id": "tech-stack",\n    "title": "技術スタック",\n    "documentType": "generic",\n    "path": "tech-stack.json",\n    "tags": ["tech-stack", "infrastructure"],\n    "lastModified": "' + new Date().toISOString() + '",\n    "createdAt": "' + new Date().toISOString() + '",\n    "version": 1\n  },\n  "content": {\n    "sections": [\n      {\n        "title": "バックエンド技術",\n        "content": "[バックエンド技術の一覧]"\n      },\n      {\n        "title": "フロントエンド技術",\n        "content": "[フロントエンド技術の一覧]"\n      },\n      {\n        "title": "インフラストラクチャ",\n        "content": "[インフラストラクチャコンポーネントの説明]"\n      }\n    ]\n  }\n}',
    'user-guide.json':
      '{\n  "schema": "memory_document_v2",\n  "metadata": {\n    "id": "user-guide",\n    "title": "ユーザーガイド",\n    "documentType": "generic",\n    "path": "user-guide.json",\n    "tags": ["guide", "documentation"],\n    "lastModified": "' + new Date().toISOString() + '",\n    "createdAt": "' + new Date().toISOString() + '",\n    "version": 1\n  },\n  "content": {\n    "sections": [\n      {\n        "title": "概要",\n        "content": "[システムの概要]"\n      },\n      {\n        "title": "使用方法",\n        "content": "[システムの使用方法について]"\n      }\n    ]\n  }\n}',
    'tags/index.json':
      '{\n  "schema": "memory_document_v2",\n  "metadata": {\n    "id": "tags-index",\n    "title": "タグインデックス",\n    "documentType": "generic",\n    "path": "tags/index.json",\n    "tags": ["index", "meta"],\n    "lastModified": "' + new Date().toISOString() + '",\n    "createdAt": "' + new Date().toISOString() + '",\n    "version": 1\n  },\n  "content": {\n    "sections": [\n      {\n        "title": "タグ一覧",\n        "content": "[タグの一覧と説明]"\n      }\n    ]\n  }\n}',
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

      // Create tag index if needed
      try {
        await this.updateTagsIndex();
      } catch (tagIndexError) {
        // Log error but don't fail initialization
        logger.error('Failed to update tags index, but continuing initialization:', tagIndexError);
        logger.warn('Some documents may have invalid tags. Consider running a repair script.');
      }

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

      // Update tags index if document is markdown or JSON
      if ((document.isMarkdown || document.isJSON) && document.path.value !== 'tags/index.md' && document.path.value !== 'tags/index.json') {
        // Generate and save the tag index
        await this.generateAndSaveTagIndex();
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
      // 事前にファイルの存在を確認
      const document = await this.getDocument(path);
      if (!document) {
        return false;
      }

      const result = await this.documentRepository.delete(path);

      // Update tags index if document was deleted
      if (result && path.value !== 'tags/index.md' && path.value !== 'tags/index.json') {
        // Generate and save the tag index
        await this.generateAndSaveTagIndex();
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
   * Generate and save tag index from all documents
   * @returns Promise resolving when done
   */
  async generateAndSaveTagIndex(): Promise<void> {
    try {
      logger.debug('Generating global tag index');

      // Get all documents
      const allPaths = await this.listDocuments();
      const documents: MemoryDocument[] = [];

      for (const docPath of allPaths) {
        // Skip the tags index itself
        if (docPath.value === 'tags/index.json' || docPath.value === 'tags/index.md') {
          continue;
        }

        const doc = await this.getDocument(docPath);
        if (doc) {
          documents.push(doc);
        }
      }

      // Create tag index
      const tagIndex: TagIndex = {
        schema: 'tag_index_v1',
        metadata: {
          updatedAt: new Date().toISOString(),
          documentCount: documents.length,
          fullRebuild: true,
          context: 'global',
        },
        index: {},
      };

      // Collect documents by tag
      for (const doc of documents) {
        for (const tag of doc.tags) {
          if (!tagIndex.index[tag.value]) {
            tagIndex.index[tag.value] = [];
          }
          tagIndex.index[tag.value].push(doc.path.value);
        }
      }

      // Save the tag index
      await this.saveTagIndex(tagIndex);

      // Also update the legacy tags index file
      await this.updateLegacyTagsIndex();

      logger.debug('Global tag index generated and saved');
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to generate and save tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Updates the legacy tags/index.md file for backward compatibility
   * @returns Promise resolving when done
   */
  async updateLegacyTagsIndex(): Promise<void> {
    try {
      logger.debug('Updating legacy tags index file');

      // Get all documents
      const allPaths = await this.listDocuments();
      const documents: MemoryDocument[] = [];

      for (const docPath of allPaths) {
        // Skip the tags index itself
        if (docPath.value === 'tags/index.json' || docPath.value === 'tags/index.md') {
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

      // Create JSON tags index
      const tagsDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "tags-index",
          title: "タグインデックス",
          documentType: "generic",
          path: "tags/index.json",
          tags: ["index", "meta"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          sections: [
            {
              title: "タグ一覧",
              content: "タグとドキュメントの関連付け"
            }
          ],
          tagMap: Object.fromEntries(
            Array.from(tagMap.entries()).map(([tag, info]) => {
              return [tag, {
                count: info.count,
                documents: info.documents.map(d => {
                  const doc = documents.find((doc) => doc.path.value === d);
                  return {
                    path: d,
                    title: doc?.title || d
                  };
                })
              }];
            })
          )
        }
      };

      // Convert to JSON string with pretty formatting
      const indexContent = JSON.stringify(tagsDocument, null, 2);

      // Direct path - used to avoid circular reference
      const indexPath = DocumentPath.create('tags/index.json');
      const fullPath = path.join(this.globalMemoryPath, indexPath.value);
      await this.fileSystemService.createDirectory(path.dirname(fullPath));
      await this.fileSystemService.writeFile(fullPath, indexContent);

      logger.debug('Legacy tags index file updated');
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to update legacy tags index file: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Update tags index in global memory bank (legacy method)
   * @param skipSaveDocument Optional flag to skip saveDocument to prevent circular references
   * @returns Promise resolving when done
   * @deprecated Use generateAndSaveTagIndex instead
   */
  async updateTagsIndex(skipSaveDocument: boolean = false): Promise<void> {
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

      // Create JSON tags index
      const tagsDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "tags-index",
          title: "タグインデックス",
          documentType: "generic",
          path: "tags/index.json",
          tags: ["index", "meta"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          sections: [
            {
              title: "タグ一覧",
              content: "タグとドキュメントの関連付け"
            }
          ],
          tagMap: Object.fromEntries(
            Array.from(tagMap.entries()).map(([tag, info]) => {
              return [tag, {
                count: info.count,
                documents: info.documents.map(d => {
                  const doc = documents.find((doc) => doc.path.value === d);
                  return {
                    path: d,
                    title: doc?.title || d
                  };
                })
              }];
            })
          )
        }
      };

      // Convert to JSON string with pretty formatting
      const indexContent = JSON.stringify(tagsDocument, null, 2);

      // Create or update tags index
      const indexPath = DocumentPath.create('tags/index.json');

      if (!skipSaveDocument) {
        // Normal path - might cause circular reference if called from saveDocument
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
      } else {
        // Direct path - used when called from saveDocument to avoid circular reference
        const fullPath = path.join(this.globalMemoryPath, indexPath.value);
        await this.fileSystemService.createDirectory(path.dirname(fullPath));
        await this.fileSystemService.writeFile(fullPath, indexContent);
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
   * Save tag index for global memory bank
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveTagIndex(tagIndex: TagIndex): Promise<void> {
    try {
      logger.debug('Saving global tag index');

      const indexPath = path.join(this.globalMemoryPath, '_global_index.json');

      // Convert to JSON string with pretty formatting
      const jsonContent = JSON.stringify(tagIndex, null, 2);

      // Write to file
      await this.fileSystemService.writeFile(indexPath, jsonContent);

      logger.debug('Global tag index saved');
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get tag index for global memory bank
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getTagIndex(): Promise<TagIndex | null> {
    try {
      logger.debug('Getting global tag index');

      const indexPath = path.join(this.globalMemoryPath, '_global_index.json');

      // Check if file exists
      const exists = await this.fileSystemService.fileExists(indexPath);

      if (!exists) {
        logger.debug('No global tag index found');
        return null;
      }

      // Read file content
      const content = await this.fileSystemService.readFile(indexPath);

      // Parse JSON
      const tagIndex = JSON.parse(content) as TagIndex;

      logger.debug('Global tag index loaded');
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
        `Failed to get global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Find documents by tags in global memory bank using index
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags (AND); if false, any tag (OR)
   * @returns Promise resolving to array of document paths
   */
  async findDocumentPathsByTagsUsingIndex(
    tags: Tag[],
    matchAll: boolean = false
  ): Promise<DocumentPath[]> {
    try {
      logger.debug('Finding documents by tags using index in global memory bank');

      // Get tag index
      const tagIndex = await this.getTagIndex();

      if (!tagIndex) {
        // Fall back to regular method if no index exists
        logger.debug('No tag index found, falling back to regular method');
        const docs = await this.findDocumentsByTags(tags);
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
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags using index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

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
