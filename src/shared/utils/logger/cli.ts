import chalk from 'chalk';
import { LogLevel, Logger } from './index.js';

/**
 * CLI出力用のフォーマッタ
 */
export class CLIOutput {
  private logger: Logger;

  constructor(source: string = 'CLI') {
    this.logger = new Logger(source);
  }

  /**
   * 情報メッセージを出力
   */
  info(message: string, context?: Record<string, unknown>) {
    console.log(chalk.blue(message));
    this.logger.info(message, context);
  }

  /**
   * 成功メッセージを出力
   */
  success(message: string, context?: Record<string, unknown>) {
    console.log(chalk.green('✓ ' + message));
    this.logger.info(message, context);
  }

  /**
   * 警告メッセージを出力
   */
  warn(message: string, context?: Record<string, unknown>) {
    console.log(chalk.yellow('⚠ ' + message));
    this.logger.warn(message, context);
  }

  /**
   * エラーメッセージを出力
   */
  error(message: string, context?: Record<string, unknown>) {
    console.log(chalk.red('✗ ' + message));
    this.logger.error(message, context);
  }

  /**
   * リスト形式で出力
   */
  list(items: any[], title?: string) {
    if (title) {
      console.log(chalk.blue('\n' + title + ':'));
    }

    items.forEach((item, index) => {
      if (typeof item === 'string') {
        console.log(chalk.grey(`${index + 1}. `) + item);
      } else {
        console.log(chalk.grey(`${index + 1}. `) + JSON.stringify(item));
      }
    });

    this.logger.info('Displayed list', { title, itemCount: items.length });
  }

  /**
   * テーブル形式で出力
   */
  table(data: Record<string, any>[], columns?: string[]) {
    const keys = columns || Object.keys(data[0] || {});

    // ヘッダーの出力
    console.log(chalk.blue('\n' + keys.join('\t')));
    console.log(chalk.grey('-'.repeat(keys.length * 15)));

    // データの出力
    data.forEach(row => {
      const values = keys.map(key => row[key]?.toString() || '');
      console.log(values.join('\t'));
    });

    this.logger.info('Displayed table', {
      columns: keys,
      rowCount: data.length
    });
  }

  /**
   * セクション区切りを出力
   */
  section(title: string) {
    console.log(chalk.blue('\n=== ' + title + ' ===\n'));
    this.logger.info('Section start', { title });
  }
}
