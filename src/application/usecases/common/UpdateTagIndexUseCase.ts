import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { Tag } from "../../../domain/entities/Tag.js";
import type { IBranchMemoryBankRepository } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import type { IGlobalMemoryBankRepository } from "../../../domain/repositories/IGlobalMemoryBankRepository.js";
import { ApplicationError, ApplicationErrorCodes } from "../../../shared/errors/ApplicationError.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import type { IUseCase } from "../../interfaces/IUseCase.js";


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
 * Use case for updating tag index
 */
export class UpdateTagIndexUseCase implements IUseCase<UpdateTagIndexInput, UpdateTagIndexOutput> {
  /**
   * Constructor
   * @param globalRepository Global memory bank repository
   * @param branchRepository Branch memory bank repository
   */
  constructor(
    private readonly globalRepository: IGlobalMemoryBankRepository,
    private readonly branchRepository: IBranchMemoryBankRepository
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

      let documentCount = 0;
      let allTags: Tag[] = [];

      // Update tag index in either branch or global memory bank
      if (input.branchName) {
        // Check if branch exists
        const branchExists = await this.branchRepository.exists(input.branchName);

        if (!branchExists) {
          throw new DomainError(
            DomainErrorCodes.BRANCH_NOT_FOUND,
            `Branch "${input.branchName}" not found`
          );
        }

        // Create branch info
        const branchInfo = BranchInfo.create(input.branchName);

        // Get all documents in branch
        const documentPaths = await this.branchRepository.listDocuments(branchInfo);
        documentCount = documentPaths.length;

        // Collect all tags
        const tagSet = new Set<string>();

        for (const path of documentPaths) {
          const document = await this.branchRepository.getDocument(branchInfo, path);
          if (document) {
            document.tags.forEach((tag) => tagSet.add(tag.value));
          }
        }

        allTags = Array.from(tagSet).map((tag) => Tag.create(tag));

        // In a real implementation, we would update a tag index persistently here
        // For now, we're just collecting the tags for the response
      } else {
        // Update global tag index
        const documentPaths = await this.globalRepository.listDocuments();
        documentCount = documentPaths.length;

        // Collect all tags
        const tagSet = new Set<string>();

        for (const path of documentPaths) {
          const document = await this.globalRepository.getDocument(path);
          if (document) {
            document.tags.forEach((tag) => tagSet.add(tag.value));
          }
        }

        allTags = Array.from(tagSet).map((tag) => Tag.create(tag));

        // In a real implementation, we would update a tag index persistently here
        // For now, we're just collecting the tags for the response
      }

      return {
        tags: allTags.map((tag) => tag.value),
        documentCount,
        updateInfo: {
          fullRebuild,
          updateLocation,
          timestamp: new Date().toISOString(),
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
}
