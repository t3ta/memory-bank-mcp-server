import { IUseCase } from '../interfaces/IUseCase.js';
import { IBranchMemoryBankRepository } from '../../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../domain/repositories/IGlobalMemoryBankRepository.js';
import { BranchInfo } from '../../domain/entities/BranchInfo.js';
import { Tag } from '../../domain/entities/Tag.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../shared/errors/ApplicationError.js';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { TagIndex } from '../../schemas/tag-index/tag-index-schema.js';
import { logger } from '../../shared/utils/logger.js';

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
      // Set default values
      const fullRebuild = input.fullRebuild ?? false;
      const updateLocation = input.branchName ? input.branchName : 'global';
      const timestamp = new Date().toISOString();

      logger.info(`Updating tag index for ${updateLocation} (fullRebuild: ${fullRebuild})`);

      let documentCount = 0;
      let allTags: Tag[] = [];
      let tagMap: Record<string, string[]> = {};

      // Update tag index in either branch or global memory bank
      if (input.branchName) {
        // Branch memory bank
        const result = await this.updateBranchTagIndex(input.branchName, fullRebuild);
        documentCount = result.documentCount;
        allTags = result.tags;
        tagMap = result.tagMap;
      } else {
        // Global memory bank
        const result = await this.updateGlobalTagIndex(fullRebuild);
        documentCount = result.documentCount;
        allTags = result.tags;
        tagMap = result.tagMap;
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
      // Re-throw domain and application errors
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // Wrap other errors
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
    // Check if branch exists
    const branchExists = await this.branchRepository.exists(branchName);

    if (!branchExists) {
      throw new DomainError(DomainErrorCodes.BRANCH_NOT_FOUND, `Branch "${branchName}" not found`);
    }

    // Create branch info
    const branchInfo = BranchInfo.create(branchName);

    // Check for existing tag index if not doing a full rebuild
    let existingTagIndex: TagIndex | null = null;
    if (!fullRebuild) {
      if (this.tagIndexRepository) {
        existingTagIndex = await this.tagIndexRepository.getBranchTagIndex(branchInfo);
      } else {
        existingTagIndex = await this.branchRepository.getTagIndex(branchInfo);
      }
    }

    // Get all documents in branch
    const documentPaths = await this.branchRepository.listDocuments(branchInfo);
    const documentCount = documentPaths.length;

    // Process the documents and build the tag index
    const { tagMap, allTags } = await this.buildTagIndex(
      documentPaths,
      existingTagIndex,
      async (path) => await this.branchRepository.getDocument(branchInfo, path)
    );

    // Create and save the tag index
    const tagIndex: TagIndex = {
      schema: 'tag_index_v1',
      metadata: {
        updatedAt: new Date().toISOString(),
        documentCount,
        fullRebuild,
        context: branchInfo.name,
      },
      index: tagMap,
    };

    // Save the tag index using the repository, if available, otherwise fall back to direct save
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
    // Check for existing tag index if not doing a full rebuild
    let existingTagIndex: TagIndex | null = null;
    if (!fullRebuild) {
      if (this.tagIndexRepository) {
        existingTagIndex = await this.tagIndexRepository.getGlobalTagIndex();
      } else {
        existingTagIndex = await this.globalRepository.getTagIndex();
      }
    }

    // Get all documents in global memory bank
    const documentPaths = await this.globalRepository.listDocuments();
    const documentCount = documentPaths.length;

    // Process the documents and build the tag index
    const { tagMap, allTags } = await this.buildTagIndex(
      documentPaths,
      existingTagIndex,
      async (path) => await this.globalRepository.getDocument(path)
    );

    // Create and save the tag index
    const tagIndex: TagIndex = {
      schema: 'tag_index_v1',
      metadata: {
        updatedAt: new Date().toISOString(),
        documentCount,
        fullRebuild,
        context: 'global',
      },
      index: tagMap,
    };

    // Save the tag index using the repository, if available, otherwise fall back to direct save
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
    existingTagIndex: TagIndex | null,
    documentGetter: (path: DocumentPath) => Promise<any>
  ): Promise<{
    tagMap: Record<string, string[]>;
    allTags: Tag[];
  }> {
    // Initialize tag map from existing index or create new one
    const tagMap: Record<string, string[]> = existingTagIndex ? { ..existingTagIndex.index } : {};

    // Use Set to track unique tags
    const tagSet = new Set<string>();

    // Process each document
    for (const path of documentPaths) {
      try {
        const document = await documentGetter(path);

        if (document) {
          // For each tag in the document, add the document path to the tag's list
          for (const tag of document.tags) {
            const tagValue = tag.value;
            tagSet.add(tagValue);

            if (!tagMap[tagValue]) {
              tagMap[tagValue] = [];
            }

            // Only add the path if it's not already in the list
            if (!tagMap[tagValue].includes(path.value)) {
              tagMap[tagValue].push(path.value);
            }
          }
        }
      } catch (error) {
        // Log error but continue processing other documents
        logger.error(`Error processing document ${path.value} for tag index:`, error);
      }
    }

    // Convert Set to an array of Tag objects
    const allTags = Array.from(tagSet).map((tagValue) => Tag.create(tagValue));

    return { tagMap, allTags };
  }
}
