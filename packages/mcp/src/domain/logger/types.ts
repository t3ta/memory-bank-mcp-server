/**
 * ログレベルを定義する列挙型
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * ログコンテキストの型定義
 * 構造化されたログデータを表現する
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * ログエントリーの型定義
 * JSONLoggerで使用される構造化ログデータ
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

/**
 * ロガーの設定オプション
 */
export interface LoggerOptions {
  minLevel?: LogLevel;
  defaultContext?: LogContext;
}
