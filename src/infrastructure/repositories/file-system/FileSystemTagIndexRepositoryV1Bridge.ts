import path from "path";
import type { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import type { TagIndex } from "@memory-bank/schemas";
import type { FileSystemService } from "../../storage/FileSystemService.js";
import type { FileSystemBranchMemoryBankRepository } from "./FileSystemBranchMemoryBankRepository.js";
import type { FileSystemGlobalMemoryBankRepository } from "./FileSystemGlobalMemoryBankRepository.js";
import { logger } from "../../../shared/utils/logger.js";


/**
 * Bridge implementation for V1 tag index format
 * This class provides compatibility between the v2 tag index repository and the v1 format
 */
export class FileSystemTagIndexRepositoryV1Bridge {
  // キャッシュ管理
  private branchIndexCache = new Map<string, TagIndex>();
  private globalIndexCache: TagIndex | null = null;
  private readonly CACHE_TTL_MS = 30000; // 30秒キャッシュを保持

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
  ) { }

  /**
   * Save tag index for branch
   * @param branchInfo Branch information
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveBranchTagIndex(branchInfo: BranchInfo, tagIndex: TagIndex): Promise<void> {
    // キャッシュに保存
    this.branchIndexCache.set(branchInfo.safeName, tagIndex);
    logger.debug(`Saved branch tag index to cache: ${branchInfo.name}`);
    return this.branchRepository.saveTagIndex(branchInfo, tagIndex);
  }

  /**
   * Get tag index for branch
   * @param branchInfo Branch information
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getBranchTagIndex(branchInfo: BranchInfo): Promise<TagIndex | null> {
    // キャッシュチェック
    const cachedIndex = this.branchIndexCache.get(branchInfo.safeName);
    if (cachedIndex) {
      logger.debug(`Using cached branch tag index for ${branchInfo.name}`);
      return cachedIndex;
    }

    const index = await this.branchRepository.getTagIndex(branchInfo);
    if (index) {
      this.branchIndexCache.set(branchInfo.safeName, index);
      logger.debug(`Loaded and cached branch tag index for ${branchInfo.name}`);
    }
    return index;
  }

  /**
   * Save tag index for global memory bank
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveGlobalTagIndex(tagIndex: TagIndex): Promise<void> {
    // キャッシュに保存
    this.globalIndexCache = tagIndex;
    logger.debug(`Saved global tag index to cache`);
    return this.globalRepository.saveTagIndex(tagIndex);
  }

  /**
   * Get tag index for global memory bank
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getGlobalTagIndex(): Promise<TagIndex | null> {
    // キャッシュチェック
    if (this.globalIndexCache) {
      logger.debug(`Using cached global tag index`);
      return this.globalIndexCache;
    }

    const index = await this.globalRepository.getTagIndex();
    if (index) {
      this.globalIndexCache = index;
      logger.debug(`Loaded and cached global tag index`);
    }
    return index;
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
