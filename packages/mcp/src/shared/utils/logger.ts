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
 *
 * Creates a new logger instance that outputs structured JSON logs to the console.
 * The logger supports context-based logging and hierarchical log levels.
 *
 * @param level Minimum log level to display (default: 'info')
 * @param initialDefaultContext Optional default context to include in all logs
 * @returns Logger instance
 */
export function createConsoleLogger(level: LogLevel = 'info', initialDefaultContext?: LogContext): Logger {
  let currentLevel = level;
  let defaultContext: LogContext = initialDefaultContext || {}; // Use initial context if provided

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
  // Removed: formatLogEntry as we now output JSON

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
        let context: LogContext = {};
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          context = args[0] as LogContext;
        } else if (args.length > 0) {
          // Treat multiple arguments as an array in the context
          context = { args };
        }
        const logEntry = { level: 'debug', message, ...prepareContext(context) };
        // Output JSON string to stderr to avoid interfering with MCP communication
        console.error(JSON.stringify(logEntry));
      }
    },

    info(message: string, ...args: unknown[]): void {
      if (shouldLog('info')) {
        let context: LogContext = {};
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          context = args[0] as LogContext;
        } else if (args.length > 0) {
          context = { args };
        }
        const logEntry = { level: 'info', message, ...prepareContext(context) };
        // Output JSON string to stderr to avoid interfering with MCP communication
        console.error(JSON.stringify(logEntry));
      }
    },

    warn(message: string, ...args: unknown[]): void {
      if (shouldLog('warn')) {
        let context: LogContext = {};
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          context = args[0] as LogContext;
        } else if (args.length > 0) {
          context = { args };
        }
        const logEntry = { level: 'warn', message, ...prepareContext(context) };
        // Output JSON string to stderr to avoid interfering with MCP communication
        console.error(JSON.stringify(logEntry));
      }
    },

    error(message: string, ...args: unknown[]): void {
      if (shouldLog('error')) {
        let context: LogContext = {};
        // Ensure error details are captured correctly in context
        const errorArg = args.find(arg => arg instanceof Error);
        if (errorArg) {
           context.error = {
             message: (errorArg as Error).message,
             stack: (errorArg as Error).stack,
             name: (errorArg as Error).name,
           };
           // Filter out the error object from args if it exists
           args = args.filter(arg => arg !== errorArg);
        }

        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
           // Merge remaining args[0] if it's an object context
           context = { ...context, ...(args[0] as LogContext) };
        } else if (args.length > 0) {
           // Add remaining args if any
           context.args = args;
        }

        const logEntry = { level: 'error', message, ...prepareContext(context) };
        // Output JSON string to stderr to avoid interfering with MCP communication
        console.error(JSON.stringify(logEntry));
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
      // Create child logger passing the combined context
      const combinedContext = { ...defaultContext, ...context };
      const childLogger = createConsoleLogger(currentLevel, combinedContext);
      return childLogger;
    }
  };

  // Remove the Object.defineProperty for _defaultContext as it's handled internally now

  return logger;
}

/**
 * Default logger instance configured with warn level
 * Use this for direct imports across the application
 * For component-specific logging, create a contextualized logger with withContext
 *
 * Example:
 * ```
 * const componentLogger = logger.withContext({ component: 'UserRepository' });
 * componentLogger.info('User data retrieved', { userId: 123 });
 * ```
 */
export const logger = createConsoleLogger('error');
