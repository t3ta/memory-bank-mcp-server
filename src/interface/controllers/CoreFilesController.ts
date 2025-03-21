import { ReadBranchCoreFilesUseCase } from '../../application/usecases/common/ReadBranchCoreFilesUseCase.js';
import { CreateBranchCoreFilesUseCase } from '../../application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { CoreFilesDTO } from '../../application/dtos/CoreFilesDTO.js';
import { DomainError } from '../../shared/errors/DomainError.js';
import { ApplicationError } from '../../shared/errors/ApplicationError.js';

/**
 * Response interface for core files operations
 */
export interface CoreFilesResponse<T = any> {
  /**
   * Indicates if the operation was successful
   */
  success: boolean;

  /**
   * Error message if operation failed
   */
  error?: string;

  /**
   * Response data
   */
  data?: T;
}

/**
 * Controller for core files operations
 */
export class CoreFilesController {
  /**
   * Constructor
   * @param readCoreFilesUseCase Use case for reading core files
   * @param createCoreFilesUseCase Use case for creating core files
   */
  constructor(
    private readonly readCoreFilesUseCase: ReadBranchCoreFilesUseCase,
    private readonly createCoreFilesUseCase: CreateBranchCoreFilesUseCase
  ) {}

  /**
   * Read core files from a branch
   * @param branchName Branch name
   * @returns Promise resolving to core files response
   */
  async readCoreFiles(branchName: string): Promise<CoreFilesResponse<CoreFilesDTO>> {
    console.log(`CoreFilesController: Reading core files for branch: ${branchName}`);
    try {
      const result = await this.readCoreFilesUseCase.execute({
        branchName
      });

      console.log(`CoreFilesController: Successfully read core files. Data:`, JSON.stringify(result.files, null, 2));
      return {
        success: true,
        data: result.files
      };
    } catch (error) {
      console.error(`CoreFilesController: Error reading core files:`, error);
      if (error instanceof DomainError || error instanceof ApplicationError) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: `Failed to read core files: ${(error as Error).message}`
      };
    }
  }

  /**
   * Create or update core files in a branch
   * @param branchName Branch name
   * @param coreFiles Core files data
   * @returns Promise resolving to core files response
   */
  async createCoreFiles(
    branchName: string,
    coreFiles: CoreFilesDTO
  ): Promise<CoreFilesResponse<void>> {
    try {
      await this.createCoreFilesUseCase.execute({
        branchName,
        files: coreFiles
      });

      return {
        success: true
      };
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: `Failed to create core files: ${(error as Error).message}`
      };
    }
  }
}
