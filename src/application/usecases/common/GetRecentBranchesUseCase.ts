import { IUseCase } from '../../interfaces/IUseCase.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { RecentBranchDTO } from '../../dtos/RecentBranchDTO.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../shared/errors/ApplicationError.js';

/**
 * Input data for getting recent branches
 */
export interface GetRecentBranchesInput {
  /**
   * Maximum number of branches to retrieve (optional, default: 10)
   */
  limit?: number;
}

/**
 * Output data for getting recent branches
 */
export interface GetRecentBranchesOutput {
  /**
   * List of recent branches
   */
  branches: RecentBranchDTO[];
  
  /**
   * Total count of branches found
   */
  total: number;
}

/**
 * Use case for getting recent branches
 */
export class GetRecentBranchesUseCase implements IUseCase<GetRecentBranchesInput, GetRecentBranchesOutput> {
  /**
   * Constructor
   * @param branchRepository Branch memory bank repository
   */
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: GetRecentBranchesInput): Promise<GetRecentBranchesOutput> {
    try {
      // Set default limit
      const limit = input.limit ?? 10;
      
      if (limit < 1) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Limit must be a positive number'
        );
      }
      
      // Get recent branches from repository
      const recentBranches = await this.branchRepository.getRecentBranches(limit);
      
      // Transform to DTOs
      const branchDTOs = recentBranches.map(branch => ({
        name: branch.branchInfo.name,
        lastModified: branch.lastModified.toISOString(),
        summary: {
          currentWork: branch.summary.currentWork,
          recentChanges: branch.summary.recentChanges
        }
      }));
      
      return {
        branches: branchDTOs,
        total: branchDTOs.length
      };
    } catch (error) {
      // Re-throw application errors
      if (error instanceof ApplicationError) {
        throw error;
      }
      
      // Wrap other errors
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to get recent branches: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
