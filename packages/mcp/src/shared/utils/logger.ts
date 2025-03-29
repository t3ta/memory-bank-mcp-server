/**
 * Unified Logger utility
 *
 * Provides a consistent logging interface with structured context support
 * This is the recommended logging implementation for all application components
 */

/**
 * Log levels with clear hierarchy
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log level priorities for filtering
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Structured log context interface
 * Provides metadata for log entries
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Extended log context with common fields
 */
export interface ExtendedLogContext extends LogContext {
  /**
   * Component or module name
   */
  component?: string;
  
  /**
   * Request ID for tracking
   */
  requestId?: string;
  
  /**
   * User ID for tracking
   */
  userId?: string;
  
  /**
   * Branch name for branch-specific logs
   */
  branch?: string;
  
  /**
   * Document path for document-related logs
   */
  documentPath?: string;
  
  /**
   * Error details for error logs
   */
  error?: unknown;
  
  /**
   * Timestamp (auto-populated when not provided)
   */
  timestamp?: string | Date;
  
  /**
   * Additional custom context fields
   */
  [key: string]: unknown;
}

/**
 * Unified logger interface
 * Provides structured logging with context support
 */
export interface Logger {
  /**
   * Log at debug level
   */
  debug(message: string, ...args: unknown[]): void;
  debug(message: string, context?: LogContext): void;
  
  /**
   * Log at info level
   */
  info(message: string, ...args: unknown[]): void;
  info(message: string, context?: LogContext): void;
  
  /**
   * Log at warn level
   */
  warn(message: string, ...args: unknown[]): void;
  warn(message: string, context?: LogContext): void;
  
  /**
   * Log at error level
   */
  error(message: string, ...args: unknown[]): void;
  error(message: string, context?: LogContext): void;
  
  /**
   * Generic log method with explicit level
   */
  log(level: LogLevel, message: string, ...args: unknown[]): void;
  log(level: LogLevel, message: string, context?: LogContext): void;
  
  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void;
  
  /**
   * Get current log level
   */
  getLevel(): LogLevel;
  
  /**
   * Create a new logger with additional context
   * All logs from the derived logger will include this context
   */
  withContext(context: LogContext): Logger;
}

/**
 * Create a console logger
 * @param level Minimum log level to display
 * @returns Logger instance
 */
export function createConsoleLogger(level: LogLevel = 'info'): Logger {
  let currentLevel = level;
  let defaultContext: LogContext = {};

  /**
   * Check if a log level should be displayed
   * @param msgLevel Level of the message
   * @returns Whether the message should be logged
   */
  function shouldLog(msgLevel: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[msgLevel] >= LOG_LEVEL_PRIORITY[currentLevel];
  }
  
  /**
   * Format the log entry with level prefix and timestamp
   */
  function formatLogEntry(level: LogLevel, message: string): string {
    return `[${level.toUpperCase()}] ${message}`;
  }
  
  /**
   * Prepare context with defaults and auto-populated fields
   */
  function prepareContext(context?: LogContext): LogContext {
    const timestamp = new Date().toISOString();
    return { 
      ...defaultContext, 
      ...context, 
      timestamp: (context as ExtendedLogContext)?.timestamp || timestamp 
    };
  }

  const logger: Logger = {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog('debug')) {
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          // Handle context object
          const context = prepareContext(args[0] as LogContext);
          console.debug(formatLogEntry('debug', message), context);
        } else {
          console.debug(formatLogEntry('debug', message), ...args);
        }
      }
    },

    info(message: string, ...args: unknown[]): void {
      if (shouldLog('info')) {
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          // Handle context object
          const context = prepareContext(args[0] as LogContext);
          console.info(formatLogEntry('info', message), context);
        } else {
          console.info(formatLogEntry('info', message), ...args);
        }
      }
    },

    warn(message: string, ...args: unknown[]): void {
      if (shouldLog('warn')) {
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          // Handle context object
          const context = prepareContext(args[0] as LogContext);
          console.warn(formatLogEntry('warn', message), context);
        } else {
          console.warn(formatLogEntry('warn', message), ...args);
        }
      }
    },

    error(message: string, ...args: unknown[]): void {
      if (shouldLog('error')) {
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          // Handle context object
          const context = prepareContext(args[0] as LogContext);
          console.error(formatLogEntry('error', message), context);
        } else {
          console.error(formatLogEntry('error', message), ...args);
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
      const childLogger = createConsoleLogger(currentLevel);
      
      // Set the child logger's default context as a combination of parent's context and new context
      const combinedContext = { ...defaultContext, ...context };
      
      // Use defineProperty to set private property
      Object.defineProperty(childLogger, '_defaultContext', {
        value: combinedContext,
        writable: true,
        enumerable: false
      });
      
      return childLogger;
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

/**
 * Default logger instance configured with warn level
 * Use this for direct imports across the application
 * For component-specific logging, create a contextualized logger with withContext
 * 
 * Example:
 * ```
 * // In a component file:
 * const componentLogger = logger.withContext({ component: 'UserRepository' });
 * 
 * // Later in code:
 * componentLogger.info('User data retrieved', { userId: 123 });
 * ```
 */
export const logger = createConsoleLogger('warn');
