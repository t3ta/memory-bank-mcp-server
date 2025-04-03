import path from "path";
import fs from "fs/promises";
import { logger } from "../../../shared/utils/logger.js";
import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import type { BranchTagIndex as TagIndex } from "@memory-bank/schemas";

/**
 * Handles reading and writing the tag index file (_index.json) for a branch.
 */
export class TagIndexHandler {
  private readonly branchMemoryBankPath: string;

  /**
   * Constructor
   * @param rootPath Root path for the memory bank (e.g., docs/)
   */
  constructor(rootPath: string) {
    this.branchMemoryBankPath = path.join(rootPath, 'branch-memory-bank');
    logger.debug(`[TagIndexHandler] Initialized with rootPath: ${rootPath}`);
  }

  /**
   * Gets the full path to the index file for a given branch.
   * @param branchInfo Branch information.
   * @returns The full path to the _index.json file.
   */
  private getIndexPath(branchInfo: BranchInfo): string {
    const safeBranchName = branchInfo.safeName;
    const branchPath = path.join(this.branchMemoryBankPath, safeBranchName);
    return path.join(branchPath, '_index.json');
  }

  /**
   * Saves the tag index file for a branch.
   * Migrated from FileSystemBranchMemoryBankRepository.saveTagIndex
   * @param branchInfo Branch information
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveTagIndex(branchInfo: BranchInfo, tagIndex: TagIndex): Promise<void> {
    const indexPath = this.getIndexPath(branchInfo);
    logger.debug(`[TagIndexHandler] Saving tag index to: ${indexPath}`);
    try {
      const parentDir = path.dirname(indexPath);
      await fs.mkdir(parentDir, { recursive: true }); // Ensure parent directory exists
      await fs.writeFile(indexPath, JSON.stringify(tagIndex, null, 2), 'utf-8');
      logger.debug(`[TagIndexHandler] Successfully saved tag index: ${indexPath}`);
    } catch (error: unknown) {
       logger.error(`[TagIndexHandler] Failed to save tag index: ${indexPath}`, { error });
      throw new DomainError(
        DomainErrorCodes.REPOSITORY_ERROR,
        `Failed to save tag index: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Gets the tag index for a branch.
   * Migrated from FileSystemBranchMemoryBankRepository.getTagIndex
   * @param branchInfo Branch information
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getTagIndex(branchInfo: BranchInfo): Promise<TagIndex | null> {
    const indexPath = this.getIndexPath(branchInfo);
    logger.debug(`[TagIndexHandler] Getting tag index from: ${indexPath}`);
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(content) as TagIndex;
    } catch (error: unknown) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            logger.debug(`[TagIndexHandler] Tag index file not found: ${indexPath}`);
            return null; // Return null if index file doesn't exist
        }
        logger.error(`[TagIndexHandler] Error reading tag index ${indexPath}:`, error);
        return null; // Return null on other errors as well
    }
  }
}
