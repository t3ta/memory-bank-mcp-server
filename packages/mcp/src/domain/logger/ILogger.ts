import { LogLevel, LogContext, LoggerOptions } from './types.js';

/**
 * ロギングのための基本インターフェース
 * クリーンアーキテクチャにおけるDomain層に属し、
 * アプリケーション全体でのロギングの抽象化を提供する
 */
export interface ILogger {
  /**
   * 基本的なログ記録メソッド
   * @param level ログレベル
   * @param message ログメッセージ
   * @param context 追加のコンテキスト情報
   */
  log(level: LogLevel, message: string, context?: LogContext): void;

  /**
   * デバッグレベルのログを記録
   * @param message ログメッセージ
   * @param context 追加のコンテキスト情報
   */
  debug(message: string, context?: LogContext): void;

  /**
   * 情報レベルのログを記録
   * @param message ログメッセージ
   * @param context 追加のコンテキスト情報
   */
  info(message: string, context?: LogContext): void;

  /**
   * 警告レベルのログを記録
   * @param message ログメッセージ
   * @param context 追加のコンテキスト情報
   */
  warn(message: string, context?: LogContext): void;

  /**
   * エラーレベルのログを記録
   * @param message ログメッセージ
   * @param context 追加のコンテキスト情報
   */
  error(message: string, context?: LogContext): void;

  /**
   * ログレベルを設定
   * @param level 設定するログレベル
   */
  setLevel(level: LogLevel): void;

  /**
   * 現在のログレベルを取得
   */
  getLevel(): LogLevel;

  /**
   * 新しいコンテキストを持つロガーインスタンスを作成
   * @param context 追加するコンテキスト情報
   */
  withContext(context: LogContext): ILogger;

  /**
   * ロガーの設定を更新
   * @param options 更新する設定オプション
   */
  configure(options: LoggerOptions): void;
}

/**
 * ILoggerインターフェースの基本的な実装を提供する抽象クラス
 */
export abstract class BaseLogger implements ILogger {
  protected minLevel: LogLevel = LogLevel.INFO;
  protected defaultContext: LogContext = {};

  abstract log(level: LogLevel, message: string, context?: LogContext): void;

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getLevel(): LogLevel {
    return this.minLevel;
  }

  withContext(context: LogContext): ILogger {
    const newLogger = Object.create(this);
    newLogger.defaultContext = { ...this.defaultContext, ...context };
    return newLogger;
  }

  configure(options: LoggerOptions): void {
    if (options.minLevel !== undefined) {
      this.minLevel = options.minLevel;
    }
    if (options.defaultContext !== undefined) {
      this.defaultContext = { ...this.defaultContext, ...options.defaultContext };
    }
  }

  protected shouldLog(level: LogLevel): boolean {
    return Object.values(LogLevel).indexOf(level) >=
           Object.values(LogLevel).indexOf(this.minLevel);
  }

  protected mergeContext(context?: LogContext): LogContext {
    return { ...this.defaultContext, ...context };
  }
}
