import { Logger, LogLevel, LogContext, createConsoleLogger } from '../../shared/utils/logger.js';

/**
 * ロガーの種類を定義する列挙型
 * @deprecated 将来的にshared/utils/logger.tsに完全移行予定
 */
export enum LoggerType {
  JSON = 'json',
  CONSOLE = 'console'
}

/**
 * ロガーの設定に使用するオプション
 * @deprecated 将来的にshared/utils/logger.tsに完全移行予定
 */
export interface LoggerFactoryOptions {
  type: LoggerType;
  minLevel?: LogLevel;
  defaultContext?: LogContext;
}

/**
 * ロガーインスタンスを生成・管理するファクトリクラス
 * @deprecated 将来的にshared/utils/logger.tsに完全移行予定
 */
export class LoggerFactory {
  private static instance: LoggerFactory;
  private loggers: Map<string, Logger> = new Map();

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
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
   */
  public createLogger(options: LoggerFactoryOptions): Logger {
    const { minLevel = 'info', defaultContext } = options; // typeは使用しない
    let logger: Logger;

    // 全てのタイプで共通のcreateConsoleLoggerを使用
    logger = createConsoleLogger(minLevel);

    // コンテキストがあれば設定
    if (defaultContext && logger.withContext) {
      logger = logger.withContext(defaultContext);
    }

    return logger;
  }

  /**
   * 名前付きロガーを取得または作成
   * @param name ロガー名
   * @param options ロガーの設定オプション
   */
  public getLogger(name: string, options: LoggerFactoryOptions): Logger {
    if (this.loggers.has(name)) {
      return this.loggers.get(name)!;
    }

    const logger = this.createLogger(options);
    this.loggers.set(name, logger);
    return logger;
  }

  /**
   * デフォルトのロガーを取得
   */
  public static getDefaultLogger(): Logger {
    return LoggerFactory.getInstance().getLogger('default', {
      type: LoggerType.CONSOLE,
      minLevel: 'info'
    });
  }

  /**
   * 全てのロガーをクリア
   * 主にテスト用
   */
  public clear(): void {
    this.loggers.clear();
  }
}

/**
 * デフォルトのロガーインスタンスを提供
 * @deprecated 将来的にshared/utils/logger.tsの直接使用を推奨
 */
export const defaultLogger = LoggerFactory.getDefaultLogger();
