/**
 * Migration backup service
 *
 * Creates backups of directories before migration and provides rollback functionality
 */
import path from 'path';
import { promises as fs } from 'fs';
import { Logger } from '../shared/utils/logger.js';

/**
 * Service for creating backups before migration and rolling back if needed
 */
export class MigrationBackup {
  /**
   * @param logger Logger instance
   */
  constructor(private readonly logger: Logger) {}

  /**
   * Create a backup of a directory
   * @param directory Directory to backup
   * @returns Path to backup directory
   */
  async createBackup(directory: string): Promise<string> {
    try {
      // Create timestamp for backup directory name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(
        path.dirname(directory),
        `.backup_${path.basename(directory)}_${timestamp}`
      );

      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true });

      // Copy all files from source to backup
      await this.copyDirectory(directory, backupDir);

      this.logger.info(`Created backup at: ${backupDir}`);
      return backupDir;
    } catch (error) {
      this.logger.error(`Failed to create backup: ${(error as Error).message}`);
      throw new Error(`Failed to create backup: ${(error as Error).message}`);
    }
  }

  /**
   * Restore from a backup
   * @param backupPath Path to backup directory
   * @param targetDir Directory to restore to
   * @returns true if restore was successful
   */
  async restoreFromBackup(backupPath: string, targetDir: string): Promise<boolean> {
    try {
      this.logger.info(`Restoring from backup: ${backupPath} to ${targetDir}`);

      // Delete current contents
      await this.deleteDirectoryContents(targetDir);

      // Copy from backup to target
      await this.copyDirectory(backupPath, targetDir);

      this.logger.info(`Successfully restored from backup`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to restore from backup: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Copy a directory recursively
   * @param source Source directory
   * @param destination Destination directory
   */
  private async copyDirectory(source: string, destination: string): Promise<void> {
    // Read source directory
    const entries = await fs.readdir(source, { withFileTypes: true });

    // Process each entry
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        // Create destination directory
        await fs.mkdir(destPath, { recursive: true });

        // Recursively copy subdirectory
        await this.copyDirectory(srcPath, destPath);
      } else {
        // Copy file
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Delete contents of a directory without deleting the directory itself
   * @param directory Directory to clear
   */
  private async deleteDirectoryContents(directory: string): Promise<void> {
    // Read directory
    const entries = await fs.readdir(directory, { withFileTypes: true });

    // Process each entry
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        // Recursively delete subdirectory
        await this.deleteDirectory(entryPath);
      } else {
        // Delete file
        await fs.unlink(entryPath);
      }
    }
  }

  /**
   * Delete a directory and all its contents
   * @param directory Directory to delete
   */
  private async deleteDirectory(directory: string): Promise<void> {
    await this.deleteDirectoryContents(directory);
    await fs.rmdir(directory);
  }
}
