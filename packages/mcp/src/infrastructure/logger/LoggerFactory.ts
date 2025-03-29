import { Logger, LogLevel, LogContext, createConsoleLogger, logger } from '../../shared/utils/logger.js';

/**
 * ロガーの種類を定義する列挙型
 * @deprecated Use shared/utils/logger.ts instead. This type will be removed in a future release.
 */
export enum LoggerType {
  JSON = 'json',
  CONSOLE = 'console'
}

/**
 * ロガーの設定に使用するオプション
 * @deprecated Use shared/utils/logger.ts instead. This interface will be removed in a future release.
 */
export interface LoggerFactoryOptions {
  type: LoggerType;
  minLevel?: LogLevel;
  defaultContext?: LogContext;
}

/**
 * ロガーインスタンスを生成・管理するファクトリクラス
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
    console.warn('[DEPRECATED] LoggerFactory is deprecated. Use shared/utils/logger.ts instead.');
  }

  /**
   * シングルトンインスタンスを取得
   * @deprecated Use shared/utils/logger.ts instead.
   */
  public static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory();
    }
    return LoggerFactory.instance;
  }

  /**
   * ロガーを生成
   * @param options ロガーの設定オプション
   * @deprecated Use createConsoleLogger from shared/utils/logger.ts instead.
   */
  public createLogger(options: LoggerFactoryOptions): Logger {
    console.warn('[DEPRECATED] LoggerFactory.createLogger is deprecated. Use shared/utils/logger.ts instead.');
    
    const { minLevel = 'info', defaultContext } = options; // typeは使用しない
    let newLogger: Logger;

    // 全てのタイプで共通のcreateConsoleLoggerを使用
    newLogger = createConsoleLogger(minLevel);

    // コンテキストがあれば設定
    if (defaultContext) {
      newLogger = newLogger.withContext(defaultContext);
    }

    return newLogger;
  }

  /**
   * 名前付きロガーを取得または作成
   * @param name ロガー名
   * @param options ロガーの設定オプション
   * @deprecated Use logger.withContext({ component: name }) from shared/utils/logger.ts instead.
   */
  public getLogger(name: string, options: LoggerFactoryOptions): Logger {
    console.warn('[DEPRECATED] LoggerFactory.getLogger is deprecated. Use logger.withContext({ component: name }) instead.');
    
    if (this.loggers.has(name)) {
      return this.loggers.get(name)!;
    }

    const newLogger = this.createLogger(options);
    // Add component name to logger context
    const loggerWithName = newLogger.withContext({ component: name });
    this.loggers.set(name, loggerWithName);
    return loggerWithName;
  }

  /**
   * デフォルトのロガーを取得
   * @deprecated Use the 'logger' export from shared/utils/logger.ts instead.
   */
  public static getDefaultLogger(): Logger {
    console.warn('[DEPRECATED] LoggerFactory.getDefaultLogger is deprecated. Use the \'logger\' export from shared/utils/logger.ts instead.');
    return LoggerFactory.getInstance().getLogger('default', {
      type: LoggerType.CONSOLE,
      minLevel: 'info'
    });
  }

  /**
   * 全てのロガーをクリア
   * 主にテスト用
   * @deprecated Use direct imports from shared/utils/logger.ts instead.
   */
  public clear(): void {
    console.warn('[DEPRECATED] LoggerFactory.clear is deprecated.');
    this.loggers.clear();
  }
}

/**
 * デフォルトのロガーインスタンスを提供
 * @deprecated Use the 'logger' export from shared/utils/logger.ts instead.
 * 
 * Example replacement:
 * ```
 * // Old code:
 * import { defaultLogger } from '../infrastructure/logger/LoggerFactory.js';
 * defaultLogger.info('Some message');
 * 
 * // New code:
 * import { logger } from '../shared/utils/logger.js';
 * logger.info('Some message');
 * ```
 */
export const defaultLogger = logger.withContext({ component: 'LegacyDefault' });
