import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * ログレベルを定義する列挙型
 */
export enum LogLevel {
  DEBUG,
  INFO,
  WARNING,
  ERROR
}

/**
 * ログエントリの型定義
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
}

/**
 * ログ出力とログの管理を行うクラス
 */
export class Logger {
  private logs: LogEntry[] = [];
  
  /**
   * Loggerのコンストラクタ
   * @param logLevel - 出力するログレベルの閾値
   */
  constructor(private logLevel: LogLevel = LogLevel.INFO) {}
  
  /**
   * デバッグメッセージをログに記録
   * @param message - ログメッセージ
   */
  debug(message: string): void {
    this.log(LogLevel.DEBUG, message);
  }
  
  /**
   * 情報メッセージをログに記録
   * @param message - ログメッセージ
   */
  info(message: string): void {
    this.log(LogLevel.INFO, message);
  }
  
  /**
   * 警告メッセージをログに記録
   * @param message - ログメッセージ
   */
  warning(message: string): void {
    this.log(LogLevel.WARNING, message);
  }
  
  /**
   * エラーメッセージをログに記録
   * @param message - ログメッセージ
   */
  error(message: string): void {
    this.log(LogLevel.ERROR, message);
  }
  
  /**
   * 指定されたレベルでメッセージをログに記録
   * @param level - ログレベル
   * @param message - ログメッセージ
   */
  private log(level: LogLevel, message: string): void {
    if (level >= this.logLevel) {
      const logEntry: LogEntry = {
        level,
        message,
        timestamp: new Date()
      };
      this.logs.push(logEntry);
      
      // コンソールに出力（色付き）
      const formattedTime = logEntry.timestamp.toISOString().split('T')[1].split('.')[0];
      const levelStr = LogLevel[level].padEnd(7);
      let coloredMessage: string;
      
      switch (level) {
        case LogLevel.DEBUG:
          coloredMessage = chalk.gray(`[${formattedTime}] [${levelStr}] ${message}`);
          break;
        case LogLevel.INFO:
          coloredMessage = chalk.white(`[${formattedTime}] [${levelStr}] ${message}`);
          break;
        case LogLevel.WARNING:
          coloredMessage = chalk.yellow(`[${formattedTime}] [${levelStr}] ${message}`);
          break;
        case LogLevel.ERROR:
          coloredMessage = chalk.red(`[${formattedTime}] [${levelStr}] ${message}`);
          break;
        default:
          coloredMessage = `[${formattedTime}] [${levelStr}] ${message}`;
      }
      
      console.log(coloredMessage);
    }
  }
  
  /**
   * ログの統計情報を取得
   * @returns ログレベルごとのカウントなどの統計情報
   */
  getStats(): { total: number; byLevel: Record<string, number> } {
    const byLevel: Record<string, number> = {
      DEBUG: 0,
      INFO: 0,
      WARNING: 0,
      ERROR: 0
    };
    
    for (const log of this.logs) {
      byLevel[LogLevel[log.level]]++;
    }
    
    return {
      total: this.logs.length,
      byLevel
    };
  }
  
  /**
   * すべてのログを取得
   * @returns すべてのログエントリ
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  /**
   * ログをJSONファイルに保存
   * @param filePath - 保存先のファイルパス
   */
  async saveToFile(filePath: string): Promise<void> {
    try {
      // ディレクトリが存在しない場合は作成
      await fs.ensureDir(path.dirname(filePath));
      
      const logData = {
        generatedAt: new Date().toISOString(),
        stats: this.getStats(),
        logs: this.logs.map(log => ({
          ...log,
          level: LogLevel[log.level],
          timestamp: log.timestamp.toISOString()
        }))
      };
      
      await fs.writeJSON(filePath, logData, { spaces: 2 });
      console.log(chalk.green(`ログを保存しました: ${filePath}`));
    } catch (error) {
      console.error(chalk.red(`ログの保存に失敗しました: ${error}`));
      throw error;
    }
  }
  
  /**
   * 現在のログレベルを設定
   * @param level - 設定するログレベル
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  /**
   * 現在のログレベルを取得
   * @returns 現在のログレベル
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}
