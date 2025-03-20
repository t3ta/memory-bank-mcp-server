import { BranchInfo } from '../../../domain/entities/BranchInfo';
import { Tag } from '../../../domain/entities/Tag';
import { ITagIndexRepository } from '../../../domain/repositories/ITagIndexRepository';
import { logger } from '../../../shared/utils/logger';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from '../../../shared/errors/InfrastructureError';
import { FileSystemTagIndexRepositoryModifiers } from './FileSystemTagIndexRepositoryModifiers';

/**
 * Implementation of getter methods for ITagIndexRepository
 * Final implementation class with all methods
 */
export class FileSystemTagIndexRepository
  extends FileSystemTagIndexRepositoryModifiers
  implements ITagIndexRepository
{
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
      return tagIndex.index.map((entry) => Tag.create(entry.tag));
    } catch (error) {
      logger.error(`Error getting branch tags for branch: ${branchInfo.name}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
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
      return tagIndex.index.map((entry) => Tag.create(entry.tag));
    } catch (error) {
      logger.error('Error getting global tags', error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to get global tags: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
