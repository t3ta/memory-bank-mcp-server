import path from "path";
import fs from "fs/promises";
import { logger } from "../../../shared/utils/logger.js";
import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";

/**
 * Handles listing documents within a specific branch directory.
 */
export class DocumentLister {
  private readonly branchMemoryBankPath: string;

  /**
   * Constructor
   * @param rootPath Root path for the memory bank (e.g., docs/)
   */
  constructor(rootPath: string) {
    this.branchMemoryBankPath = path.join(rootPath, 'branch-memory-bank');
    logger.debug(`[DocumentLister] Initialized with rootPath: ${rootPath}`);
  }

  /**
   * Gets the full path for a given branch name.
   * @param branchInfo Branch information.
   * @returns The full path to the branch directory.
   */
  private getBranchPath(branchInfo: BranchInfo): string {
    const safeBranchName = branchInfo.safeName;
    return path.join(this.branchMemoryBankPath, safeBranchName);
  }

  /**
   * Lists all relevant documents in a branch directory.
   * Migrated from FileSystemBranchMemoryBankRepository.listDocuments
   * @param branchInfo Branch information
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    const branchPath = this.getBranchPath(branchInfo);
    logger.debug(`[DocumentLister] Listing documents in: ${branchPath}`);
    try {
      const files = await fs.readdir(branchPath);
      // Filter out hidden files and index files, keep only .json (for now)
      // TODO: Decide if .md files should also be listed directly or inferred
      return files
        .filter(file => !file.startsWith('.') && !file.startsWith('_') && file.endsWith('.json'))
        .map(file => DocumentPath.create(file));
    } catch (error: unknown) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            logger.debug(`[DocumentLister] Branch directory not found: ${branchPath}`);
            return []; // Return empty array if directory doesn't exist
        }
        logger.error(`[DocumentLister] Error listing documents in ${branchPath}:`, error);
        return []; // Return empty array on other errors
    }
  }
}
