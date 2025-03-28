import path from 'node:path';
import type { GlobalTagIndex, Language } from '@memory-bank/schemas';

import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import type { IGlobalMemoryBankRepository } from '../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { 
  InfrastructureError, 
  InfrastructureErrorCodes 
} from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IConfigProvider } from '../../config/index.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import { FileSystemMemoryBankRepositoryBase } from '../../../../../src/infrastructure/repositories/file-system/FileSystemMemoryBankRepositoryBase.js';
import { DocumentOperations } from '../../../../../src/infrastructure/repositories/file-system/DocumentOperations.js';
import { TagOperations } from '../../../../../src/infrastructure/repositories/file-system/TagOperations.js';
import { PathOperations } from '../../../../../src/infrastructure/repositories/file-system/PathOperations.js';
import { BulkOperations } from '../../../../../src/infrastructure/repositories/file-system/BulkOperations.js';

/**
 * File system implementation of global memory bank repository
 * Using component-based approach with responsibility segregation
 */
export class FileSystemGlobalMemoryBankRepository 
  extends FileSystemMemoryBankRepositoryBase 
  implements IGlobalMemoryBankRepository {
  
  // Component instances for specific operations
  private readonly documentOps: DocumentOperations;
  private readonly tagOps: TagOperations;
  private readonly pathOps: PathOperations;
  private readonly bulkOps: BulkOperations;
  
  // Path to the global memory bank root
  private globalMemoryPath!: string;
  
  // Current language setting
  private language: Language = 'en';

  /**
   * Constructor
   * @param fileSystemService File system service
   * @param configProvider Configuration provider
   */
  constructor(
    fileSystemService: IFileSystemService,
    private readonly configProvider: IConfigProvider
  ) {
    super(fileSystemService, configProvider);
    
    // Initialize operation components (but delay path setup until setup())
    this.documentOps = new DocumentOperations(
      '', // Will be set in setup()
      fileSystemService,
      configProvider
    );
    
    this.tagOps = new TagOperations(
      '', // Will be set in setup()
      fileSystemService,
      configProvider
    );
    
    this.pathOps = new PathOperations(
      '', // Will be set in setup()
      fileSystemService,
      configProvider
    );
    
    this.bulkOps = new BulkOperations(
      '', // Will be set in setup()
      fileSystemService,
      configProvider
    );
  }

  /**
   * Setup repository with configuration
   * This should be called before using the repository
   */
  private async setup(): Promise<void> {
    if (!this.globalMemoryPath) {
      this.globalMemoryPath = await this.configProvider.getGlobalMemoryPath();
      
      // Update paths in operation components
      (this.documentOps as any).basePath = this.globalMemoryPath;
      (this.tagOps as any).basePath = this.globalMemoryPath;
      (this.pathOps as any).basePath = this.globalMemoryPath;
      (this.bulkOps as any).basePath = this.globalMemoryPath;
    }

    // Set language from config
    this.language = await this.configProvider.getLanguage();
  }

  /**
   * Ensure default structure exists
   */
  private async ensureDefaultStructure(): Promise<void> {
    try {
      logger.debug('Ensuring global memory bank default structure');

      for (const [relativePath, content] of Object.entries(this.defaultStructure)) {
        const fullPath = path.join(this.globalMemoryPath, relativePath);

        // Create directory if needed
        const dirPath = path.dirname(fullPath);
        await this.pathOps.createDirectory(dirPath);

        // Check if file exists
        const fileExists = await super.fileExists(fullPath);

        if (!fileExists) {
          // Create file with default content
          await super.writeFile(fullPath, content);
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

  /**
   * Get document from global memory bank
   * @param path Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  async getDocument(path: DocumentPath): Promise<MemoryDocument | null> {
    try {
      // Ensure setup is completed
      await this.setup();
      
      return await this.documentOps.getDocument(path);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
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
      // Ensure setup is completed
      await this.setup();
      
      await this.documentOps.saveDocument(document);

      // Update tags index if document is not a tag index
      if (document.path.value !== 'tags/index.md' && 
          document.path.value !== 'tags/index.json' &&
          document.path.value !== '_global_index.json') {
        // Generate and save the tag index
        await this.refreshTagIndex();
      }
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
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
      // Ensure setup is completed
      await this.setup();
      
      // 事前にファイルの存在を確認
      const document = await this.getDocument(path);
      if (!document) {
        return false;
      }

      const result = await this.documentOps.deleteDocument(path);

      // Update tags index if document was deleted
      if (result && path.value !== 'tags/index.md' && 
          path.value !== 'tags/index.json' &&
          path.value !== '_global_index.json') {
        // Generate and save the tag index
        await this.refreshTagIndex();
      }

      return result;
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
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
      // Ensure setup is completed
      await this.setup();
      
      return await this.documentOps.listDocuments();
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
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
      // Ensure setup is completed
      await this.setup();
      
      // Try to use the tag index if available
      const paths = await this.findDocumentPathsByTagsUsingIndex(tags, false);
      const documents: MemoryDocument[] = [];
      
      for (const path of paths) {
        const doc = await this.getDocument(path);
        if (doc) {
          documents.push(doc);
        }
      }
      
      return documents;
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
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
   * Refresh all tag indexes (internal helper)
   */
  private async refreshTagIndex(): Promise<void> {
    try {
      // Ensure setup is completed
      await this.setup();
      
      // Generate and save the main tag index
      const tagIndex = await this.tagOps.generateGlobalTagIndex();
      await this.saveTagIndex(tagIndex as GlobalTagIndex);
      
      // Update the legacy index file
      await this.tagOps.updateLegacyTagsIndex(
        await this.bulkOps.getAllDocuments(), 
        this.language
      );
    } catch (error) {
      logger.error('Failed to refresh tag indexes:', error);
      // Don't throw, as this is an internal operation
    }
  }

  /**
   * Validate global memory bank structure
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  async validateStructure(): Promise<boolean> {
    try {
      // Ensure setup is completed
      await this.setup();
      
      logger.debug('Validating global memory bank structure');

      // Check if directory exists
      const dirExists = await this.pathOps.directoryExists(this.globalMemoryPath);

      if (!dirExists) {
        return false;
      }

      // Check if tags directory exists
      const tagsDir = path.join(this.globalMemoryPath, 'tags');
      const tagsDirExists = await this.pathOps.directoryExists(tagsDir);

      if (!tagsDirExists) {
        return false;
      }

      // Check if required files exist
      for (const filePath of Object.keys(this.defaultStructure)) {
        const fullPath = path.join(this.globalMemoryPath, filePath);
        const fileExists = await super.fileExists(fullPath);

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
  async saveTagIndex(tagIndex: GlobalTagIndex): Promise<void> {
    try {
      // Ensure setup is completed
      await this.setup();
      
      await this.tagOps.saveGlobalTagIndex(tagIndex);
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
  async getTagIndex(): Promise<GlobalTagIndex | null> {
    try {
      // Ensure setup is completed
      await this.setup();
      
      return await this.tagOps.getGlobalTagIndex() as GlobalTagIndex | null;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
  
  /**
   * Update tags index (for backward compatibility)
   * @param skipSaveDocument Optional parameter to avoid circular calls
   * @returns Promise resolving when done
   */
  async updateTagsIndex(skipSaveDocument: boolean = false): Promise<void> {
    try {
      // Ensure setup is completed
      await this.setup();
      
      // Simply delegate to the internal refreshTagIndex method
      await this.refreshTagIndex();
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
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
      // Ensure setup is completed
      await this.setup();
      
      return await this.tagOps.findDocumentPathsByTags(tags, matchAll);
    } catch (error) {
      // Fall back to regular method if index fails
      logger.debug(`Tag index search failed, falling back to regular method: ${(error as Error).message}`);
      
      const docs = await this.tagOps.findDocumentsByTags(tags, matchAll);
      return docs.map((doc: MemoryDocument) => doc.path);
    }
  }

  /**
   * Initialize global memory bank
   * @returns Promise resolving when initialization is complete
   */
  async initialize(): Promise<void> {
    try {
      logger.debug('Initializing global memory bank');

      // Setup repository configuration
      await this.setup();

      // Ensure the directory exists
      await this.pathOps.createDirectory(this.globalMemoryPath);
      await this.pathOps.createDirectory(path.join(this.globalMemoryPath, 'tags'));

      // Check if files exist, create default structure if needed
      await this.ensureDefaultStructure();

      // Create tag index if needed
      try {
        await this.refreshTagIndex();
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
   * Get default templates based on current language
   */
  private get defaultStructure(): Record<string, string> {
    // Select templates based on language
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
}