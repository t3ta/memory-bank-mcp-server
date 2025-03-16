import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { getLogger } from '../../../shared/utils/Logger.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { FileSystemTagIndexRepositoryModifiers } from './FileSystemTagIndexRepositoryModifiers.js';

const logger = getLogger('FileSystemTagIndexRepositoryGetters');

/**
 * Implementation of getter methods for ITagIndexRepository
 * Final implementation class with all methods
 */
export class FileSystemTagIndexRepository extends FileSystemTagIndexRepositoryModifiers {
  /**
   * Get all tags in branch tag index
   * @param branchInfo Branch information
   * @returns Promise resolving to array of unique tags
   */
  async getBranchTags(branchInfo: BranchInfo): Promise<Tag[]> {
    logger.info(`Getting all tags for branch: ${branchInfo.name}`);
    
    try {
      // Read existing index
      const tagIndex = await this.readBranchIndex(branchInfo);
      if (!tagIndex) {
        return [];
      }
      
      // Extract unique tags
      return tagIndex.index.map(entry => Tag.create(entry.tag));
    } catch (error) {
      logger.error(`Error getting branch tags for branch: ${branchInfo.name}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to get branch tags: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get all tags in global tag index
   * @returns Promise resolving to array of unique tags
   */
  async getGlobalTags(): Promise<Tag[]> {
    logger.info('Getting all global tags');
    
    try {
      // Read existing index
      const tagIndex = await this.readGlobalIndex();
      if (!tagIndex) {
        return [];
      }
      
      // Extract unique tags
      return tagIndex.index.map(entry => Tag.create(entry.tag));
    } catch (error) {
      logger.error('Error getting global tags', error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to get global tags: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
