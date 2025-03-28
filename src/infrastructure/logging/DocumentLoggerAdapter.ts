import { IDocumentLogger } from '../../domain/interfaces/IDocumentLogger.js';
import { logger as systemLogger } from '../../shared/utils/logger.js';

/**
 * Adapter implementation of IDocumentLogger using the system logger
 * This adapter allows domain entities to log without direct dependency on the system logger
 */
export class DocumentLoggerAdapter implements IDocumentLogger {
  /**
   * Log a debug message
   * @param message Log message
   * @param context Optional context object
   */
  public debug(message: string, context?: Record<string, unknown>): void {
    systemLogger.debug(message, context);
  }
  
  /**
   * Log an informational message
   * @param message Log message
   * @param context Optional context object
   */
  public info(message: string, context?: Record<string, unknown>): void {
    systemLogger.info(message, context);
  }
  
  /**
   * Log a warning message
   * @param message Log message
   * @param context Optional context object
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    systemLogger.warn(message, context);
  }
  
  /**
   * Log an error message
   * @param message Log message
   * @param context Optional context object
   */
  public error(message: string, context?: Record<string, unknown>): void {
    systemLogger.error(message, context);
  }
}
