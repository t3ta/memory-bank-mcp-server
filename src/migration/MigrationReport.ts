/**
 * Migration Report
 * 
 * Records and displays migration progress and results.
 */

import { logger } from "../shared/utils/logger.js";

/**
 * Migration entry status
 */
export enum MigrationStatus {
  SUCCESS = 'success',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

/**
 * Migration entry
 */
export interface MigrationEntry {
  id: string;
  sourcePath: string;
  destinationPath?: string;
  status: MigrationStatus;
  error?: Error | string;
  timestamp: Date;
}

/**
 * Migration summary
 */
export interface MigrationSummary {
  totalAttempted: number;
  successful: number;
  skipped: number;
  failed: number;
  failedIds: string[];
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
}

/**
 * Migration report class
 */
export class MigrationReport {
  private entries: MigrationEntry[] = [];
  private startTime: Date;
  private endTime?: Date;

  /**
   * Constructor
   */
  constructor() {
    this.startTime = new Date();
  }

  /**
   * Adds a successful migration entry
   * 
   * @param id Template ID
   * @param sourcePath Source file path
   * @param destinationPath Destination file path
   * @returns This report for chaining
   */
  addSuccess(id: string, sourcePath: string, destinationPath: string): MigrationReport {
    this.entries.push({
      id,
      sourcePath,
      destinationPath,
      status: MigrationStatus.SUCCESS,
      timestamp: new Date(),
    });
    return this;
  }

  /**
   * Adds a skipped migration entry
   * 
   * @param id Template ID
   * @param sourcePath Source file path
   * @param reason Reason for skipping
   * @returns This report for chaining
   */
  addSkipped(id: string, sourcePath: string, reason?: string): MigrationReport {
    this.entries.push({
      id,
      sourcePath,
      status: MigrationStatus.SKIPPED,
      error: reason,
      timestamp: new Date(),
    });
    return this;
  }

  /**
   * Adds a failed migration entry
   * 
   * @param id Template ID
   * @param sourcePath Source file path
   * @param error Error that occurred
   * @returns This report for chaining
   */
  addFailure(id: string, sourcePath: string, error: Error | string): MigrationReport {
    this.entries.push({
      id,
      sourcePath,
      status: MigrationStatus.FAILED,
      error,
      timestamp: new Date(),
    });
    return this;
  }

  /**
   * Marks the report as complete
   * 
   * @returns This report for chaining
   */
  complete(): MigrationReport {
    this.endTime = new Date();
    return this;
  }

  /**
   * Gets all entries
   * 
   * @returns Array of migration entries
   */
  getEntries(): MigrationEntry[] {
    return [...this.entries];
  }

  /**
   * Gets entries by status
   * 
   * @param status Status to filter by
   * @returns Array of migration entries
   */
  getEntriesByStatus(status: MigrationStatus): MigrationEntry[] {
    return this.entries.filter(entry => entry.status === status);
  }

  /**
   * Gets a summary of the migration
   * 
   * @returns Migration summary
   */
  getSummary(): MigrationSummary {
    const successful = this.getEntriesByStatus(MigrationStatus.SUCCESS).length;
    const skipped = this.getEntriesByStatus(MigrationStatus.SKIPPED).length;
    const failed = this.getEntriesByStatus(MigrationStatus.FAILED).length;
    
    const failedEntries = this.getEntriesByStatus(MigrationStatus.FAILED);
    const failedIds = failedEntries.map(entry => entry.id);
    
    const endTime = this.endTime || new Date();
    const duration = endTime.getTime() - this.startTime.getTime();
    
    return {
      totalAttempted: this.entries.length,
      successful,
      skipped,
      failed,
      failedIds,
      startTime: new Date(this.startTime),
      endTime: new Date(endTime),
      duration,
    };
  }

  /**
   * Prints a summary of the migration to the console
   */
  printSummary(): void {
    const summary = this.getSummary();
    
    logger.info('=============== Migration Summary ===============');
    logger.info('Total templates attempted:', { count: summary.totalAttempted });
    logger.info('Successful migrations:', { count: summary.successful });
    logger.info('Skipped migrations:', { count: summary.skipped });
    logger.info('Failed migrations:', { count: summary.failed });
    
    if (summary.failed > 0) {
      logger.info('Failed templates:');
      const failedEntries = this.getEntriesByStatus(MigrationStatus.FAILED);
      failedEntries.forEach(entry => {
        logger.info(`- ${entry.id}:`, { error: entry.error });
      });
    }
    
    logger.info('Duration:', { seconds: summary.duration / 1000 });
    logger.info('===============================================');
  }

  /**
   * Gets the report as a JSON string
   * 
   * @returns JSON string
   */
  toJSON(): string {
    return JSON.stringify({
      entries: this.entries,
      summary: this.getSummary(),
    }, null, 2);
  }

  /**
   * Creates a new empty report
   * 
   * @returns New migration report
   */
  static create(): MigrationReport {
    return new MigrationReport();
  }
}
