import { IUseCase } from '../../interfaces/IUseCase.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { ITagIndexRepository } from '../../../domain/repositories/ITagIndexRepository.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../shared/errors/ApplicationError.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import { getLogger } from '../../../shared/utils/logger.js';

const logger = getLogger('UpdateTagIndexUseCaseV2');

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
 * Enhanced use case for updating tag index with JSON persistence
 */
export class UpdateTagIndexUseCaseV2 implements IUseCase<UpdateTagIndexInput, UpdateTagIndexOutput> {
  /**
   * Constructor
   * @param globalRepository Global memory bank repository
   * @param branchRepository Branch memory bank repository
   * @param tagIndexRepository Tag index repository
   */
  constructor(
    private readonly globalRepository: IGlobalMemoryBankRepository,
    private readonly branchRepository: IBranchMemoryBankRepository,
    private readonly tagIndexRepository: ITagIndexRepository
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: UpdateTagIndexInput): Promise<UpdateTagIndexOutput> {
    try {
      logger.info(
        `Updating tag index: ${input.branchName || 'global'}, fullRebuild: ${input.fullRebuild || false}`
      );

      // Set default values
      const fullRebuild = input.fullRebuild ?? false;
      const updateLocation = input.branchName ? input.branchName : 'global';

      let result;

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

        // Update branch tag index using the tag index repository
        result = await this.tagIndexRepository.updateBranchTagIndex(branchInfo, {
          fullRebuild
        });
      } else {
        // Update global tag index using the tag index repository
        result = await this.tagIndexRepository.updateGlobalTagIndex({
          fullRebuild
        });
      }

      // Return combined result
      return {
        tags: result.tags,
        documentCount: result.documentCount,
        updateInfo: {
          fullRebuild,
          updateLocation,
          timestamp: result.updateInfo.timestamp,
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
