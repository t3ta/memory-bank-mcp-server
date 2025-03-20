import path from 'path';
import { FileSystemService } from '../../storage/FileSystemService';
import { FileSystemBranchMemoryBankRepository } from './FileSystemBranchMemoryBankRepository';
import { FileSystemGlobalMemoryBankRepository } from './FileSystemGlobalMemoryBankRepository';
import { BranchInfo } from '../../../domain/entities/BranchInfo';
import { TagIndex } from '../../../schemas/tag-index/tag-index-schema';
import { logger } from '../../../shared/utils/logger';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from '../../../shared/errors/InfrastructureError';

/**
 * Bridge implementation for V1 tag index format
 * This class provides compatibility between the v2 tag index repository and the v1 format
 */
export class FileSystemTagIndexRepositoryV1Bridge {
  /**
   * Constructor
   * @param fileSystemService File system service
   * @param branchMemoryBankRoot Path to branch memory bank root directory
   * @param globalMemoryBankPath Path to global memory bank
   * @param branchRepository Branch memory bank repository
   * @param globalRepository Global memory bank repository
   */
  constructor(
    private readonly fileSystemService: FileSystemService,
    private readonly branchMemoryBankRoot: string,
    private readonly globalMemoryBankPath: string,
    private readonly branchRepository: FileSystemBranchMemoryBankRepository,
    private readonly globalRepository: FileSystemGlobalMemoryBankRepository
  ) {}

  /**
   * Save tag index for branch
   * @param branchInfo Branch information
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveBranchTagIndex(branchInfo: BranchInfo, tagIndex: TagIndex): Promise<void> {
    return this.branchRepository.saveTagIndex(branchInfo, tagIndex);
  }

  /**
   * Get tag index for branch
   * @param branchInfo Branch information
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getBranchTagIndex(branchInfo: BranchInfo): Promise<TagIndex | null> {
    return this.branchRepository.getTagIndex(branchInfo);
  }

  /**
   * Save tag index for global memory bank
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveGlobalTagIndex(tagIndex: TagIndex): Promise<void> {
    return this.globalRepository.saveTagIndex(tagIndex);
  }

  /**
   * Get tag index for global memory bank
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getGlobalTagIndex(): Promise<TagIndex | null> {
    return this.globalRepository.getTagIndex();
  }

  /**
   * Get branch path from branch info
   * @param branchInfo Branch information
   * @returns Branch path
   */
  getBranchPath(branchInfo: BranchInfo): string {
    return path.join(this.branchMemoryBankRoot, branchInfo.safeName);
  }

  /**
   * Get branch index file path
   * @param branchInfo Branch information
   * @returns Branch index file path
   */
  getBranchIndexPath(branchInfo: BranchInfo): string {
    return path.join(this.getBranchPath(branchInfo), '_index.json');
  }

  /**
   * Get global index file path
   * @returns Global index file path
   */
  getGlobalIndexPath(): string {
    return path.join(this.globalMemoryBankPath, '_global_index.json');
  }
}
