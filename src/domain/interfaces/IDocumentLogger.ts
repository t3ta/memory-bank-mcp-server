/**
 * Interface for document-related logging
 * This allows domain entities to log without direct dependency on logger implementation
 */
export interface IDocumentLogger {
  /**
   * Log a debug message
   * @param message Log message
   * @param context Optional context object
   */
  debug(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log an informational message
   * @param message Log message
   * @param context Optional context object
   */
  info(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log a warning message
   * @param message Log message
   * @param context Optional context object
   */
  warn(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log an error message
   * @param message Log message
   * @param context Optional context object
   */
  error(message: string, context?: Record<string, unknown>): void;
}
