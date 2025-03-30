import { IDocumentLogger } from '../../domain/logger/IDocumentLogger.js';
import { logger, LogContext } from '../../shared/utils/logger.js';

/**
 * Adapter for shared logger to IDocumentLogger interface
 * This allows domain entities to log without directly depending on the shared logger implementation
 */
export class DocumentLoggerAdapter implements IDocumentLogger {
  private componentLogger;

  /**
   * Create a new DocumentLoggerAdapter
   * @param component Optional component name for this logger instance
   */
  constructor(component?: string) {
    this.componentLogger = component ?
      logger.withContext({ component }) :
      logger;
  }

  /**
   * Log debug message
   * @param message Debug message
   * @param context Optional context information
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.componentLogger.debug(message, context as LogContext);
  }

  /**
   * Log info message
   * @param message Info message
   * @param context Optional context information
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.componentLogger.info(message, context as LogContext);
  }

  /**
   * Log warning message
   * @param message Warning message
   * @param context Optional context information
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.componentLogger.warn(message, context as LogContext);
  }

  /**
   * Log error message
   * @param message Error message
   * @param context Optional context information
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.componentLogger.error(message, context as LogContext);
  }
}
