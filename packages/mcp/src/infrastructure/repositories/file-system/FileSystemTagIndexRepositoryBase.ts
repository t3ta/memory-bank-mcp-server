import path from "path";
import type { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentId } from "../../../domain/entities/DocumentId.js";
import { JsonDocument } from "../../../domain/entities/JsonDocument.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import type { IBranchMemoryBankRepository } from "../../../domain/repositories/IBranchMemoryBankRepository.js";
import type { IGlobalMemoryBankRepository } from "../../../domain/repositories/IGlobalMemoryBankRepository.js";
import { type BranchTagIndex, BranchTagIndexSchema, type GlobalTagIndex, GlobalTagIndexSchema, type DocumentReference, TAG_INDEX_VERSION } from "@memory-bank/schemas";

import { InfrastructureError, InfrastructureErrorCodes } from "../../../shared/errors/InfrastructureError.js";
import { logger } from "../../../shared/utils/logger.js";
import type { IFileSystemService } from "../../storage/interfaces/IFileSystemService.js";

/**
 * Implementation of ITagIndexRepository for file system storage
 */
export abstract class FileSystemTagIndexRepository {
  protected static readonly GLOBAL_INDEX_FILENAME = 'tag-index.json';
  protected static readonly BRANCH_INDEX_FILENAME = 'tag-index.json';

  // Cache management
  private branchIndexCache = new Map<string, { index: BranchTagIndex, lastUpdated: Date }>();
  private globalIndexCache: { index: GlobalTagIndex, lastUpdated: Date } | null = null;
  private readonly CACHE_TTL_MS = 30000; // Cache duration: 30 seconds

  /**
   * Create a new FileSystemTagIndexRepository instance
   * @param fileSystem File system service
   * @param branchMemoryBankRoot Root path for branch memory banks
   * @param globalMemoryBankPath Path to global memory bank
   */
  constructor(
    protected readonly fileSystem: IFileSystemService,
    protected readonly branchMemoryBankRoot: string,
    protected readonly globalMemoryBankPath: string,
    protected readonly branchRepository: IBranchMemoryBankRepository,
    protected readonly globalRepository: IGlobalMemoryBankRepository
  ) { }

  /**
   * Get path to branch index file
   * @param branchInfo Branch information
   * @returns Path to branch index file
   */
  protected getBranchIndexPath(branchInfo: BranchInfo): string {
    const normalizedBranchName = branchInfo.safeName;
    return path.join(
      this.branchMemoryBankRoot,
      normalizedBranchName,
      FileSystemTagIndexRepository.BRANCH_INDEX_FILENAME
    );
  }

  /**
   * Get path to global index file
   * @returns Path to global index file
   */
  protected getGlobalIndexPath(): string {
    return path.join(this.globalMemoryBankPath, FileSystemTagIndexRepository.GLOBAL_INDEX_FILENAME);
  }

  /**
   * Read branch index file
   * @param branchInfo Branch information
   * @returns Promise resolving to branch index or null if not found
   */
  protected async readBranchIndex(branchInfo: BranchInfo): Promise<BranchTagIndex | null> {
    const branchKey = branchInfo.safeName;
    const now = new Date();

    // Check cache
    const cachedData = this.branchIndexCache.get(branchKey);
    if (cachedData && (now.getTime() - cachedData.lastUpdated.getTime()) < this.CACHE_TTL_MS) {
      logger.debug(`Using cached branch index for ${branchInfo.name}`);
      return cachedData.index;
    }

    const indexPath = this.getBranchIndexPath(branchInfo);
    logger.debug(`Reading branch index from disk: ${indexPath}`);

    try {
      const exists = await this.fileSystem.fileExists(indexPath);
      if (!exists) {
        return null;
      }

      const content = await this.fileSystem.readFile(indexPath);
      const indexData = JSON.parse(content);

      const validatedData = BranchTagIndexSchema.parse(indexData);

      // Save to cache
      this.branchIndexCache.set(branchKey, { index: validatedData, lastUpdated: now });

      return validatedData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error(`Invalid JSON in branch tag index file: ${indexPath}`, error);
        return null;
      }

      if (error instanceof Error && error.name === 'ZodError') {
        logger.error(`Invalid branch tag index schema in file: ${indexPath}`, error);
        return null;
      }

      if (
        error instanceof InfrastructureError &&
        error.code === InfrastructureErrorCodes.FILE_NOT_FOUND
      ) {
        return null;
      }

      logger.error(`Error reading branch tag index file: ${indexPath}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to read branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Read global index file
   * @returns Promise resolving to global index or null if not found
   */
  protected async readGlobalIndex(): Promise<GlobalTagIndex | null> {
    const now = new Date();

    // Check cache
    if (this.globalIndexCache && (now.getTime() - this.globalIndexCache.lastUpdated.getTime()) < this.CACHE_TTL_MS) {
      logger.debug('Using cached global index');
      return this.globalIndexCache.index;
    }

    const indexPath = this.getGlobalIndexPath();
    logger.debug(`Reading global index from disk: ${indexPath}`);

    try {
      const exists = await this.fileSystem.fileExists(indexPath);
      if (!exists) {
        return null;
      }

      const content = await this.fileSystem.readFile(indexPath);
      const indexData = JSON.parse(content);

      const validatedData = GlobalTagIndexSchema.parse(indexData);

      // Save to cache
      this.globalIndexCache = { index: validatedData, lastUpdated: now };

      return validatedData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error(`Invalid JSON in global tag index file: ${indexPath}`, error);
        return null;
      }

      if (error instanceof Error && error.name === 'ZodError') {
        logger.error(`Invalid global tag index schema in file: ${indexPath}`, error);
        return null;
      }

      if (
        error instanceof InfrastructureError &&
        error.code === InfrastructureErrorCodes.FILE_NOT_FOUND
      ) {
        return null;
      }

      logger.error(`Error reading global tag index file: ${indexPath}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to read global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Write branch index file
   * @param branchInfo Branch information
   * @param index Branch index to write
   * @returns Promise resolving when complete
   */
  protected async writeBranchIndex(branchInfo: BranchInfo, index: BranchTagIndex): Promise<void> {
    const indexPath = this.getBranchIndexPath(branchInfo);
    const branchKey = branchInfo.safeName;

    try {
      const dirPath = path.dirname(indexPath);
      await this.fileSystem.createDirectory(dirPath);

      const content = JSON.stringify(index, null, 2);
      await this.fileSystem.writeFile(indexPath, content);

      // Update cache
      this.branchIndexCache.set(branchKey, { index, lastUpdated: new Date() });
      logger.debug(`Updated branch index cache for ${branchInfo.name}`);
    } catch (error) {
      logger.error(`Error writing branch tag index file: ${indexPath}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to write branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Write global index file
   * @param index Global index to write
   * @returns Promise resolving when complete
   */
  protected async writeGlobalIndex(index: GlobalTagIndex): Promise<void> {
    const indexPath = this.getGlobalIndexPath();

    try {
      const dirPath = path.dirname(indexPath);
      await this.fileSystem.createDirectory(dirPath);

      const content = JSON.stringify(index, null, 2);
      await this.fileSystem.writeFile(indexPath, content);

      // Update cache
      this.globalIndexCache = { index, lastUpdated: new Date() };
      logger.debug('Updated global index cache');
    } catch (error) {
      logger.error(`Error writing global tag index file: ${indexPath}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to write global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Invalidate the cache
   * @param branchInfo Branch information, or null to invalidate global cache
   */
  protected invalidateCache(branchInfo: BranchInfo | null = null): void {
    if (branchInfo) {
      const branchKey = branchInfo.safeName;
      this.branchIndexCache.delete(branchKey);
      logger.debug(`Invalidated branch index cache for ${branchInfo.name}`);
    } else {
      this.globalIndexCache = null;
      logger.debug('Invalidated global index cache');
    }
  }

  /**
   * Invalidate all caches
   */
  protected invalidateAllCaches(): void {
    this.branchIndexCache.clear();
    this.globalIndexCache = null;
    logger.debug('Invalidated all index caches');
  }

  protected createDocumentReference(document: MemoryDocument | JsonDocument): DocumentReference {
    if (document instanceof JsonDocument) {
      return {
        id: document.id.value,
        path: document.path.value,
        title: document.title,
        lastModified: document.lastModified,
      };
    } else {
      const pathValue = document.path.value;
      // For testing: generate a random UUID
      const id = DocumentId.generate();

      return {
        id: id.value,
        path: pathValue,
        title: path.basename(pathValue) || pathValue,
        lastModified: document.lastModified,
      };
    }
  }

  /**
   * Create an empty branch tag index
   * @param branchInfo Branch information
   * @returns Branch tag index
   */
  protected createEmptyBranchIndex(branchInfo: BranchInfo): BranchTagIndex {
    return {
      schema: TAG_INDEX_VERSION,
      metadata: {
        indexType: 'branch',
        branchName: branchInfo.name,
        lastUpdated: new Date(),
        documentCount: 0,
        tagCount: 0,
      },
      index: [],
    };
  }

  /**
   * Create an empty global tag index
   * @returns Global tag index
   */
  protected createEmptyGlobalIndex(): GlobalTagIndex {
    return {
      schema: TAG_INDEX_VERSION,
      metadata: {
        indexType: 'global',
        lastUpdated: new Date(),
        documentCount: 0,
        tagCount: 0,
      },
      index: [],
    };
  }

  // Interface method implementations are separated into another file
}
