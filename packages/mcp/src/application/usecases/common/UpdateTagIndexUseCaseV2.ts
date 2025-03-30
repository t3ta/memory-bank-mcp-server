import { IUseCase } from '../../interfaces/IUseCase.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { Tag } from '../../../domain/entities/Tag.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../shared/errors/ApplicationError.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { BranchTagIndex, GlobalTagIndex } from '@memory-bank/schemas';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Input data for updating tag index
 */
export interface UpdateTagIndexInput {
  /**
   * Branch name (optional - if not provided, updates global tag index)
   */
  branchName?: string;

  /**
   * Whether to perform a full rebuild of the index (default: false)
   */
  fullRebuild?: boolean;
}

/**
 * Output data for updating tag index
 */
export interface UpdateTagIndexOutput {
  /**
   * List of all unique tags found
   */
  tags: string[];

  /**
   * Number of documents indexed
   */
  documentCount: number;

  /**
   * Information about the update
   */
  updateInfo: {
    /**
     * Whether a full rebuild was performed
     */
    fullRebuild: boolean;

    /**
     * Where the update was performed (branch name or 'global')
     */
    updateLocation: string;

    /**
     * When the update was performed
     */
    timestamp: string;
  };
}

/**
 * Use case for updating tag index with JSON persistence
 */
export class UpdateTagIndexUseCaseV2
  implements IUseCase<UpdateTagIndexInput, UpdateTagIndexOutput> {
  /**
   * Constructor
   * @param globalRepository Global memory bank repository
   * @param branchRepository Branch memory bank repository
   * @param tagIndexRepository Tag index repository (optional)
   */
  constructor(
    private readonly globalRepository: IGlobalMemoryBankRepository,
    private readonly branchRepository: IBranchMemoryBankRepository,
    private readonly tagIndexRepository?: any
  ) { }

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: UpdateTagIndexInput): Promise<UpdateTagIndexOutput> {
    try {
      const fullRebuild = input.fullRebuild ?? false;
      const updateLocation = input.branchName ? input.branchName : 'global';
      const timestamp = new Date().toISOString();

      logger.info(`Updating tag index for ${updateLocation} (fullRebuild: ${fullRebuild})`);

      let documentCount = 0;
      let allTags: Tag[] = [];

      if (input.branchName) {
        const result = await this.updateBranchTagIndex(input.branchName, fullRebuild);
        documentCount = result.documentCount;
        allTags = result.tags;
      } else {
        const result = await this.updateGlobalTagIndex(fullRebuild);
        documentCount = result.documentCount;
        allTags = result.tags;
      }

      return {
        tags: allTags.map((tag) => tag.value),
        documentCount,
        updateInfo: {
          fullRebuild,
          updateLocation,
          timestamp,
        },
      };
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to update tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Update branch tag index
   * @param branchName Branch name
   * @param fullRebuild Whether to perform a full rebuild
   * @returns Promise resolving to update result
   */
  private async updateBranchTagIndex(
    branchName: string,
    fullRebuild: boolean
  ): Promise<{
    documentCount: number;
    tags: Tag[];
    tagMap: Record<string, string[]>;
  }> {
    const branchExists = await this.branchRepository.exists(branchName);

    if (!branchExists) {
      throw new DomainError(DomainErrorCodes.BRANCH_NOT_FOUND, `Branch "${branchName}" not found`);
    }

    const branchInfo = BranchInfo.create(branchName);

    let existingTagIndex: BranchTagIndex | null = null;
    if (!fullRebuild) {
      if (this.tagIndexRepository) {
        existingTagIndex = await this.tagIndexRepository.getBranchTagIndex(branchInfo);
      } else {
        existingTagIndex = await this.branchRepository.getTagIndex(branchInfo);
      }
    }

    const documentPaths = await this.branchRepository.listDocuments(branchInfo);
    const documentCount = documentPaths.length;

    const { tagMap, allTags } = await this.buildTagIndex(
      documentPaths,
      existingTagIndex,
      async (path) => await this.branchRepository.getDocument(branchInfo, path)
    );

    const tagEntries = Object.entries(tagMap).map(([tagValue, paths]) => {
      return {
        tag: tagValue,
        documents: paths.map(path => ({
          id: '', // ID cannot be retrieved here, set to empty string
          path: path,
          title: path.split('/').pop() || path,
          lastModified: new Date() // Date type is required
        }))
      };
    });

    const tagIndex: BranchTagIndex = {
      schema: 'tag_index_v1',
      metadata: {
        indexType: 'branch',
        branchName: branchInfo.name,
        lastUpdated: new Date(), // Date type is required
        documentCount,
        tagCount: allTags.length,
      },
      index: tagEntries,
    };

    if (this.tagIndexRepository) {
      await this.tagIndexRepository.saveBranchTagIndex(branchInfo, tagIndex);
    } else {
      await this.branchRepository.saveTagIndex(branchInfo, tagIndex);
    }
    logger.info(`Saved tag index for branch ${branchName} with ${allTags.length} tags`);

    return { documentCount, tags: allTags, tagMap };
  }

  /**
   * Update global tag index
   * @param fullRebuild Whether to perform a full rebuild
   * @returns Promise resolving to update result
   */
  private async updateGlobalTagIndex(fullRebuild: boolean): Promise<{
    documentCount: number;
    tags: Tag[];
    tagMap: Record<string, string[]>;
  }> {
    let existingTagIndex: GlobalTagIndex | null = null;
    if (!fullRebuild) {
      if (this.tagIndexRepository) {
        existingTagIndex = await this.tagIndexRepository.getGlobalTagIndex();
      } else {
        existingTagIndex = await this.globalRepository.getTagIndex();
      }
    }

    const documentPaths = await this.globalRepository.listDocuments();
    const documentCount = documentPaths.length;

    const { tagMap, allTags } = await this.buildTagIndex(
      documentPaths,
      existingTagIndex,
      async (path) => await this.globalRepository.getDocument(path)
    );

    const tagEntries = Object.entries(tagMap).map(([tagValue, paths]) => {
      return {
        tag: tagValue,
        documents: paths.map(path => ({
          id: '', // ID cannot be retrieved here, set to empty string
          path: path,
          title: path.split('/').pop() || path,
          lastModified: new Date() // Date type is required
        }))
      };
    });

    const tagIndex: GlobalTagIndex = {
      schema: 'tag_index_v1',
      metadata: {
        indexType: 'global',
        lastUpdated: new Date(), // Date type is required
        documentCount,
        tagCount: allTags.length,
      },
      index: tagEntries,
    };

    if (this.tagIndexRepository) {
      await this.tagIndexRepository.saveGlobalTagIndex(tagIndex);
    } else {
      await this.globalRepository.saveTagIndex(tagIndex);
    }
    logger.info(`Saved global tag index with ${allTags.length} tags`);

    return { documentCount, tags: allTags, tagMap };
  }

  /**
   * Build tag index from document paths
   * @param documentPaths Document paths to process
   * @param existingTagIndex Existing tag index (if any)
   * @param documentGetter Function to get document by path
   * @returns Tag index data
   */
  private async buildTagIndex(
    documentPaths: DocumentPath[],
    existingTagIndex: BranchTagIndex | GlobalTagIndex | null,
    documentGetter: (path: DocumentPath) => Promise<any>
  ): Promise<{
    tagMap: Record<string, string[]>;
    allTags: Tag[];
  }> {
    const tagMap: Record<string, string[]> = {};
    void existingTagIndex; // Silence unused parameter warning for now

    const tagSet = new Set<string>();

    for (const path of documentPaths) {
      try {
        const document = await documentGetter(path);

        if (document) {
          for (const tag of document.tags) {
            const tagValue = tag.value;
            tagSet.add(tagValue);

            if (!tagMap[tagValue]) {
              tagMap[tagValue] = [];
            }

            if (!tagMap[tagValue].includes(path.value)) {
              tagMap[tagValue].push(path.value);
            }
          }
        }
      } catch (error) {
        logger.error(`Error processing document ${path.value} for tag index:`, error);
      }
    }

    const allTags = Array.from(tagSet).map((tagValue) => Tag.create(tagValue));

    return { tagMap, allTags };
  }
}
