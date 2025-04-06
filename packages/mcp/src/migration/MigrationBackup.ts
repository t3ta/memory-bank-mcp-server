/**
 * Migration backup service
 *
 * Creates backups of directories before migration and provides rollback functionality
 */
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Logger } from '../shared/utils/logger.js';

/**
 * Service for creating backups before migration and rolling back if needed
 */
export class MigrationBackup {
  /**
   * @param logger Logger instance
   */
  constructor(private readonly logger: Logger) { }

  /**
   * Create a backup of a directory
   * @param directory Directory to backup
   * @returns Path to backup directory
   */
  async createBackup(directory: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(
        path.dirname(directory),
        `.backup_${path.basename(directory)}_${timestamp}`
      );

      await fs.mkdir(backupDir, { recursive: true });
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

      await this.deleteDirectoryContents(targetDir);
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
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Delete contents of a directory without deleting the directory itself
   * @param directory Directory to clear
   */
  private async deleteDirectoryContents(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await this.deleteDirectory(entryPath);
      } else {
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
