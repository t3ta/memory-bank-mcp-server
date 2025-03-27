/**
 * Logger utility
 *
 * Provides a simple logging interface with different log levels
 */

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  setLevel(level: LogLevel): void;
}

/**
 * Create a console logger
 * @param level Minimum log level to display
 * @returns Logger instance
 */
export function createConsoleLogger(level: LogLevel = 'info'): Logger {
  let currentLevel = level;

  // Log level priorities
  const levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  /**
   * Check if a log level should be displayed
   * @param msgLevel Level of the message
   * @returns Whether the message should be logged
   */
  function shouldLog(msgLevel: LogLevel): boolean {
    return levelPriority[msgLevel] >= levelPriority[currentLevel];
  }

  return {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog('debug')) {
        console.debug(`[DEBUG] ${message}`, ...args);
      }
    },

    info(message: string, ...args: unknown[]): void {
      if (shouldLog('info')) {
        console.info(`[INFO] ${message}`, ...args);
      }
    },

    warn(message: string, ...args: unknown[]): void {
      if (shouldLog('warn')) {
        console.warn(`[WARN] ${message}`, ...args);
      }
    },

    error(message: string, ...args: unknown[]): void {
      if (shouldLog('error')) {
        console.error(`[ERROR] ${message}`, ...args);
      }
    },

    setLevel(level: LogLevel): void {
      currentLevel = level;
    },
  };
}

// Export a default logger with 'warn' level for development
export const logger = createConsoleLogger('warn');
