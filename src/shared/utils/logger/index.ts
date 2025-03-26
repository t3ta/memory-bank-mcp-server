import { Transform } from 'stream';

/**
 * ログレベルの定義
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * ログメッセージの構造
 */
interface LogMessage {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  source?: string;
}

/**
 * JSONログトランスフォーマー
 * 標準出力をJSONフォーマットに変換する
 */
class JsonLogTransformer extends Transform {
  constructor(private source: string) {
    super({ objectMode: true });
  }

  _transform(message: string | LogMessage, encoding: string, callback: Function) {
    try {
      const logEntry = typeof message === 'string'
        ? this.createLogEntry(LogLevel.INFO, message)
        : message;

      this.push(JSON.stringify(logEntry) + '\n');
      callback();
    } catch (error) {
      callback(error);
    }
  }

  private createLogEntry(level: LogLevel, message: string): LogMessage {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      source: this.source,
    };
  }
}

/**
 * ロガークラス
 */
export class Logger {
  private transformer: JsonLogTransformer;
  private static minLevel: LogLevel = LogLevel.INFO;

  constructor(source: string) {
    this.transformer = new JsonLogTransformer(source);
    this.transformer.pipe(process.stdout);

    // 環境変数からログレベルを設定
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && Object.values(LogLevel).includes(envLevel)) {
      Logger.minLevel = envLevel;
    }
  }

  /**
   * ログレベルの重要度を数値化
   */
  private static getLevelPriority(level: LogLevel): number {
    const priorities: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };
    return priorities[level];
  }

  /**
   * 現在のログレベルで出力すべきかを判定
   */
  private shouldLog(level: LogLevel): boolean {
    return Logger.getLevelPriority(level) >= Logger.getLevelPriority(Logger.minLevel);
  }

  /**
   * ログエントリの作成と出力
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const logMessage: LogMessage = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      source: this.transformer['source'],
    };

    this.transformer.write(logMessage);
  }

  /**
   * デバッグレベルのログを出力
   */
  debug(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * 情報レベルのログを出力
   */
  info(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * 警告レベルのログを出力
   */
  warn(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * エラーレベルのログを出力
   */
  error(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, context);
  }
}

/**
 * ロガーファクトリ
 */
export class LoggerFactory {
  private static loggers: Map<string, Logger> = new Map();

  /**
   * ロガーインスタンスの取得または作成
   */
  static getLogger(source: string): Logger {
    if (!this.loggers.has(source)) {
      this.loggers.set(source, new Logger(source));
    }
    return this.loggers.get(source)!;
  }
}
