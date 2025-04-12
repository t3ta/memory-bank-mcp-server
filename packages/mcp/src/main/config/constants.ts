/**
 * Application constants
 */
export const Constants = {
  /**
   * Application name
   */
  APP_NAME: 'memory-bank-mcp-server',

  /**
   * Application version
   */
  VERSION: '3.0.0',

  /**
   * Default port
   */
  DEFAULT_PORT: 3000,

  /**
   * Default host
   */
  DEFAULT_HOST: 'localhost',

  /**
   * Default memory bank root directory
   */
  DEFAULT_MEMORY_BANK_ROOT: 'docs',

  /**
   * Default language
   */
  DEFAULT_LANGUAGE: 'en',

  /**
   * Supported languages
   */
  SUPPORTED_LANGUAGES: ['en', 'ja'] as const,

  /**
   * Migration config
   */
  MIGRATION: {
    disableMarkdownWrites: true,
  }
};
