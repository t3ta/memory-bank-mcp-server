import path from 'node:path';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import type { IConfigProvider } from '../../config/index.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';

/**
 * Component responsible for path-related operations
 */
export class PathOperations extends FileSystemMemoryBankRepositoryBase {
  /**
   * Constructor
   * @param basePath Base path
   * @param fileSystemService File system service
   * @param configProvider Configuration provider
   */
  constructor(
    private readonly basePath: string,
    fileSystemService: IFileSystemService,
    protected readonly configProvider: IConfigProvider
  ) {
    super(fileSystemService, configProvider);
  }

  /**
   * Get the base path for a branch
   * @param branchInfo Branch information
   * @returns Base path for the branch
   */
  getBranchBasePath(_branchInfo: BranchInfo): string {
    // branchInfo parameter is currently unused but kept for future extensibility
    return this.basePath;
  }

  /**
   * Get the global base path
   * @returns Global base path
   */
  getGlobalBasePath(): string {
    return this.basePath;
  }

  /**
   * Resolve a path
   * @param documentPath Document path
   * @returns Full file path
   */
  resolvePath(documentPath: string): string {
    // Normalize path
    const normalizedPath = path.normalize(documentPath);

    // Check for path traversal attacks
    if (normalizedPath.startsWith('..')) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Invalid document path: ${documentPath}. Path cannot traverse outside the base directory.`
      );
    }

    // Resolve full path
    return path.join(this.basePath, normalizedPath);
  }

  /**
   * Resolve a branch path
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns Full file path
   */
  resolveBranchPath(branchInfo: BranchInfo, documentPath: string): string {
    const branchBasePath = this.getBranchBasePath(branchInfo);
    return this.resolvePathWithBase(branchBasePath, documentPath);
  }

  /**
   * Resolve a path using a specified base path
   * @param basePath Base path
   * @param documentPath Document path
   * @returns Full file path
   */
  private resolvePathWithBase(basePath: string, documentPath: string): string {
    // Normalize path
    const normalizedPath = path.normalize(documentPath);

    // Check for path traversal attacks
    if (normalizedPath.startsWith('..')) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Invalid document path: ${documentPath}. Path cannot traverse outside the base directory.`
      );
    }

    // Resolve full path
    return path.join(basePath, normalizedPath);
  }

  /**
   * Check if a path exists
   * @param documentPath Document path
   * @returns true if the path exists, false otherwise
   */
  async exists(documentPath: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(documentPath);
      return await this.fileExists(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if path exists: ${documentPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Check if a branch path exists
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns true if the path exists, false otherwise
   */
  async branchPathExists(branchInfo: BranchInfo, documentPath: string): Promise<boolean> {
    try {
      const fullPath = this.resolveBranchPath(branchInfo, documentPath);
      return await this.fileExists(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if branch path exists: ${branchInfo.name}/${documentPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Create a directory
   * @param directoryPath Directory path
   */
  async createDirectory(directoryPath: string): Promise<void> {
    try {
      const fullPath = this.resolvePath(directoryPath);
      await super.createDirectory(fullPath);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to create directory: ${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Create a branch directory
   * @param branchInfo Branch information
   * @param directoryPath Directory path
   */
  async createBranchDirectory(branchInfo: BranchInfo, directoryPath: string): Promise<void> {
    try {
      const fullPath = this.resolveBranchPath(branchInfo, directoryPath);
      await super.createDirectory(fullPath);
      logger.debug(`Created directory for branch ${branchInfo.name}: ${directoryPath}`);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to create branch directory: ${branchInfo.name}/${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Check if a directory exists
   * @param directoryPath Directory path
   * @returns true if the directory exists, false otherwise
   */
  async directoryExists(directoryPath: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(directoryPath);
      return await super.directoryExists(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if directory exists: ${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Check if a branch directory exists
   * @param branchInfo Branch information
   * @param directoryPath Directory path
   * @returns true if the directory exists, false otherwise
   */
  async branchDirectoryExists(branchInfo: BranchInfo, directoryPath: string): Promise<boolean> {
    try {
      const fullPath = this.resolveBranchPath(branchInfo, directoryPath);
      return await super.directoryExists(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if branch directory exists: ${branchInfo.name}/${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get a list of files
   * @param directoryPath Directory path
   * @returns Array of file paths
   */
  async listFiles(directoryPath: string): Promise<string[]> {
    try {
      const fullPath = this.resolvePath(directoryPath);
      return await super.listFiles(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list files: ${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get a list of files in a branch
   * @param branchInfo Branch information
   * @param directoryPath Directory path
   * @returns Array of file paths
   */
  async listBranchFiles(branchInfo: BranchInfo, directoryPath: string): Promise<string[]> {
    try {
      const fullPath = this.resolveBranchPath(branchInfo, directoryPath);
      return await super.listFiles(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list files in branch: ${branchInfo.name}/${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Copy a file
   * @param sourcePath Source path
   * @param destinationPath Destination path
   */
  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const sourceFullPath = this.resolvePath(sourcePath);
      const destFullPath = this.resolvePath(destinationPath);

      // Ensure source file exists
      const exists = await this.fileExists(sourceFullPath);
      if (!exists) {
        throw new InfrastructureError(
          InfrastructureErrorCodes.FILE_NOT_FOUND,
          `Source file not found: ${sourcePath}`
        );
      }

      // Ensure destination directory exists
      const destDir = path.dirname(destFullPath);
      await super.createDirectory(destDir);

      // Read source file content
      const content = await this.readFile(sourceFullPath);

      // Write file to new location
      await this.writeFile(destFullPath, content);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to copy file from ${sourcePath} to ${destinationPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Copy a file between branches
   * @param sourceBranchInfo Source branch information
   * @param sourcePath Source path
   * @param destinationBranchInfo Destination branch information
   * @param destinationPath Destination path
   */
  async copyFileBetweenBranches(
    sourceBranchInfo: BranchInfo,
    sourcePath: string,
    destinationBranchInfo: BranchInfo,
    destinationPath: string
  ): Promise<void> {
    try {
      const sourceFullPath = this.resolveBranchPath(sourceBranchInfo, sourcePath);
      const destFullPath = this.resolveBranchPath(destinationBranchInfo, destinationPath);

      // Ensure source file exists
      const exists = await this.fileExists(sourceFullPath);
      if (!exists) {
        throw new InfrastructureError(
          InfrastructureErrorCodes.FILE_NOT_FOUND,
          `Source file not found in branch ${sourceBranchInfo.name}: ${sourcePath}`
        );
      }

      // Ensure destination directory exists
      const destDir = path.dirname(destFullPath);
      await super.createDirectory(destDir);

      // Read source file content
      const content = await this.readFile(sourceFullPath);

      // Write file to new location
      await this.writeFile(destFullPath, content);

      logger.debug(
        `Copied file from branch ${sourceBranchInfo.name}/${sourcePath} to ${destinationBranchInfo.name}/${destinationPath}`
      );
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to copy file between branches: ${sourceBranchInfo.name}/${sourcePath} to ${destinationBranchInfo.name}/${destinationPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Move a file
   * @param sourcePath Source path
   * @param destinationPath Destination path
   */
  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      // First copy the file
      await this.copyFile(sourcePath, destinationPath);

      // If copy succeeds, delete the original file
      const sourceFullPath = this.resolvePath(sourcePath);
      await super.deleteFile(sourceFullPath);

      logger.debug(`Moved file from ${sourcePath} to ${destinationPath}`);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to move file from ${sourcePath} to ${destinationPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Move a file between branches
   * @param sourceBranchInfo Source branch information
   * @param sourcePath Source path
   * @param destinationBranchInfo Destination branch information
   * @param destinationPath Destination path
   */
  async moveFileBetweenBranches(
    sourceBranchInfo: BranchInfo,
    sourcePath: string,
    destinationBranchInfo: BranchInfo,
    destinationPath: string
  ): Promise<void> {
    try {
      // First copy the file
      await this.copyFileBetweenBranches(
        sourceBranchInfo,
        sourcePath,
        destinationBranchInfo,
        destinationPath
      );

      // If copy succeeds, delete the original file
      const sourceFullPath = this.resolveBranchPath(sourceBranchInfo, sourcePath);
      await super.deleteFile(sourceFullPath);

      logger.debug(
        `Moved file from branch ${sourceBranchInfo.name}/${sourcePath} to ${destinationBranchInfo.name}/${destinationPath}`
      );
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to move file between branches: ${sourceBranchInfo.name}/${sourcePath} to ${destinationBranchInfo.name}/${destinationPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get a list of files within a specified directory
   * @param directoryPath Directory path
   * @param allowedExtensions Array of allowed extensions (optional, defaults to all files)
   * @returns Array of file paths
   */
  async listFilesInDirectory(directoryPath: string, allowedExtensions: string[] = []): Promise<string[]> {
    try {
      const fullPath = this.resolvePath(directoryPath);

      // Check if directory exists
      const exists = await this.directoryExists(fullPath);
      if (!exists) {
        return [];
      }

      // Get list of files
      const allFiles = await super.listFiles(fullPath);

      // Filter by extension
      if (allowedExtensions.length === 0) {
        return allFiles;
      }

      return allFiles.filter(file => {
        const ext = path.extname(file);
        return allowedExtensions.includes(ext);
      });
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list files in directory: ${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Filter an array of DocumentPaths
   * @param paths Array of DocumentPaths
   * @param pattern Filter pattern (glob-like)
   * @returns Filtered array of DocumentPaths
   */
  filterPaths(paths: DocumentPath[], pattern: string): DocumentPath[] {
    try {
      // Simple prefix/suffix matching
      let filtered: DocumentPath[] = paths;

      // Filter by extension
      if (pattern.startsWith('*.')) {
        const extension = pattern.substring(1); // '*.json' -> '.json'
        filtered = paths.filter(p => p.value.endsWith(extension));
      }
      // Filter by directory
      else if (pattern.endsWith('/*')) {
        const dir = pattern.substring(0, pattern.length - 1); // 'dir/*' -> 'dir/'
        filtered = paths.filter(p => p.value.startsWith(dir));
      }
      // Prefix match
      else if (pattern.endsWith('*')) {
        const prefix = pattern.substring(0, pattern.length - 1); // 'prefix*' -> 'prefix'
        filtered = paths.filter(p => p.value.startsWith(prefix));
      }
      // Suffix match
      else if (pattern.startsWith('*')) {
        const suffix = pattern.substring(1); // '*suffix' -> 'suffix'
        filtered = paths.filter(p => p.value.endsWith(suffix));
      }
      // Exact match
      else {
        filtered = paths.filter(p => p.value === pattern);
      }

      return filtered;
    } catch (error) {
      logger.error(`Error filtering paths with pattern ${pattern}:`, error);
      return paths;
    }
  }
}
