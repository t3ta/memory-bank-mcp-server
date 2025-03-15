import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import path from 'path';
import { IFileSystemService } from './interfaces/IFileSystemService.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../shared/errors/InfrastructureError.js';

/**
 * Implementation of file system service
 */
export class FileSystemService implements IFileSystemService {
  /**
   * Read file content
   * @param filePath File path
   * @returns Promise resolving to file content as string
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (error instanceof Error) {
        const nodeError = error as NodeJS.ErrnoException;
        
        if (nodeError.code === 'ENOENT') {
          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_NOT_FOUND,
            `File not found: ${filePath}`
          );
        }
        
        if (nodeError.code === 'EACCES') {
          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
            `Permission denied: ${filePath}`
          );
        }
      }
      
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to read file: ${filePath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Write content to file
   * @param filePath File path
   * @param content Content to write
   * @returns Promise resolving when write is complete
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      await this.createDirectory(path.dirname(filePath));
      
      // Write file
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }
      
      if (error instanceof Error) {
        const nodeError = error as NodeJS.ErrnoException;
        
        if (nodeError.code === 'EACCES') {
          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
            `Permission denied: ${filePath}`
          );
        }
      }
      
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to write file: ${filePath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Check if file exists
   * @param filePath File path
   * @returns Promise resolving to boolean indicating if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete file
   * @param filePath File path
   * @returns Promise resolving to boolean indicating success
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        const nodeError = error as NodeJS.ErrnoException;
        
        if (nodeError.code === 'ENOENT') {
          return false;
        }
        
        if (nodeError.code === 'EACCES') {
          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
            `Permission denied: ${filePath}`
          );
        }
      }
      
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete file: ${filePath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Create directory (recursively)
   * @param dirPath Directory path
   * @returns Promise resolving when directory is created
   */
  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error instanceof Error) {
        const nodeError = error as NodeJS.ErrnoException;
        
        if (nodeError.code === 'EACCES') {
          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
            `Permission denied: ${dirPath}`
          );
        }
      }
      
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to create directory: ${dirPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Check if directory exists
   * @param dirPath Directory path
   * @returns Promise resolving to boolean indicating if directory exists
   */
  async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * List files in directory
   * @param dirPath Directory path
   * @returns Promise resolving to array of file paths
   */
  async listFiles(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      const files: string[] = [];
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          const subFiles = await this.listFiles(fullPath);
          files.push(...subFiles);
        }
      }
      
      return files;
    } catch (error) {
      if (error instanceof Error) {
        const nodeError = error as NodeJS.ErrnoException;
        
        if (nodeError.code === 'ENOENT') {
          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_NOT_FOUND,
            `Directory not found: ${dirPath}`
          );
        }
        
        if (nodeError.code === 'EACCES') {
          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
            `Permission denied: ${dirPath}`
          );
        }
      }
      
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list files: ${dirPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * Read a chunk of a file
   * @param filePath File path
   * @param start Starting position in bytes
   * @param length Number of bytes to read
   * @returns Promise resolving to the chunk content as string
   */
  /**
   * Get the path to the branch memory bank directory
   * @param branchName Branch name
   * @returns Path to branch memory bank directory
   */
  getBranchMemoryPath(branchName: string): string {
    const memoryBankRoot = 'docs/branch-memory-bank';
    const branchDir = branchName.replace('/', '-');
    return path.join(memoryBankRoot, branchDir);
  }
  
  /**
   * Get configuration
   * @returns Configuration object
   */
  getConfig(): { memoryBankRoot: string; [key: string]: any } {
    return { memoryBankRoot: 'docs' };
  }
  
  async readFileChunk(filePath: string, start: number, length: number): Promise<string> {
    try {
      // Check if file exists first
      if (!(await this.fileExists(filePath))) {
        throw new InfrastructureError(
          InfrastructureErrorCodes.FILE_NOT_FOUND,
          `File not found: ${filePath}`
        );
      }
      
      // Get file stats to check the size
      const stats = await fs.stat(filePath);
      
      // Adjust length if it exceeds file size
      if (start + length > stats.size) {
        length = Math.max(0, stats.size - start);
      }
      
      // If length is 0, return empty string
      if (length === 0) {
        return '';
      }
      
      // Create a promise to handle the stream
      return new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        // Create a readable stream with start and end positions
        const stream = createReadStream(filePath, {
          start,
          end: start + length - 1,
          encoding: 'utf8'
        });
        
        // Handle stream events
        stream.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });
        
        stream.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
        
        stream.on('error', (error) => {
          reject(new InfrastructureError(
            InfrastructureErrorCodes.FILE_READ_ERROR,
            `Failed to read file chunk: ${filePath}`,
            { originalError: error }
          ));
        });
      });
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }
      
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to read file chunk: ${filePath}`,
        { originalError: error }
      );
    }
  }
  
  async getFileStats(filePath: string): Promise<{
    size: number;
    isDirectory: boolean;
    isFile: boolean;
    lastModified: Date;
    createdAt: Date;
  }> {
    try {
      const stats = await fs.stat(filePath);
      
      return {
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        lastModified: stats.mtime,
        createdAt: stats.birthtime
      };
    } catch (error) {
      if (error instanceof Error) {
        const nodeError = error as NodeJS.ErrnoException;
        
        if (nodeError.code === 'ENOENT') {
          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_NOT_FOUND,
            `File not found: ${filePath}`
          );
        }
        
        if (nodeError.code === 'EACCES') {
          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_PERMISSION_ERROR,
            `Permission denied: ${filePath}`
          );
        }
      }
      
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to get file stats: ${filePath}`,
        { originalError: error }
      );
    }
  }
}
