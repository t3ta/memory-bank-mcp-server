/**
 * Simple logger utility
 */
export class Logger {
  private static instance: Logger;
  private verbose: boolean = false;
  private silent: boolean = false;

  private constructor() {
    // Detect test environment
    this.silent = process.env.NODE_ENV === 'test';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public configure(options: { verbose?: boolean, silent?: boolean }): void {
    this.verbose = options.verbose ?? false;
    this.silent = options.silent ?? this.silent;
  }

  public debug(...args: any[]): void {
    if (this.verbose && !this.silent) {
      console.error('[DEBUG]', ...args);
    }
  }

  public info(...args: any[]): void {
    if (!this.silent) {
      console.error('[INFO]', ...args);
    }
  }

  public warn(...args: any[]): void {
    if (!this.silent) {
      console.error('[WARN]', ...args);
    }
  }

  public error(...args: any[]): void {
    if (!this.silent) {
      console.error('[ERROR]', ...args);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
