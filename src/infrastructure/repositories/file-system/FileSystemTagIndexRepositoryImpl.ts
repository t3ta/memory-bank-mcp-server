import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { JsonDocument } from '../../../domain/entities/JsonDocument.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import {
  TagIndexOptions,
  TagIndexUpdateResult,
} from '../../../domain/repositories/ITagIndexRepository.js';
import { DocumentReference } from '../../../schemas/v2/tag-index.js';
import { logger } from '../../../shared/utils/logger.js';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from '../../../shared/errors/InfrastructureError.js';
import { FileSystemTagIndexRepository } from './FileSystemTagIndexRepositoryBase.js';

/**
 * Implementation of ITagIndexRepository interface methods
 * Extends the base repository class
 */
export class FileSystemTagIndexRepositoryImpl extends FileSystemTagIndexRepository {
  /**
   * Update tag index for a branch
   * @param branchInfo Branch information
   * @param options Update options
   * @returns Promise resolving to update result
   */
  async updateBranchTagIndex(
    branchInfo: BranchInfo,
    options?: TagIndexOptions
  ): Promise<TagIndexUpdateResult> {
    logger.info(`Updating branch tag index for branch: ${branchInfo.name}`);

    // Determine if we need a full rebuild
    const fullRebuild = options?.fullRebuild ?? false;

    // Read existing index or create new one
    const tagIndex = fullRebuild
      ? this.createEmptyBranchIndex(branchInfo)
      : (await this.readBranchIndex(branchInfo)) || this.createEmptyBranchIndex(branchInfo);

    try {
      // Get all documents in branch
      const documentsMap = new Map<string, MemoryDocument | JsonDocument>();
      const documentPaths = await this.branchRepository.listDocuments(branchInfo);
      const documents: (MemoryDocument | JsonDocument)[] = [];

      // Load all documents from the repository
      for (const path of documentPaths) {
        const document = await this.branchRepository.getDocument(branchInfo, path);
        if (document) {
          documents.push(document);
          documentsMap.set(document.path.value, document);
        }
      }

      logger.info(`Loaded ${documents.length} documents from branch: ${branchInfo.name}`);

      // Build the index
      const tagEntries = [];
      const tagMap = new Map<string, DocumentReference[]>();

      // Group documents by tag
      for (const document of documents) {
        const docRef = this.createDocumentReference(document);

        for (const tag of document.tags) {
          const tagValue = tag.value;
          if (!tagMap.has(tagValue)) {
            tagMap.set(tagValue, []);
          }
          tagMap.get(tagValue)!.push(docRef);
        }
      }

      // Convert to tag entries
      for (const [tagValue, documents] of tagMap.entries()) {
        tagEntries.push({
          tag: tagValue,
          documents,
        });
      }

      // Update the index
      tagIndex.index = tagEntries;
      tagIndex.metadata.lastUpdated = new Date();
      tagIndex.metadata.documentCount = documents.length;
      tagIndex.metadata.tagCount = tagEntries.length;

      // Write index to file
      await this.writeBranchIndex(branchInfo, tagIndex);

      // Return result
      return {
        tags: tagEntries.map((entry) => entry.tag),
        documentCount: documents.length,
        updateInfo: {
          fullRebuild,
          timestamp: tagIndex.metadata.lastUpdated.toISOString(),
        },
      };
    } catch (error) {
      logger.error(`Error updating branch tag index for branch: ${branchInfo.name}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to update branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Update global tag index
   * @param options Update options
   * @returns Promise resolving to update result
   */
  async updateGlobalTagIndex(options?: TagIndexOptions): Promise<TagIndexUpdateResult> {
    logger.info('Updating global tag index');

    // Determine if we need a full rebuild
    const fullRebuild = options?.fullRebuild ?? false;

    // Read existing index or create new one
    const tagIndex = fullRebuild
      ? this.createEmptyGlobalIndex()
      : (await this.readGlobalIndex()) || this.createEmptyGlobalIndex();

    try {
      // Get all documents in global memory bank
      const documentsMap = new Map<string, MemoryDocument | JsonDocument>();
      const documentPaths = await this.globalRepository.listDocuments();
      const documents: (MemoryDocument | JsonDocument)[] = [];

      // Load all documents from the repository
      for (const path of documentPaths) {
        const document = await this.globalRepository.getDocument(path);
        if (document) {
          documents.push(document);
          documentsMap.set(document.path.value, document);
        }
      }

      logger.info(`Loaded ${documents.length} documents from global memory bank`);

      // Build the index
      const tagEntries = [];
      const tagMap = new Map<string, DocumentReference[]>();

      // Group documents by tag
      for (const document of documents) {
        const docRef = this.createDocumentReference(document);

        for (const tag of document.tags) {
          const tagValue = tag.value;
          if (!tagMap.has(tagValue)) {
            tagMap.set(tagValue, []);
          }
          tagMap.get(tagValue)!.push(docRef);
        }
      }

      // Convert to tag entries
      for (const [tagValue, documents] of tagMap.entries()) {
        tagEntries.push({
          tag: tagValue,
          documents,
        });
      }

      // Update the index
      tagIndex.index = tagEntries;
      tagIndex.metadata.lastUpdated = new Date();
      tagIndex.metadata.documentCount = documents.length;
      tagIndex.metadata.tagCount = tagEntries.length;

      // Write index to file
      await this.writeGlobalIndex(tagIndex);

      // Return result
      return {
        tags: tagEntries.map((entry) => entry.tag),
        documentCount: documents.length,
        updateInfo: {
          fullRebuild,
          timestamp: tagIndex.metadata.lastUpdated.toISOString(),
        },
      };
    } catch (error) {
      logger.error('Error updating global tag index', error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to update global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Find documents by tags in branch
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param matchAll Whether documents must have all tags (AND) or any tag (OR)
   * @returns Promise resolving to array of document paths matching the tags
   */
  async findBranchDocumentsByTags(
    branchInfo: BranchInfo,
    tags: Tag[],
    matchAll: boolean = false
  ): Promise<DocumentPath[]> {
    logger.info(`Finding branch documents by tags: ${tags.map((t) => t.value).join(', ')}`);

    try {
      // Read the index
      const tagIndex = await this.readBranchIndex(branchInfo);
      if (!tagIndex) {
        logger.info(`No tag index found for branch: ${branchInfo.name}`);
        return [];
      }

      // Get tag values
      const tagValues = tags.map((tag) => tag.value);

      // Find matching tag entries
      const matchingEntries = tagIndex.index.filter((entry) => tagValues.includes(entry.tag));

      if (matchingEntries.length === 0) {
        return [];
      }

      // Extract matching document paths
      let matchingDocPaths: string[] = [];

      if (matchAll) {
        // Documents must have ALL specified tags
        // First, get all document paths from the first tag
        const firstTagDocs = matchingEntries[0].documents.map((doc) => doc.path);

        // Then filter to only include documents that have ALL other tags
        matchingDocPaths = firstTagDocs.filter((path) => {
          // Check if this document has all other tags
          return matchingEntries.slice(1).every((entry) => {
            return entry.documents.some((doc) => doc.path === path);
          });
        });
      } else {
        // Documents can have ANY of the specified tags (union)
        // Get unique document paths from all matching tag entries
        const docPathSet = new Set<string>();

        for (const entry of matchingEntries) {
          for (const doc of entry.documents) {
            docPathSet.add(doc.path);
          }
        }

        matchingDocPaths = Array.from(docPathSet);
      }

      // Convert to DocumentPath objects
      return matchingDocPaths.map((path) => DocumentPath.create(path));
    } catch (error) {
      logger.error(`Error finding branch documents by tags for branch: ${branchInfo.name}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to find branch documents by tags: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Find documents by tags in global memory bank
   * @param tags Tags to search for
   * @param matchAll Whether documents must have all tags (AND) or any tag (OR)
   * @returns Promise resolving to array of document paths matching the tags
   */
  async findGlobalDocumentsByTags(tags: Tag[], matchAll: boolean = false): Promise<DocumentPath[]> {
    logger.info(`Finding global documents by tags: ${tags.map((t) => t.value).join(', ')}`);

    try {
      // Read the index
      const tagIndex = await this.readGlobalIndex();
      if (!tagIndex) {
        logger.info('No global tag index found');
        return [];
      }

      // Get tag values
      const tagValues = tags.map((tag) => tag.value);

      // Find matching tag entries
      const matchingEntries = tagIndex.index.filter((entry) => tagValues.includes(entry.tag));

      if (matchingEntries.length === 0) {
        return [];
      }

      // Extract matching document paths
      let matchingDocPaths: string[] = [];

      if (matchAll) {
        // Documents must have ALL specified tags
        // First, get all document paths from the first tag
        const firstTagDocs = matchingEntries[0].documents.map((doc) => doc.path);

        // Then filter to only include documents that have ALL other tags
        matchingDocPaths = firstTagDocs.filter((path) => {
          // Check if this document has all other tags
          return matchingEntries.slice(1).every((entry) => {
            return entry.documents.some((doc) => doc.path === path);
          });
        });
      } else {
        // Documents can have ANY of the specified tags (union)
        // Get unique document paths from all matching tag entries
        const docPathSet = new Set<string>();

        for (const entry of matchingEntries) {
          for (const doc of entry.documents) {
            docPathSet.add(doc.path);
          }
        }

        matchingDocPaths = Array.from(docPathSet);
      }

      // Convert to DocumentPath objects
      return matchingDocPaths.map((path) => DocumentPath.create(path));
    } catch (error) {
      logger.error('Error finding global documents by tags', error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to find global documents by tags: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
