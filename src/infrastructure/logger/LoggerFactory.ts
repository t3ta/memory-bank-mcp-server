import { ILogger } from '../../domain/logger/ILogger.js';
import { LogLevel, LoggerOptions } from '../../domain/logger/types.js';
import { JsonLogger } from './JsonLogger.js';

/**
 * ロガーの種類を定義する列挙型
 */
export enum LoggerType {
  JSON = 'json'
}

/**
 * ロガーの設定に使用するオプション
 */
export interface LoggerFactoryOptions extends LoggerOptions {
  type: LoggerType;
}

/**
 * ロガーインスタンスを生成・管理するファクトリクラス
 */
export class LoggerFactory {
  private static instance: LoggerFactory;
  private loggers: Map<string, ILogger> = new Map();

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
  public createLogger(options: LoggerFactoryOptions): ILogger {
    const { type, ...loggerOptions } = options;
    let logger: ILogger;

    switch (type) {
      case LoggerType.JSON:
        logger = new JsonLogger();
        break;
      default:
        throw new Error(`Unsupported logger type: ${type}`);
    }

    // ロガーの設定を適用
    logger.configure({
      minLevel: loggerOptions.minLevel || LogLevel.INFO,
      defaultContext: loggerOptions.defaultContext || {}
    });

    return logger;
  }

  /**
   * 名前付きロガーを取得または作成
   * @param name ロガー名
   * @param options ロガーの設定オプション
   */
  public getLogger(name: string, options: LoggerFactoryOptions): ILogger {
    if (this.loggers.has(name)) {
      return this.loggers.get(name)!;
    }

    const logger = this.createLogger(options);
    this.loggers.set(name, logger);
    return logger;
  }

  /**
   * デフォルトのJSONロガーを取得
   */
  public static getDefaultLogger(): ILogger {
    return LoggerFactory.getInstance().getLogger('default', {
      type: LoggerType.JSON,
      minLevel: LogLevel.INFO
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
 */
export const defaultLogger = LoggerFactory.getDefaultLogger();
