/**
 * Interface for file system operations
 */
export interface IFileSystemService {
  /**
   * Read file content
   * @param filePath File path
   * @returns Promise resolving to file content as string
   */
  readFile(filePath: string): Promise<string>;
  
  /**
   * Read a chunk of a file
   * @param filePath File path
   * @param start Starting position in bytes
   * @param length Number of bytes to read
   * @returns Promise resolving to the chunk content as string
   */
  readFileChunk?(filePath: string, start: number, length: number): Promise<string>;

  /**
   * Write content to file
   * @param filePath File path
   * @param content Content to write
   * @returns Promise resolving when write is complete
   */
  writeFile(filePath: string, content: string): Promise<void>;

  /**
   * Check if file exists
   * @param filePath File path
   * @returns Promise resolving to boolean indicating if file exists
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * Delete file
   * @param filePath File path
   * @returns Promise resolving to boolean indicating success
   */
  deleteFile(filePath: string): Promise<boolean>;

  /**
   * Create directory (recursively)
   * @param dirPath Directory path
   * @returns Promise resolving when directory is created
   */
  createDirectory(dirPath: string): Promise<void>;

  /**
   * Check if directory exists
   * @param dirPath Directory path
   * @returns Promise resolving to boolean indicating if directory exists
   */
  directoryExists(dirPath: string): Promise<boolean>;

  /**
   * List files in directory
   * @param dirPath Directory path
   * @returns Promise resolving to array of file paths
   */
  listFiles(dirPath: string): Promise<string[]>;

  /**
   * Get file stats
   * @param filePath File path
   * @returns Promise resolving to file stats
   */
  getFileStats(filePath: string): Promise<{
    size: number;
    isDirectory: boolean;
    isFile: boolean;
    lastModified: Date;
    createdAt: Date;
  }>;
  
  /**
   * Get the path to the branch memory bank directory
   * @param branchName Branch name
   * @returns Path to branch memory bank directory
   */
  getBranchMemoryPath?(branchName: string): string;
  
  /**
   * Get configuration
   * @returns Configuration object
   */
  getConfig?(): { memoryBankRoot: string; [key: string]: any; };
}
