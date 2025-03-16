import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentId } from '../../../domain/entities/DocumentId.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { JsonDocument } from '../../../domain/entities/JsonDocument.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import {
  ITagIndexRepository,
  TagIndexOptions,
  TagIndexUpdateResult
} from '../../../domain/repositories/ITagIndexRepository.js';
import { FileSystemService } from '../../storage/FileSystemService.js';
import { PathUtils } from '../../../shared/utils/PathUtils.js';
import { getLogger } from '../../../shared/utils/Logger.js';
import {
  BaseTagIndex,
  BranchTagIndex,
  GlobalTagIndex,
  DocumentReference,
  TagEntry,
  TAG_INDEX_VERSION,
  BranchTagIndexSchema,
  GlobalTagIndexSchema
} from '../../../schemas/v2/tag-index.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';

const logger = getLogger('FileSystemTagIndexRepository');

/**
 * Implementation of ITagIndexRepository for file system storage
 */
export class FileSystemTagIndexRepository implements ITagIndexRepository {
  protected static readonly GLOBAL_INDEX_FILENAME = 'tag-index.json';
  protected static readonly BRANCH_INDEX_FILENAME = 'tag-index.json';

  /**
   * Create a new FileSystemTagIndexRepository instance
   * @param fileSystem File system service
   * @param branchMemoryBankRoot Root path for branch memory banks
   * @param globalMemoryBankPath Path to global memory bank
   */
  constructor(
    protected readonly fileSystem: FileSystemService,
    protected readonly branchMemoryBankRoot: string,
    protected readonly globalMemoryBankPath: string
  ) {}

  /**
   * Get path to branch index file
   * @param branchInfo Branch information
   * @returns Path to branch index file
   */
  protected getBranchIndexPath(branchInfo: BranchInfo): string {
    const normalizedBranchName = branchInfo.getNormalizedName();
    return PathUtils.join(
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
    return PathUtils.join(
      this.globalMemoryBankPath,
      FileSystemTagIndexRepository.GLOBAL_INDEX_FILENAME
    );
  }

  /**
   * Read branch index file
   * @param branchInfo Branch information
   * @returns Promise resolving to branch index or null if not found
   */
  protected async readBranchIndex(branchInfo: BranchInfo): Promise<BranchTagIndex | null> {
    const indexPath = this.getBranchIndexPath(branchInfo);

    try {
      const exists = await this.fileSystem.exists(indexPath);
      if (!exists) {
        return null;
      }

      const content = await this.fileSystem.readFile(indexPath);
      const indexData = JSON.parse(content);

      // Validate index data
      const validatedData = BranchTagIndexSchema.parse(indexData);
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

      if (error instanceof InfrastructureError && 
          error.code === InfrastructureErrorCodes.FILE_NOT_FOUND) {
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
    const indexPath = this.getGlobalIndexPath();

    try {
      const exists = await this.fileSystem.exists(indexPath);
      if (!exists) {
        return null;
      }

      const content = await this.fileSystem.readFile(indexPath);
      const indexData = JSON.parse(content);

      // Validate index data
      const validatedData = GlobalTagIndexSchema.parse(indexData);
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

      if (error instanceof InfrastructureError && 
          error.code === InfrastructureErrorCodes.FILE_NOT_FOUND) {
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
    
    try {
      // Ensure directory exists
      const dirPath = PathUtils.dirname(indexPath);
      await this.fileSystem.ensureDir(dirPath);
      
      // Write the file
      const content = JSON.stringify(index, null, 2);
      await this.fileSystem.writeFile(indexPath, content);
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
      // Ensure directory exists
      const dirPath = PathUtils.dirname(indexPath);
      await this.fileSystem.ensureDir(dirPath);
      
      // Write the file
      const content = JSON.stringify(index, null, 2);
      await this.fileSystem.writeFile(indexPath, content);
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
   * Create a document reference from a memory document
   * @param document Memory document
   * @returns Document reference
   */
  protected createDocumentReference(document: MemoryDocument | JsonDocument): DocumentReference {
    // Handle different document types
    if (document instanceof JsonDocument) {
      return {
        id: document.id.value,
        path: document.path.value,
        title: document.title,
        lastModified: document.lastModified
      };
    } else {
      // Legacy MemoryDocument doesn't have id or title
      // Generate a deterministic ID based on path
      const pathHash = document.path.value;
      const id = DocumentId.create(
        pathHash.padEnd(36, '0').substring(0, 36)
      );
      
      return {
        id: id.value,
        path: document.path.value,
        title: document.path.basename || document.path.value,
        lastModified: document.lastModified
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
        tagCount: 0
      },
      index: []
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
        tagCount: 0
      },
      index: []
    };
  }

  // インターフェースのメソッド実装部分は別ファイルに分けます
}
