import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { JsonDocument } from '../../../domain/entities/JsonDocument.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { getLogger } from '../../../shared/utils/logger.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { FileSystemTagIndexRepositoryImpl } from './FileSystemTagIndexRepositoryImpl.js';
import { DocumentReference } from '../../../schemas/v2/tag-index.js';

const logger = getLogger('FileSystemTagIndexRepositoryModifiers');

/**
 * Implementation of document modification operations for ITagIndexRepository
 * Further extends the implementation class
 */
export class FileSystemTagIndexRepositoryModifiers extends FileSystemTagIndexRepositoryImpl {
  /**
   * Add or update document in branch tag index
   * @param branchInfo Branch information
   * @param document Document to add/update
   * @returns Promise resolving when done
   */
  async addDocumentToBranchIndex(
    branchInfo: BranchInfo,
    document: MemoryDocument | JsonDocument
  ): Promise<void> {
    logger.info(`Adding document to branch tag index: ${document.path.value}`);

    try {
      // Read existing index or create new one
      const tagIndex = await this.readBranchIndex(branchInfo) || this.createEmptyBranchIndex(branchInfo);

      // Create document reference
      const docRef = this.createDocumentReference(document);

      // Update tag entries
      const documentTags = document.tags.map(tag => tag.value);

      // Remove document from existing tags (if it exists)
      for (const entry of tagIndex.index) {
        entry.documents = entry.documents.filter(doc => doc.path !== docRef.path);
      }

      // Add document to relevant tags
      for (const tagValue of documentTags) {
        // Find or create tag entry
        let tagEntry = tagIndex.index.find(entry => entry.tag === tagValue);

        if (!tagEntry) {
          tagEntry = {
            tag: tagValue,
            documents: []
          };
          tagIndex.index.push(tagEntry);
        }

        // Add document reference
        tagEntry.documents.push(docRef);
      }

      // Remove empty tag entries
      tagIndex.index = tagIndex.index.filter(entry => entry.documents.length > 0);

      // Update metadata
      tagIndex.metadata.lastUpdated = new Date();
      tagIndex.metadata.tagCount = tagIndex.index.length;

      // Count unique documents
      const uniquePaths = new Set<string>();
      for (const entry of tagIndex.index) {
        for (const doc of entry.documents) {
          uniquePaths.add(doc.path);
        }
      }
      tagIndex.metadata.documentCount = uniquePaths.size;

      // Write index to file
      await this.writeBranchIndex(branchInfo, tagIndex);
    } catch (error) {
      logger.error(`Error adding document to branch tag index: ${document.path.value}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to add document to branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Add or update document in global tag index
   * @param document Document to add/update
   * @returns Promise resolving when done
   */
  async addDocumentToGlobalIndex(
    document: MemoryDocument | JsonDocument
  ): Promise<void> {
    logger.info(`Adding document to global tag index: ${document.path.value}`);

    try {
      // Read existing index or create new one
      const tagIndex = await this.readGlobalIndex() || this.createEmptyGlobalIndex();

      // Create document reference
      const docRef = this.createDocumentReference(document);

      // Update tag entries
      const documentTags = document.tags.map(tag => tag.value);

      // Remove document from existing tags (if it exists)
      for (const entry of tagIndex.index) {
        entry.documents = entry.documents.filter(doc => doc.path !== docRef.path);
      }

      // Add document to relevant tags
      for (const tagValue of documentTags) {
        // Find or create tag entry
        let tagEntry = tagIndex.index.find(entry => entry.tag === tagValue);

        if (!tagEntry) {
          tagEntry = {
            tag: tagValue,
            documents: []
          };
          tagIndex.index.push(tagEntry);
        }

        // Add document reference
        tagEntry.documents.push(docRef);
      }

      // Remove empty tag entries
      tagIndex.index = tagIndex.index.filter(entry => entry.documents.length > 0);

      // Update metadata
      tagIndex.metadata.lastUpdated = new Date();
      tagIndex.metadata.tagCount = tagIndex.index.length;

      // Count unique documents
      const uniquePaths = new Set<string>();
      for (const entry of tagIndex.index) {
        for (const doc of entry.documents) {
          uniquePaths.add(doc.path);
        }
      }
      tagIndex.metadata.documentCount = uniquePaths.size;

      // Write index to file
      await this.writeGlobalIndex(tagIndex);
    } catch (error) {
      logger.error(`Error adding document to global tag index: ${document.path.value}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to add document to global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Remove document from branch tag index
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving when done
   */
  async removeDocumentFromBranchIndex(
    branchInfo: BranchInfo,
    path: DocumentPath
  ): Promise<void> {
    logger.info(`Removing document from branch tag index: ${path.value}`);

    try {
      // Read existing index
      const tagIndex = await this.readBranchIndex(branchInfo);
      if (!tagIndex) {
        // Nothing to do if index doesn't exist
        return;
      }

      // Remove document from all tag entries
      let modified = false;
      for (const entry of tagIndex.index) {
        const initialLength = entry.documents.length;
        entry.documents = entry.documents.filter(doc => doc.path !== path.value);
        if (entry.documents.length < initialLength) {
          modified = true;
        }
      }

      // If nothing was modified, we're done
      if (!modified) {
        return;
      }

      // Remove empty tag entries
      tagIndex.index = tagIndex.index.filter(entry => entry.documents.length > 0);

      // Update metadata
      tagIndex.metadata.lastUpdated = new Date();
      tagIndex.metadata.tagCount = tagIndex.index.length;

      // Count unique documents
      const uniquePaths = new Set<string>();
      for (const entry of tagIndex.index) {
        for (const doc of entry.documents) {
          uniquePaths.add(doc.path);
        }
      }
      tagIndex.metadata.documentCount = uniquePaths.size;

      // Write index to file
      await this.writeBranchIndex(branchInfo, tagIndex);
    } catch (error) {
      logger.error(`Error removing document from branch tag index: ${path.value}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to remove document from branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Remove document from global tag index
   * @param path Document path
   * @returns Promise resolving when done
   */
  async removeDocumentFromGlobalIndex(
    path: DocumentPath
  ): Promise<void> {
    logger.info(`Removing document from global tag index: ${path.value}`);

    try {
      // Read existing index
      const tagIndex = await this.readGlobalIndex();
      if (!tagIndex) {
        // Nothing to do if index doesn't exist
        return;
      }

      // Remove document from all tag entries
      let modified = false;
      for (const entry of tagIndex.index) {
        const initialLength = entry.documents.length;
        entry.documents = entry.documents.filter(doc => doc.path !== path.value);
        if (entry.documents.length < initialLength) {
          modified = true;
        }
      }

      // If nothing was modified, we're done
      if (!modified) {
        return;
      }

      // Remove empty tag entries
      tagIndex.index = tagIndex.index.filter(entry => entry.documents.length > 0);

      // Update metadata
      tagIndex.metadata.lastUpdated = new Date();
      tagIndex.metadata.tagCount = tagIndex.index.length;

      // Count unique documents
      const uniquePaths = new Set<string>();
      for (const entry of tagIndex.index) {
        for (const doc of entry.documents) {
          uniquePaths.add(doc.path);
        }
      }
      tagIndex.metadata.documentCount = uniquePaths.size;

      // Write index to file
      await this.writeGlobalIndex(tagIndex);
    } catch (error) {
      logger.error(`Error removing document from global tag index: ${path.value}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to remove document from global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
