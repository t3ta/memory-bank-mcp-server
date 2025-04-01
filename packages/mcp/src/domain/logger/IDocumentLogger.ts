/**
 * Interface for document logger
 * Abstraction to avoid direct dependency from domain entities to specific logger implementation
 */
export interface IDocumentLogger {
  /**
   * Log debug message
   * @param message Debug message
   * @param context Optional context information
   */
  debug(message: string, context?: Record<string, unknown>): void;

  /**
   * Log info message
   * @param message Info message
   * @param context Optional context information
   */
  info(message: string, context?: Record<string, unknown>): void;

  /**
   * Log warning message
   * @param message Warning message
   * @param context Optional context information
   */
  warn(message: string, context?: Record<string, unknown>): void;

  /**
   * Log error message
   * @param message Error message
   * @param context Optional context information
   */
  error(message: string, context?: Record<string, unknown>): void;
}
