import path from 'node:path';
import type { GlobalTagIndex, Language } from '@memory-bank/schemas';

// TagIndex interface defined internally (not provided by schema package)
export interface TagIndex {
  schema: string;
  metadata: {
    updatedAt: string;
    documentCount: number;
    fullRebuild: boolean;
    context: string;
  };
  index: Record<string, string[]>;
}

import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import type { IGlobalMemoryBankRepository } from '../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import {
  InfrastructureError,
  InfrastructureErrors
} from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IConfigProvider } from '../../config/index.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';
import { DocumentOperations } from './DocumentOperations.js';
import { TagOperations } from './TagOperations.js';
import { PathOperations } from './PathOperations.js';
import { BulkOperations } from './BulkOperations.js';

/**
 * File system implementation of global memory bank repository
 * Using component-based approach with responsibility segregation
 */
export class FileSystemGlobalMemoryBankRepository
  extends FileSystemMemoryBankRepositoryBase
  implements IGlobalMemoryBankRepository {
  private readonly componentLogger = logger.withContext({ component: 'FileSystemGlobalMemoryBankRepository' });

  private readonly documentOps: DocumentOperations;
  private readonly tagOps: TagOperations;
  private readonly pathOps: PathOperations;
  private readonly bulkOps: BulkOperations;

  private globalMemoryPath!: string;
  private language: Language = 'en';

  /**
   * Constructor
   * @param fileSystemService File system service
   * @param configProvider Configuration provider
   */
  constructor(
    fileSystemService: IFileSystemService,
    protected readonly configProvider: IConfigProvider
  ) {
    super(fileSystemService, configProvider);

    this.documentOps = new DocumentOperations(
      '', // Path set in setup()
      fileSystemService,
      configProvider
    );

    this.tagOps = new TagOperations(
      '', // Path set in setup()
      fileSystemService,
      configProvider
    );

    this.pathOps = new PathOperations(
      '', // Path set in setup()
      fileSystemService,
      configProvider
    );

    this.bulkOps = new BulkOperations(
      '', // Path set in setup()
      fileSystemService,
      configProvider
    );
  }

  /**
   * Ensure default structure exists
   */
  private async ensureDefaultStructure(): Promise<void> {
    const operation = 'ensureDefaultStructure';
    this.componentLogger.debug(`Starting ${operation}`);
    try {
      for (const [relativePath, content] of Object.entries(this.defaultStructure)) {
        const fullPath = path.join(this.globalMemoryPath, relativePath);
        const dirPath = path.dirname(fullPath);

        await this.pathOps.createDirectory(dirPath);
        const fileExists = await this.fileExists(fullPath);

        if (!fileExists) {
          this.componentLogger.debug(`Default file does not exist, creating...`, { operation, relativePath, fullPath });
          await this.writeFile(fullPath, content);
          this.componentLogger.info(`Created default file`, { operation, relativePath });
        } else {
           this.componentLogger.debug(`Default file already exists`, { operation, relativePath, fullPath });
        }
      }
      this.componentLogger.info(`${operation} completed successfully`);
    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { error });
      // Wrap error using factory
      throw InfrastructureErrors.fileSystemError(
        `Failed to ${operation}: ${(error as Error).message}`,
        { cause: error instanceof Error ? error : undefined, operation }
      );
    }
  }

  /**
   * Get document from global memory bank
   * @param path Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  async getDocument(path: DocumentPath): Promise<MemoryDocument | null> {
    const operation = 'getGlobalDocument';
    this.componentLogger.debug(`Starting ${operation}`, { documentPath: path.value });
    try {
      await this.setup();
      const document = await this.documentOps.getDocument(path);
      this.componentLogger.debug(`${operation} completed`, { documentPath: path.value, found: !!document });
      return document;

    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { documentPath: path.value, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }
      // Wrap unknown errors using the factory, include cause in details
      throw InfrastructureErrors.fileReadError(
        `Failed to get global document: ${path.value}`,
        { operation, documentPath: path.value, cause: error instanceof Error ? error : undefined }
      );
    }
  }

  /**
   * Save document to global memory bank
   * @param document Document to save
   * @returns Promise resolving when done
   */
  async saveDocument(document: MemoryDocument): Promise<void> {
    const operation = 'saveGlobalDocument';
    const documentPathValue = document.path.value;
    this.componentLogger.debug(`Starting ${operation}`, { documentPath: documentPathValue });

    try {
      await this.setup();
      await this.documentOps.saveDocument(document);
      this.componentLogger.debug(`Document saved via documentOps`, { documentPath: documentPathValue });

      const isIndexFile = documentPathValue === 'tags/index.md' ||
                          documentPathValue === 'tags/index.json' ||
                          documentPathValue === '_global_index.json';

      if (!isIndexFile) {
        this.componentLogger.debug(`Document is not an index file, refreshing tag index`, { documentPath: documentPathValue });
        await this.refreshTagIndex();
      } else {
         this.componentLogger.debug(`Document is an index file, skipping tag index refresh`, { documentPath: documentPathValue });
      }
      this.componentLogger.info(`${operation} completed successfully`, { documentPath: documentPathValue });

    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { documentPath: documentPathValue, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }
      // Wrap unknown errors using the factory, include cause in details
      throw InfrastructureErrors.fileWriteError(
        `Failed to save global document: ${documentPathValue}`,
        { operation, documentPath: documentPathValue, cause: error instanceof Error ? error : undefined }
      );
    }
  }

  /**
   * Delete document from global memory bank
   * @param path Document path
   * @returns Promise resolving to boolean indicating success
   */
  async deleteDocument(path: DocumentPath): Promise<boolean> {
    const operation = 'deleteGlobalDocument';
    const documentPathValue = path.value;
    this.componentLogger.debug(`Starting ${operation}`, { documentPath: documentPathValue });

    try {
      await this.setup();
      const document = await this.getDocument(path);
      if (!document) {
        this.componentLogger.warn(`Document not found, cannot delete`, { operation, documentPath: documentPathValue });
        return false;
      }
      this.componentLogger.debug(`Document found, proceeding with deletion`, { documentPath: documentPathValue });

      const result = await this.documentOps.deleteDocument(path);
      this.componentLogger.debug(`Deletion result from documentOps`, { documentPath: documentPathValue, deleted: result });

      const isIndexFile = documentPathValue === 'tags/index.md' ||
                          documentPathValue === 'tags/index.json' ||
                          documentPathValue === '_global_index.json';

      if (result && !isIndexFile) {
         this.componentLogger.debug(`Document deleted and is not an index file, refreshing tag index`, { documentPath: documentPathValue });
        await this.refreshTagIndex();
      } else if (result) {
         this.componentLogger.debug(`Document deleted but is an index file, skipping tag index refresh`, { documentPath: documentPathValue });
      }

      this.componentLogger.info(`${operation} completed`, { documentPath: documentPathValue, deleted: result });
      return result;

    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { documentPath: documentPathValue, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }
      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileSystemError(
        `Failed to ${operation} for document ${documentPathValue}: ${(error as Error).message}`,
        { cause: error instanceof Error ? error : undefined, operation, documentPath: documentPathValue }
      );
    }
  }

  /**
   * List all documents in global memory bank
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(): Promise<DocumentPath[]> {
    const operation = 'listGlobalDocuments';
    this.componentLogger.debug(`Starting ${operation}`);
    try {
      await this.setup();
      const paths = await this.documentOps.listDocuments();
      this.componentLogger.info(`${operation} completed successfully`, { count: paths.length });
      return paths;

    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }
      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileSystemError(
        `Failed to ${operation}: ${(error as Error).message}`,
        { cause: error instanceof Error ? error : undefined, operation }
      );
    }
  }

  /**
   * Find documents by tags in global memory bank
   * @param tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  async findDocumentsByTags(tags: Tag[]): Promise<MemoryDocument[]> {
    const operation = 'findGlobalDocumentsByTags';
    const tagValues = tags.map(t => t.value);
    this.componentLogger.debug(`Starting ${operation}`, { tags: tagValues });

    try {
      await this.setup();
      const paths = await this.findDocumentPathsByTagsUsingIndex(tags, false);
      this.componentLogger.debug(`Found paths using index (or fallback)`, { count: paths.length });
      const documents: MemoryDocument[] = [];

      for (const docPath of paths) {
        const doc = await this.getDocument(docPath);
        if (doc) {
          documents.push(doc);
        } else {
           this.componentLogger.warn(`Document path found by index but document not retrieved`, { operation, documentPath: docPath.value });
        }
      }
      this.componentLogger.info(`${operation} completed successfully`, { tags: tagValues, foundCount: documents.length });
      return documents;

    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { tags: tagValues, error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }
      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileSystemError(
        `Failed to ${operation}: ${(error as Error).message}`,
        { cause: error instanceof Error ? error : undefined, operation, tags: tagValues }
      );
    }
  }

  /**
   * Refresh all tag indexes (internal helper)
   */
  private async refreshTagIndex(): Promise<void> {
    const operation = 'refreshGlobalTagIndex';
    this.componentLogger.debug(`Starting ${operation}`);
    try {
      await this.setup();
      const tagIndex = await this.tagOps.generateGlobalTagIndex();
      this.componentLogger.debug(`Generated global tag index`);

      await this.saveTagIndex(tagIndex);
      this.componentLogger.info(`${operation} completed successfully`);

      // Deprecated legacy index update removed (dd-deprecate-legacy-index)
    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { error });
    }
  }

  /**
   * Validate global memory bank structure
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  async validateStructure(): Promise<boolean> {
    const operation = 'validateGlobalStructure';
    this.componentLogger.debug(`Starting ${operation}`);
    try {
      await this.setup();
      this.componentLogger.debug(`Setup complete, proceeding with validation`);

      const dirExists = await this.pathOps.directoryExists(this.globalMemoryPath);
      if (!dirExists) {
        this.componentLogger.warn(`Global memory bank directory does not exist`, { operation, path: this.globalMemoryPath });
        return false;
      }
       this.componentLogger.debug(`Global directory exists`, { path: this.globalMemoryPath });

      const tagsDir = path.join(this.globalMemoryPath, 'tags');
      const tagsDirExists = await this.pathOps.directoryExists(tagsDir);
      if (!tagsDirExists) {
         this.componentLogger.warn(`Tags directory does not exist`, { operation, path: tagsDir });
        return false;
      }
      this.componentLogger.debug(`Tags directory exists`, { path: tagsDir });

      for (const filePath of Object.keys(this.defaultStructure)) {
        const fullPath = path.join(this.globalMemoryPath, filePath);
        const fileExists = await this.fileExists(fullPath);
        if (!fileExists) {
           this.componentLogger.warn(`Required default file missing`, { operation, filePath, fullPath });
          return false;
        }
         this.componentLogger.debug(`Required default file exists`, { filePath, fullPath });
      }

      this.componentLogger.info(`${operation} completed successfully, structure is valid`);
      return true;

    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { error });
      return false;
    }
  }

  /**
   * Save tag index for global memory bank
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveTagIndex(tagIndex: GlobalTagIndex): Promise<void> {
    const operation = 'saveGlobalTagIndex';
    this.componentLogger.debug(`Starting ${operation}`, { indexSchema: tagIndex.schema, indexType: tagIndex.metadata.indexType });
    try {
      await this.setup();
      await this.tagOps.saveGlobalTagIndex(tagIndex);
      this.componentLogger.info(`${operation} completed successfully`);

    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }
      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileWriteError(
        'Global Tag Index',
        { operation, reason: 'Failed during tag index saving', cause: error instanceof Error ? error : undefined }
      );
    }
  }

  /**
   * Get tag index for global memory bank
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getTagIndex(): Promise<GlobalTagIndex | null> {
    const operation = 'getGlobalTagIndex';
    this.componentLogger.debug(`Starting ${operation}`);
    try {
      await this.setup();
      const result = await this.tagOps.getGlobalTagIndex();
      this.componentLogger.info(`${operation} completed successfully`, { found: !!result });
      return result;

    } catch (error) {
       this.componentLogger.error(`Error during ${operation}`, { error });
       if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }
      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileReadError(
        'Global Tag Index',
        { operation, reason: 'Failed during tag index retrieval', cause: error instanceof Error ? error : undefined }
      );
    }
  }

  /**
   * Update tags index in global memory bank (legacy method)
   * @returns Promise resolving when done
   * @deprecated Use saveTagIndex instead
   */
  async updateTagsIndex(): Promise<void> {
    const operation = 'updateTagsIndex (legacy)';
    this.componentLogger.debug(`Starting ${operation}`);
    try {
      await this.setup();
      await this.refreshTagIndex();
      this.componentLogger.info(`${operation} completed successfully by calling refreshTagIndex`);

    } catch (error) {
      this.componentLogger.error(`Error during ${operation}`, { error });
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }
      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileSystemError(
        `Failed to ${operation}: ${(error as Error).message}`,
        { cause: error instanceof Error ? error : undefined, operation }
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
    const operation = 'findGlobalDocumentPathsByTagsUsingIndex';
    const tagValues = tags.map(t => t.value);
    this.componentLogger.debug(`Starting ${operation}`, { tags: tagValues, matchAll });

    try {
      await this.setup();
      const paths = await this.tagOps.findDocumentPathsByTagsUsingIndex(tags, undefined, matchAll);
      this.componentLogger.info(`${operation} completed successfully using index`, { tags: tagValues, matchAll, foundCount: paths.length });
      return paths;

    } catch (error) {
      this.componentLogger.warn(`Tag index search failed, falling back to findDocumentsByTags`, { operation, tags: tagValues, matchAll, error });


            try {
              // Call findDocumentPathsByTags instead and use the result directly
              const paths = await this.tagOps.findDocumentPathsByTags(tags, matchAll); // Removed undefined argument
              this.componentLogger.info(`${operation} completed successfully via fallback`, { tags: tagValues, matchAll, foundCount: paths.length });
      } catch (fallbackError) {
         this.componentLogger.error(`Error during ${operation} (including fallback)`, { tags: tagValues, matchAll, indexError: error, fallbackError });
         if (fallbackError instanceof DomainError || fallbackError instanceof InfrastructureError) {
           throw fallbackError;
         }
         // Wrap unknown errors from fallback using the factory
         throw InfrastructureErrors.fileSystemError(
           `Failed to ${operation} (including fallback): ${(fallbackError as Error).message}`,
           { cause: fallbackError instanceof Error ? fallbackError : undefined, operation, tags: tagValues, matchAll }
         );
      }
    }
    // Add return statement for the outer catch block in case of index search failure but fallback also fails unexpectedly
    // Although the inner catch re-throws, this satisfies the compiler.
    return [];
  }

  /**
   * Setup repository with configuration
   * This should be called before using the repository
   */
  private async setup(): Promise<void> {
    const operation = 'setupGlobalRepository';
    if (!this.globalMemoryPath) {
      this.componentLogger.debug(`Performing initial setup for ${operation}`);
      this.globalMemoryPath = this.configProvider.getGlobalMemoryPath();
      this.componentLogger.debug(`Global memory path set`, { operation, path: this.globalMemoryPath });

      (this.documentOps as any).basePath = this.globalMemoryPath;
      (this.tagOps as any).basePath = this.globalMemoryPath;
      (this.pathOps as any).basePath = this.globalMemoryPath;
      (this.bulkOps as any).basePath = this.globalMemoryPath;
       this.componentLogger.debug(`Operation component paths updated`, { operation });
    }

    const newLanguage = this.configProvider.getLanguage();
    if (this.language !== newLanguage) {
       this.componentLogger.debug(`Language updated`, { operation, oldLanguage: this.language, newLanguage });
       this.language = newLanguage;
    }
  }

  /**
   * Get default templates based on current language
   */
  private get defaultStructure(): Record<string, string> {
    switch (this.language) {
      case 'ja':
        return this.getJapaneseTemplates();
      case 'zh':
        return this.getChineseTemplates();
      default:
        return this.getEnglishTemplates();
    }
  }

  /**
   * Get English templates for default structure
   * @returns Record of file paths to template content
   */
  private getEnglishTemplates(): Record<string, string> {
    return {
      'tags/index.json': `{
  "schema": "memory_document_v2",
  "metadata": {
    "id": "tags-index",
    "title": "Tags Index",
    "documentType": "generic",
    "path": "tags/index.json",
    "tags": ["index", "meta"],
    "lastModified": "${new Date().toISOString()}",
    "createdAt": "${new Date().toISOString()}",
    "version": 1
  },
  "content": {
    "sections": [
      {
        "title": "Tags List",
        "content": "[List and description of tags]"
      }
    ]
  }
}`
    };
  }

  /**
   * Get Japanese templates for default structure
   * @returns Record of file paths to template content
   */
  private getJapaneseTemplates(): Record<string, string> {
    return {
      'tags/index.json': `{
  "schema": "memory_document_v2",
  "metadata": {
    "id": "tags-index",
    "title": "タグインデックス",
    "documentType": "generic",
    "path": "tags/index.json",
    "tags": ["index", "meta"],
    "lastModified": "${new Date().toISOString()}",
    "createdAt": "${new Date().toISOString()}",
    "version": 1
  },
  "content": {
    "sections": [
      {
        "title": "タグ一覧",
        "content": "[タグの一覧と説明]"
      }
    ]
  }
}`
    };
  }

  /**
   * Get Chinese templates for default structure
   * @returns Record of file paths to template content
   */
  private getChineseTemplates(): Record<string, string> {
    return {
      'tags/index.json': `{
  "schema": "memory_document_v2",
  "metadata": {
    "id": "tags-index",
    "title": "标签索引",
    "documentType": "generic",
    "path": "tags/index.json",
    "tags": ["index", "meta"],
    "lastModified": "${new Date().toISOString()}",
    "createdAt": "${new Date().toISOString()}",
    "version": 1
  },
  "content": {
    "sections": [
      {
        "title": "标签列表",
        "content": "[标签列表和描述]"
      }
    ]
  }
}`
    };
  }

  /**
   * Initialize global memory bank
   * @returns Promise resolving when initialization is complete
   */
  async initialize(): Promise<void> {
    const operation = 'initializeGlobalMemoryBank';
    this.componentLogger.debug(`Starting ${operation}`);
    try {
      await this.setup();
      await this.pathOps.createDirectory(this.globalMemoryPath);
      await this.pathOps.createDirectory(path.join(this.globalMemoryPath, 'tags'));
      this.componentLogger.debug(`Base directories ensured`, { operation });

      await this.ensureDefaultStructure();

      try {
        await this.refreshTagIndex();
      } catch (tagIndexError) {
        this.componentLogger.error(`Failed during initial tag index refresh, but continuing initialization`, { operation, error: tagIndexError });
        this.componentLogger.warn(`Some documents may have invalid tags. Consider running a repair script.`, { operation });
      }

      this.componentLogger.info(`${operation} completed successfully`);

    } catch (error) {
       this.componentLogger.error(`Error during ${operation}`, { error });
       if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }
      // Wrap unknown errors using the factory
      throw InfrastructureErrors.fileSystemError(
        `Failed to ${operation}: ${(error as Error).message}`,
        { cause: error instanceof Error ? error : undefined, operation }
      );
    }
  }
}
