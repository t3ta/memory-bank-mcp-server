import path from "path";
import fs from "fs/promises";
import { logger } from "../../../shared/utils/logger.js";
// import { BranchInfo } from "../../../domain/entities/BranchInfo.js"; // ★ 未使用なのでコメントアウト (または削除)

/**
 * Manages branch directories within the file system.
 * Handles creation and existence checks.
 */
export class BranchDirectoryManager {
  private readonly branchMemoryBankPath: string;

  /**
   * Constructor
   * @param rootPath Root path for the memory bank (e.g., docs/)
   */
  constructor(rootPath: string) {
    this.branchMemoryBankPath = path.join(rootPath, 'branch-memory-bank');
    logger.debug(`[BranchDirectoryManager] Initialized with rootPath: ${rootPath}`);
  }

  /**
   * Gets the full path for a given branch name.
   * @param branchName The original branch name.
   * @returns The full path to the branch directory.
   */
  private getBranchPath(branchName: string): string {
    // TODO: Use BranchInfo.toSafeBranchName for robust conversion if needed
    const safeBranchName = branchName.replace(/\//g, '-'); // Basic sanitization
    return path.join(this.branchMemoryBankPath, safeBranchName);
  }

  /**
   * Check if branch directory exists.
   * Migrated from FileSystemBranchMemoryBankRepository.exists
   * @param branchName Branch name
   * @returns Promise resolving to boolean indicating if branch directory exists
   */
  async exists(branchName: string): Promise<boolean> {
    const branchPath = this.getBranchPath(branchName);
    logger.debug('[BranchDirectoryManager] Checking if branch exists:', { branchPath });
    try {
      await fs.access(branchPath);
      logger.debug('[BranchDirectoryManager] Branch directory exists:', { branchPath });
      return true;
    } catch (err) {
      logger.debug('[BranchDirectoryManager] Branch directory does not exist:', {
        branchName,
        branchPath,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Ensures the branch directory exists, creating it if necessary.
   * Migrated from FileSystemBranchMemoryBankRepository.initialize (directory creation part)
   * @param branchName Branch name
   * @returns Promise resolving to the branch path when the directory is ready.
   * @throws If directory creation fails.
   */
  async ensureBranchDirectoryExists(branchName: string): Promise<string> {
    const branchPath = this.getBranchPath(branchName);
    logger.debug('[BranchDirectoryManager] Ensuring branch directory exists:', { branchPath });
    try {
      await fs.mkdir(branchPath, { recursive: true });
      logger.debug('[BranchDirectoryManager] Successfully ensured branch directory exists:', { branchPath });
      return branchPath;
    } catch (error) {
      logger.error('[BranchDirectoryManager] Failed to create branch directory:', {
        branchPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Re-throw or handle as appropriate for the Facade
      // Consider throwing a specific DomainError here
      throw new Error(`Failed to ensure branch directory exists: ${branchPath}`);
    }
  }
}
