/**
 * Simple logger utility
 */
export class Logger {
  private static instance: Logger;
  private verbose: boolean = false;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public configure(options: { verbose?: boolean }): void {
    this.verbose = options.verbose ?? false;
  }

  public debug(...args: any[]): void {
    if (this.verbose) {
      console.error('[DEBUG]', ...args);
    }
  }

  public info(...args: any[]): void {
    console.error('[INFO]', ...args);
  }

  public warn(...args: any[]): void {
    console.error('[WARN]', ...args);
  }

  public error(...args: any[]): void {
    console.error('[ERROR]', ...args);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
