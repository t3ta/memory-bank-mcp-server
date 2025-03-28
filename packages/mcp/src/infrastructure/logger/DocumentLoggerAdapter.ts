import { IDocumentLogger } from '../../domain/logger/IDocumentLogger.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Adapter for shared logger to IDocumentLogger interface
 * This allows domain entities to log without directly depending on the shared logger
 */
export class DocumentLoggerAdapter implements IDocumentLogger {
  /**
   * Log debug message
   * @param message Debug message
   * @param context Optional context information
   */
  debug(message: string, context?: Record<string, unknown>): void {
    logger.debug(message, context);
  }

  /**
   * Log info message
   * @param message Info message
   * @param context Optional context information
   */
  info(message: string, context?: Record<string, unknown>): void {
    logger.info(message, context);
  }

  /**
   * Log warning message
   * @param message Warning message
   * @param context Optional context information
   */
  warn(message: string, context?: Record<string, unknown>): void {
    logger.warn(message, context);
  }

  /**
   * Log error message
   * @param message Error message
   * @param context Optional context information
   */
  error(message: string, context?: Record<string, unknown>): void {
    logger.error(message, context);
  }
}
