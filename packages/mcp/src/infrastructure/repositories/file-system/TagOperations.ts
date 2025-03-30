import path from 'node:path';
import { BranchTagIndex, GlobalTagIndex, TAG_INDEX_VERSION, DocumentReference, TagEntry } from '@memory-bank/schemas'; // Import DocumentReference, TagEntry

import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';

import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';

import type { IConfigProvider } from '../../config/index.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';
import { FileSystemMemoryDocumentRepository } from './FileSystemMemoryDocumentRepository.js';

/**
 * Component responsible for tag-related operations
 */
export class TagOperations extends FileSystemMemoryBankRepositoryBase {
  // Tag index filenames
  private static readonly GLOBAL_INDEX_FILENAME = '_global_index.json';
  private static readonly BRANCH_INDEX_FILENAME = '_index.json';

  // Cache management
  private branchIndexCache = new Map<string, { index: BranchTagIndex, lastUpdated: Date }>();
  private globalIndexCache: { index: GlobalTagIndex, lastUpdated: Date } | null = null;
  private readonly CACHE_TTL_MS = 30000; // Cache duration: 30 seconds

  /**
   * Constructor
   * @param basePath Base path
   * @param fileSystemService File system service
   * @param configProvider Configuration provider
   */
  constructor(
    private readonly basePath: string,
    fileSystemService: IFileSystemService,
    protected readonly configProvider: IConfigProvider
  ) {
    super(fileSystemService, configProvider);
  }

  /**
   * Get the document repository
   * @returns Document repository
   */
  private getDocumentRepository(): FileSystemMemoryDocumentRepository {
    return new FileSystemMemoryDocumentRepository(this.basePath, this.fileSystemService);
  }

  /**
   * Get the path to the branch index file
   * @param branchInfo Branch information
   * @returns Path to the index file
   */
  private getBranchIndexPath(_branchInfo: BranchInfo): string {
    return path.join(this.basePath, TagOperations.BRANCH_INDEX_FILENAME);
  }

  /**
   * Get the path to the global index file
   * @returns Path to the index file
   */
  private getGlobalIndexPath(): string {
    return path.join(this.basePath, TagOperations.GLOBAL_INDEX_FILENAME);
  }

  /**
   * Get the tag index for a branch
   * @param branchInfo Branch information
   * @returns Tag index, or null if not found
   */
  async getBranchTagIndex(branchInfo: BranchInfo): Promise<BranchTagIndex | null> {
    try {
      const branchKey = branchInfo.safeName;
      const now = new Date();

      // Check cache
      const cachedData = this.branchIndexCache.get(branchKey);
      if (cachedData && (now.getTime() - cachedData.lastUpdated.getTime()) < this.CACHE_TTL_MS) {
        logger.debug(`Using cached branch index for ${branchInfo.name}`);
        return cachedData.index;
      }

      const indexPath = this.getBranchIndexPath(branchInfo);
      logger.debug(`Reading branch index from disk: ${indexPath}`);

      // Check if file exists
      const exists = await this.fileExists(indexPath);
      if (!exists) {
        return null;
      }

      // Read index file
      const content = await this.readFile(indexPath);
      const indexData = JSON.parse(content);

      // Save to cache
      this.branchIndexCache.set(branchKey, { index: indexData, lastUpdated: now });

      return indexData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error(`Invalid JSON in branch tag index file for ${branchInfo.name}`, error);
        return null;
      }

      if (
        error instanceof InfrastructureError &&
        error.code === InfrastructureErrorCodes.FILE_NOT_FOUND
      ) {
        return null;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to read branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get the global tag index
   * @returns Tag index, or null if not found
   */
  async getGlobalTagIndex(): Promise<GlobalTagIndex | null> {
    try {
      const now = new Date();

      // Check cache
      if (this.globalIndexCache && (now.getTime() - this.globalIndexCache.lastUpdated.getTime()) < this.CACHE_TTL_MS) {
        logger.debug('Using cached global index');
        return this.globalIndexCache.index;
      }

      const indexPath = this.getGlobalIndexPath();
      logger.debug(`Reading global index from disk: ${indexPath}`);

      // Check if file exists
      const exists = await this.fileExists(indexPath);
      if (!exists) {
        return null;
      }

      // Read index file
      const content = await this.readFile(indexPath);
      const indexData = JSON.parse(content);

      // Save to cache
      this.globalIndexCache = { index: indexData, lastUpdated: now };

      return indexData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error(`Invalid JSON in global tag index file`, error);
        return null;
      }

      if (
        error instanceof InfrastructureError &&
        error.code === InfrastructureErrorCodes.FILE_NOT_FOUND
      ) {
        return null;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to read global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Save the tag index for a branch
   * @param branchInfo Branch information
   * @param index Tag index
   */
  async saveBranchTagIndex(branchInfo: BranchInfo, index: BranchTagIndex): Promise<void> {
    try {
      const indexPath = this.getBranchIndexPath(branchInfo);
      const branchKey = branchInfo.safeName;

      // Ensure directory exists
      const dirPath = path.dirname(indexPath);
      await this.createDirectory(dirPath);

      // Write file
      const content = JSON.stringify(index, null, 2);
      await this.writeFile(indexPath, content);

      // Update cache
      this.branchIndexCache.set(branchKey, { index, lastUpdated: new Date() });
      logger.debug(`Updated branch index cache for ${branchInfo.name}`);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to write branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Save the global tag index
   * @param index Tag index
   */
  async saveGlobalTagIndex(index: GlobalTagIndex): Promise<void> {
    try {
      const indexPath = this.getGlobalIndexPath();

      // Ensure directory exists
      const dirPath = path.dirname(indexPath);
      await this.createDirectory(dirPath);

      // Write file
      const content = JSON.stringify(index, null, 2);
      await this.writeFile(indexPath, content);

      // Update cache
      this.globalIndexCache = { index, lastUpdated: new Date() };
      logger.debug('Updated global index cache');
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to write global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Generate the tag index for a branch
   * @param branchInfo Branch information
   * @returns Generated tag index
   */
  async generateBranchTagIndex(branchInfo: BranchInfo): Promise<BranchTagIndex> {
    try {
      logger.debug(`Generating tag index for branch ${branchInfo.name}`);

      // Get all documents
      const documentRepository = this.getDocumentRepository();
      const paths = await documentRepository.list();
      const documents: MemoryDocument[] = [];

      for (const docPath of paths) {
        const doc = await documentRepository.findByPath(docPath);
        if (doc) {
          documents.push(doc);
        }
      }

      // Create tag index (compliant with schema definition)
      const tagEntriesMap = new Map<string, { tag: Tag; documents: DocumentReference[] }>();

      // Collect tags for each document and build the Map
      for (const doc of documents) {
        const docJson = doc.toJSON(); // Get ID using toJSON()
        const docRef: DocumentReference = {
          id: docJson.id, // Use ID generated by toJSON()
          path: doc.path.value,
          title: doc.title ?? doc.path.filename, // Use filename if title is undefined
          lastModified: doc.lastModified, // Pass Date object directly (FlexibleDateSchema handles it)
        };

        for (const tag of doc.tags) {
          if (!tagEntriesMap.has(tag.value)) {
            tagEntriesMap.set(tag.value, { tag: tag, documents: [] });
          }
          tagEntriesMap.get(tag.value)!.documents.push(docRef);
        }
      }

      // Generate TagEntry array from Map and convert tag property to string
      const tagEntries: TagEntry[] = Array.from(tagEntriesMap.values()).map(entry => ({
        ...entry,
        tag: entry.tag.value, // Convert Tag object to string
      }));

      // Build BranchTagIndex
      const tagIndex: BranchTagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'branch', // Add indexType
          branchName: branchInfo.name, // Add branchName
          lastUpdated: new Date(), // Changed updatedAt -> lastUpdated, pass Date object
          documentCount: documents.length,
          tagCount: tagEntries.length, // Add calculated tagCount
        },
        index: tagEntries, // Set the correctly typed array
      };

      return tagIndex;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to generate branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Generate the global tag index
   * @returns Generated tag index
   */
  async generateGlobalTagIndex(): Promise<GlobalTagIndex> {
    try {
      logger.debug('Generating global tag index');

      // Get all documents
      const documentRepository = this.getDocumentRepository();
      const paths = await documentRepository.list();
      const documents: MemoryDocument[] = [];

      for (const docPath of paths) {
        const doc = await documentRepository.findByPath(docPath);
        if (doc) {
          documents.push(doc);
        }
      }

      // Create tag index (compliant with schema definition)
      const tagEntriesMap = new Map<string, { tag: Tag; documents: DocumentReference[] }>();

      // Collect tags for each document and build the Map
      for (const doc of documents) {
        const docJson = doc.toJSON(); // Get ID using toJSON()
        const docRef: DocumentReference = {
          id: docJson.id, // Use ID generated by toJSON()
          path: doc.path.value,
          title: doc.title ?? doc.path.filename, // Use filename if title is undefined
          lastModified: doc.lastModified, // Pass Date object directly (FlexibleDateSchema handles it)
        };

        for (const tag of doc.tags) {
          if (!tagEntriesMap.has(tag.value)) {
            tagEntriesMap.set(tag.value, { tag: tag, documents: [] });
          }
          tagEntriesMap.get(tag.value)!.documents.push(docRef);
        }
      }

      // Generate TagEntry array from Map and convert tag property to string
      const tagEntries: TagEntry[] = Array.from(tagEntriesMap.values()).map(entry => ({
        ...entry,
        tag: entry.tag.value, // Convert Tag object to string
      }));

      // Build GlobalTagIndex
      const tagIndex: GlobalTagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'global', // Add indexType
          lastUpdated: new Date(), // Changed updatedAt -> lastUpdated, pass Date object
          documentCount: documents.length,
          tagCount: tagEntries.length, // Add calculated tagCount
        },
        index: tagEntries, // Set the correctly typed array
      };

      return tagIndex;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to generate global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Find documents using the tag index
   * @param tags Tags to search for
   * @param documents Optional array of documents (if provided, filters this array instead of using index)
   * @param matchAll Whether all tags must match (AND search)
   * @returns Array of matching document paths
   */
  async findDocumentPathsByTagsUsingIndex(
    tags: Tag[],
    documents?: MemoryDocument[],
    matchAll: boolean = false
  ): Promise<DocumentPath[]> {
    try {
      this.logDebug(`Finding documents by ${tags.length} tags using index (matchAll: ${matchAll})`);

      // If documents are provided, filter them directly
      if (documents && documents.length > 0) {
        this.logDebug(`Using provided ${documents.length} documents instead of index`);
        const matchedDocs = this.filterDocumentsByTags(documents, tags, matchAll);
        return matchedDocs.map(doc => doc.path);
      }

      // Search using the index
      const tagIndex = await this.getGlobalTagIndex();

      if (!tagIndex) {
        // Fallback to regular method if index doesn't exist
        this.logDebug('No tag index found, falling back to regular method');
        // Call findDocumentPathsByTags instead and return its result directly
        return await this.findDocumentPathsByTags(tags, matchAll);
      }

      // Logic to search TagEntry[]
      const tagValuesToSearch = tags.map(t => t.value);
      let resultPathSet = new Set<string>();

      if (matchAll) {
        // AND search
        if (tagValuesToSearch.length === 0) return [];

        // Initialize with the first tag
        const firstTagEntry = tagIndex.index.find(entry => entry.tag === tagValuesToSearch[0]);
        if (!firstTagEntry) return []; // If first tag not found, result is empty
        resultPathSet = new Set(firstTagEntry.documents.map(doc => doc.path));

        // Filter by remaining tags
        for (let i = 1; i < tagValuesToSearch.length; i++) {
          const currentTag = tagValuesToSearch[i];
          const currentTagEntry = tagIndex.index.find(entry => entry.tag === currentTag);
          const currentPaths = new Set(currentTagEntry ? currentTagEntry.documents.map(doc => doc.path) : []);

          // Intersect sets
          resultPathSet = new Set([...resultPathSet].filter(path => currentPaths.has(path)));

          if (resultPathSet.size === 0) break; // Stop if intersection is empty
        }
      } else {
        // OR search
        for (const tagValue of tagValuesToSearch) {
          const tagEntry = tagIndex.index.find(entry => entry.tag === tagValue);
          if (tagEntry) {
            tagEntry.documents.forEach(doc => resultPathSet.add(doc.path));
          }
        }
      }

      // Convert string paths to DocumentPath objects
      return Array.from(resultPathSet).map(p => DocumentPath.create(p));
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags using index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Filter an array of documents by tags
   * @param documents Array of documents to filter
   * @param tags Tags to search for
   * @param matchAll Whether all tags must match (AND search)
   * @returns Array of matching documents
   */
  private filterDocumentsByTags(
    documents: MemoryDocument[],
    tags: Tag[],
    matchAll: boolean = false
  ): MemoryDocument[] {
    // If no tags, return all documents
    if (tags.length === 0) {
      return documents;
    }

    return documents.filter(doc => {
      if (matchAll) {
        // AND search - must have all tags
        return tags.length > 0 && tags.every(tag => doc.hasTag(tag));
      } else {
        // OR search - must have at least one tag
        return tags.length === 0 || tags.some(tag => doc.hasTag(tag));
      }
    });
  }

  /**
   * Find documents by tags (without using index)
   * @param tags Tags to search for
   * @param matchAll Whether all tags must match (AND search)
   * @returns Array of matching document paths
   */
  async findDocumentPathsByTags(tags: Tag[], matchAll: boolean = false): Promise<DocumentPath[]> {
    // Changed to call the corrected findDocumentPathsByTagsUsingIndex
    return this.findDocumentPathsByTagsUsingIndex(tags, undefined, matchAll);
  }

  /**
   * Find documents by tags in a branch (without using index)
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param matchAll Whether all tags must match (AND search)
   * @returns Array of matching documents
   */
  // Changed parameters to object literal type
  async findBranchDocumentsByTags(params: {
    branchInfo: BranchInfo;
    tags: Tag[];
    matchAll?: boolean;
  }): Promise<MemoryDocument[]> {
    const { branchInfo, tags, matchAll = false } = params; // Destructure parameters
    try {
      logger.debug(`Finding documents by tags in branch ${branchInfo.name} (no index)`);

      const documentRepository = this.getDocumentRepository();
      const paths = await documentRepository.list();
      const matchedDocs: MemoryDocument[] = [];

      // Get all documents and search
      for (const docPath of paths) {
        const doc = await documentRepository.findByPath(docPath);
        if (!doc) continue;

        let isMatch = false;

        if (matchAll) {
          // AND search - must have all tags
          isMatch = tags.length > 0 && tags.every(tag => doc.hasTag(tag));
        } else {
          // OR search - must have at least one tag
          isMatch = tags.length === 0 || tags.some(tag => doc.hasTag(tag));
        }

        if (isMatch) {
          matchedDocs.push(doc);
        }
      }

      return matchedDocs;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags in branch ${branchInfo.name}: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Invalidate the cache
   * @param branchInfo Branch information, or null to invalidate only global cache
   */
  invalidateCache(branchInfo: BranchInfo | null = null): void {
    if (branchInfo) {
      const branchKey = branchInfo.safeName;
      this.branchIndexCache.delete(branchKey);
      logger.debug(`Invalidated branch index cache for ${branchInfo.name}`);
    } else {
      this.globalIndexCache = null;
      logger.debug('Invalidated global index cache');
    }
  }

  /**
   * Invalidate all caches
   */
  invalidateAllCaches(): void {
    this.branchIndexCache.clear();
    this.globalIndexCache = null;
    logger.debug('Invalidated all index caches');
  }

  /**
   * Generate and save the tag index
   * @param documents Array of documents to generate the index from
   * @returns The generated tag index
   */
  async generateAndSaveTagIndex(documents: MemoryDocument[]): Promise<GlobalTagIndex> {
    try {
      this.logDebug(`Generating tag index for ${documents.length} documents`);

      // Create tag index (compliant with schema definition)
      const tagEntriesMap = new Map<string, { tag: Tag; documents: DocumentReference[] }>();

      // Collect tags for each document and build the Map
      for (const doc of documents) {
        const docJson = doc.toJSON(); // Get ID using toJSON()
        const docRef: DocumentReference = {
          id: docJson.id, // Use ID generated by toJSON()
          path: doc.path.value,
          title: doc.title ?? doc.path.filename, // Use filename if title is undefined
          lastModified: doc.lastModified, // Pass Date object directly (FlexibleDateSchema handles it)
        };

        for (const tag of doc.tags) {
          if (!tagEntriesMap.has(tag.value)) {
            tagEntriesMap.set(tag.value, { tag: tag, documents: [] });
          }
          tagEntriesMap.get(tag.value)!.documents.push(docRef);
        }
      }

      // Generate TagEntry array from Map and convert tag property to string
      const tagEntries: TagEntry[] = Array.from(tagEntriesMap.values()).map(entry => ({
        ...entry,
        tag: entry.tag.value, // Convert Tag object to string
      }));

      // Build GlobalTagIndex
      const tagIndex: GlobalTagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'global', // Add indexType
          lastUpdated: new Date(), // Changed updatedAt -> lastUpdated, pass Date object
          documentCount: documents.length,
          tagCount: tagEntries.length, // Add calculated tagCount
        },
        index: tagEntries, // Set the correctly typed array
      };


      // Save the tag index
      await this.saveGlobalTagIndex(tagIndex);

      return tagIndex;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to generate and save tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  // async updateLegacyTagsIndex(documents: MemoryDocument[], language: Language): Promise<void> { ... } // Deprecated method removed
}
