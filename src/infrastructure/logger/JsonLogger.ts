import { BaseLogger } from '../../domain/logger/ILogger.js';
import { LogLevel, LogContext, LogEntry } from '../../domain/logger/types.js';

/**
 * JSONフォーマットでログを出力するロガー実装
 */
export class JsonLogger extends BaseLogger {
  private static readonly LOG_SEPARATOR = '\n';

  /**
   * ログエントリーを生成
   */
  private createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.mergeContext(context)
    };
  }

  /**
   * ログエントリーをJSON文字列に変換
   */
  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry) + JsonLogger.LOG_SEPARATOR;
  }

  /**
   * ログを出力
   * @param level ログレベル
   * @param message メッセージ
   * @param context コンテキスト情報
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, context);
    const output = this.formatLogEntry(entry);

    // エラーレベルのログはstderrに出力
    if (level === LogLevel.ERROR) {
      process.stderr.write(output);
    } else {
      process.stdout.write(output);
    }
  }
}

/**
 * JsonLoggerのインスタンスを作成するファクトリ関数
 */
export function createJsonLogger(): JsonLogger {
  return new JsonLogger();
}
