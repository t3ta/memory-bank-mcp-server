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
 * Log context interface
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, ...args: unknown[]): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, ...args: unknown[]): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, ...args: unknown[]): void;
  error(message: string, context?: LogContext): void;
  log(level: LogLevel, message: string, ...args: unknown[]): void;
  log(level: LogLevel, message: string, context?: LogContext): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  withContext?(context: LogContext): Logger;
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
  
  let defaultContext: LogContext = {};

  const logger: Logger = {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog('debug')) {
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          // Handle context object
          const context = args[0] as LogContext;
          console.debug(`[DEBUG] ${message}`, { ...defaultContext, ...context });
        } else {
          console.debug(`[DEBUG] ${message}`, ...args);
        }
      }
    },

    info(message: string, ...args: unknown[]): void {
      if (shouldLog('info')) {
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          // Handle context object
          const context = args[0] as LogContext;
          console.info(`[INFO] ${message}`, { ...defaultContext, ...context });
        } else {
          console.info(`[INFO] ${message}`, ...args);
        }
      }
    },

    warn(message: string, ...args: unknown[]): void {
      if (shouldLog('warn')) {
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          // Handle context object
          const context = args[0] as LogContext;
          console.warn(`[WARN] ${message}`, { ...defaultContext, ...context });
        } else {
          console.warn(`[WARN] ${message}`, ...args);
        }
      }
    },

    error(message: string, ...args: unknown[]): void {
      if (shouldLog('error')) {
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          // Handle context object
          const context = args[0] as LogContext;
          console.error(`[ERROR] ${message}`, { ...defaultContext, ...context });
        } else {
          console.error(`[ERROR] ${message}`, ...args);
        }
      }
    },

    log(level: LogLevel, message: string, ...args: unknown[]): void {
      switch (level) {
        case 'debug':
          this.debug(message, ...args);
          break;
        case 'info':
          this.info(message, ...args);
          break;
        case 'warn':
          this.warn(message, ...args);
          break;
        case 'error':
          this.error(message, ...args);
          break;
      }
    },

    setLevel(level: LogLevel): void {
      currentLevel = level;
    },

    getLevel(): LogLevel {
      return currentLevel;
    },

    withContext(context: LogContext): Logger {
      const newLogger = createConsoleLogger(currentLevel);
      // @ts-ignore - We know that _defaultContext exists on our implementation
      newLogger._defaultContext = { ...defaultContext, ...context };
      return newLogger;
    }
  };
  
  // Add private property for internal use
  Object.defineProperty(logger, '_defaultContext', {
    value: defaultContext,
    writable: true,
    enumerable: false
  });
  
  return logger;
}

export const logger = createConsoleLogger('warn');
