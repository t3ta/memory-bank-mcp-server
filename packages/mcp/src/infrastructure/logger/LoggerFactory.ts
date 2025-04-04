import { Logger, LogLevel, LogContext, createConsoleLogger, logger } from '../../shared/utils/logger.js';

/**
 * Defines the type of logger
 * @deprecated Use shared/utils/logger.ts instead. This type will be removed in a future release.
 */
export enum LoggerType {
  JSON = 'json',
  CONSOLE = 'console'
}

/**
 * Options used for logger configuration
 * @deprecated Use shared/utils/logger.ts instead. This interface will be removed in a future release.
 */
export interface LoggerFactoryOptions {
  type: LoggerType;
  minLevel?: LogLevel;
  defaultContext?: LogContext;
}

/**
 * Factory class for creating and managing logger instances
 * @deprecated Use shared/utils/logger.ts instead. This class will be removed in a future release.
 *
 * Migration guide:
 * - Instead of LoggerFactory.getDefaultLogger(), use the 'logger' export from shared/utils/logger.ts
 * - Instead of getLogger with a name, use logger.withContext({ component: 'YourComponentName' })
 * - For custom log levels, use createConsoleLogger(level) from shared/utils/logger.ts
 */
export class LoggerFactory {
  private static instance: LoggerFactory;
  private loggers: Map<string, Logger> = new Map();

  private constructor() {
    logger.warn('[DEPRECATED] LoggerFactory is deprecated. Use shared/utils/logger.ts instead.', { component: 'LoggerFactory' });
  }

  /**
   * Get the singleton instance
   * @deprecated Use shared/utils/logger.ts instead.
   */
  public static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory();
    }
    return LoggerFactory.instance;
  }

  /**
   * Create a logger
   * @param options Logger configuration options
   * @deprecated Use createConsoleLogger from shared/utils/logger.ts instead.
   */
  public createLogger(options: LoggerFactoryOptions): Logger {
    logger.warn('[DEPRECATED] LoggerFactory.createLogger is deprecated. Use shared/utils/logger.ts instead.', { component: 'LoggerFactory' });

    const { minLevel = 'info', defaultContext } = options;
    let newLogger: Logger;

    // Use the common createConsoleLogger for all types
    newLogger = createConsoleLogger(minLevel);

    if (defaultContext) {
      newLogger = newLogger.withContext(defaultContext);
    }

    return newLogger;
  }

  /**
   * Get or create a named logger
   * @param name Logger name
   * @param options Logger configuration options
   * @deprecated Use logger.withContext({ component: name }) from shared/utils/logger.ts instead.
   */
  public getLogger(name: string, options: LoggerFactoryOptions): Logger {
    logger.warn('[DEPRECATED] LoggerFactory.getLogger is deprecated. Use logger.withContext({ component: name }) instead.', { component: 'LoggerFactory', loggerName: name });

    if (this.loggers.has(name)) {
      return this.loggers.get(name)!;
    }

    const newLogger = this.createLogger(options);
    const loggerWithName = newLogger.withContext({ component: name });
    this.loggers.set(name, loggerWithName);
    return loggerWithName;
  }

  /**
   * Get the default logger
   * @deprecated Use the 'logger' export from shared/utils/logger.ts instead.
   */
  public static getDefaultLogger(): Logger {
    logger.warn('[DEPRECATED] LoggerFactory.getDefaultLogger is deprecated. Use the \'logger\' export from shared/utils/logger.ts instead.', { component: 'LoggerFactory' });
    return LoggerFactory.getInstance().getLogger('default', {
      type: LoggerType.CONSOLE,
      minLevel: 'info'
    });
  }

  /**
   * Clear all loggers
   * Mainly for testing purposes
   * @deprecated Use direct imports from shared/utils/logger.ts instead.
   */
  public clear(): void {
    logger.warn('[DEPRECATED] LoggerFactory.clear is deprecated.', { component: 'LoggerFactory' });
    this.loggers.clear();
  }
}

/**
 * Provides the default logger instance
 * @deprecated Use the 'logger' export from shared/utils/logger.ts instead.
 *
 * Example replacement:
 * ```
 * // Old code:
 * // import { defaultLogger } from '../infrastructure/logger/LoggerFactory.js';
 * // defaultLogger.info('Some message');
 *
 * // New code:
 * import { logger } from '../shared/utils/logger.js';
 * logger.info('Some message');
 * ```
 */
export const defaultLogger = logger.withContext({ component: 'LegacyDefault' });
