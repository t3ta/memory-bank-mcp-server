import path from 'node:path';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IConfigProvider } from '../../config/index.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';

/**
 * Base class: Provides common functionality for file system based memory bank repositories
 */
export abstract class FileSystemMemoryBankRepositoryBase {
  /**
   * Constructor
   * @param fileSystemService File system service
   * @param configProvider Configuration provider
   */
  constructor(
    protected readonly fileSystemService: IFileSystemService,
    protected readonly configProvider: IConfigProvider
  ) {}

  /**
   * Check if directory exists
   * @param dirPath Directory path
   * @returns true if directory exists
   */
  protected async directoryExists(dirPath: string): Promise<boolean> {
    try {
      return await this.fileSystemService.directoryExists(dirPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if directory exists: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Check if file exists
   * @param filePath File path
   * @returns true if file exists
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      return await this.fileSystemService.fileExists(filePath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if file exists: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Create directory
   * @param dirPath Directory path
   */
  protected async createDirectory(dirPath: string): Promise<void> {
    try {
      await this.fileSystemService.createDirectory(dirPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to create directory: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Write file
   * @param filePath File path
   * @param content File content
   */
  protected async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const dirPath = path.dirname(filePath);
      await this.createDirectory(dirPath);

      // Write file
      await this.fileSystemService.writeFile(filePath, content);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to write file: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Read file
   * @param filePath File path
   * @returns File content
   */
  protected async readFile(filePath: string): Promise<string> {
    try {
      return await this.fileSystemService.readFile(filePath);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to read file: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Delete file
   * @param filePath File path
   * @returns true if deletion was successful
   */
  protected async deleteFile(filePath: string): Promise<boolean> {
    try {
      return await this.fileSystemService.deleteFile(filePath);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete file: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * List files
   * @param dirPath Directory path
   * @returns Array of file paths
   */
  protected async listFiles(dirPath: string): Promise<string[]> {
    try {
      return await this.fileSystemService.listFiles(dirPath);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list files: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get file stats
   * @param filePath File path
   * @returns File stats information
   */
  protected async getFileStats(filePath: string): Promise<{ lastModified: Date }> {
    try {
      return await this.fileSystemService.getFileStats(filePath);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to get file stats: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Generate UUID
   * @returns UUID string
   */
  protected generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Check if path is valid (path traversal protection)
   * @param requestedPath Path
   * @param basePath Base path
   * @returns true if path is valid
   */
  protected isValidPath(requestedPath: string, basePath: string): boolean {
    const normalizedPath = path.normalize(requestedPath);
    const resolvedPath = path.resolve(basePath, normalizedPath);

    // Check if path is outside the base directory
    return resolvedPath.startsWith(path.resolve(basePath));
  }

  /**
   * Log an error
   * @param message Error message
   * @param error Error object
   */
  protected logError(message: string, error: unknown): void {
    logger.error(message, error);
  }

  /**
   * Log debug information
   * @param message Debug message
   * @param context Optional context
   */
  protected logDebug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      logger.debug(message, context);
    } else {
      logger.debug(message);
    }
  }
}
