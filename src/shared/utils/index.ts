export * from './markdown-converter.js';
export * from './markdown-parser.js';

/**
 * Logger utility
 */

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  setLevel(level: LogLevel): void;
}

/**
 * Create a console logger
 * @param level Minimum log level to display
 * @returns Logger instance
 */
export function createConsoleLogger(level: LogLevel = 'info'): Logger {
  let currentLevel = level;

  // Log level priorities
  const levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  /**
   * Check if a log level should be displayed
   * @param msgLevel Level of the message
   * @returns Whether the message should be logged
   */
  function shouldLog(msgLevel: LogLevel): boolean {
    return levelPriority[msgLevel] >= levelPriority[currentLevel];
  }

  return {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog('debug')) {
        console.debug(`[DEBUG] ${message}`, ...args);
      }
    },

    info(message: string, ...args: unknown[]): void {
      if (shouldLog('info')) {
        console.info(`[INFO] ${message}`, ...args);
      }
    },

    warn(message: string, ...args: unknown[]): void {
      if (shouldLog('warn')) {
        console.warn(`[WARN] ${message}`, ...args);
      }
    },

    error(message: string, ...args: unknown[]): void {
      if (shouldLog('error')) {
        console.error(`[ERROR] ${message}`, ...args);
      }
    },

    setLevel(level: LogLevel): void {
      currentLevel = level;
    },
  };
}

export const logger = createConsoleLogger();

// Date utilities

/**
 * Parse a date string safely, returning a valid Date object
 * @param dateInput Date string or Date object
 * @returns Date object
 */
export const parseDateSafely = (dateInput: string | Date): Date => {
  try {
    if (dateInput instanceof Date) {
      return dateInput;
    }

    const date = new Date(dateInput);

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateInput}`);
    }

    return date;
  } catch (error) {
    console.error(`Error parsing date: ${error instanceof Error ? error.message : String(error)}`);
    // Return current time as default value
    return new Date();
  }
};

/**
 * Extract tags from document content
 * @param content Document content
 * @returns Array of tags
 */
export const extractTags = (content: string): string[] => {
  const tagLine = content.split('\n').find((line) => line.trim().startsWith('tags:'));

  if (!tagLine) return [];

  return tagLine
    .replace('tags:', '')
    .trim()
    .split(/\s+/)
    .filter((tag) => tag.startsWith('#'))
    .map((tag) => tag.substring(1));
};

/**
 * Add tags to document content
 * @param content Document content
 * @param tags Array of tags
 * @returns Updated content with tags
 */
export const addTagsToContent = (content: string, tags: string[]): string => {
  if (tags.length === 0) return content;

  const tagLine = `tags: ${tags.map((t) => `#${t}`).join(' ')}\n\n`;

  // If content already has tags, replace them
  if (content.includes('tags:')) {
    return content.replace(/tags:.*\n\n/, tagLine);
  }

  // Add tags after the title (first line)
  const lines = content.split('\n');
  const firstLine = lines[0];
  const rest = lines.slice(1).join('\n');

  return `${firstLine}\n\n${tagLine}${rest}`;
};

/**
 * Extract a section from markdown content
 * @param content Markdown content
 * @param sectionHeader Section header
 * @returns Section content or undefined if section not found
 */
export const extractSectionContent = (
  content: string,
  sectionHeader: string
): string | undefined => {
  const lines = content.split('\n');
  const sectionIndex = lines.findIndex((line) => line.trim() === sectionHeader);

  if (sectionIndex === -1) return undefined;

  // Find the next section or end of file
  let nextSectionIndex = lines.findIndex(
    (line, index) => index > sectionIndex && line.startsWith('##')
  );
  if (nextSectionIndex === -1) {
    nextSectionIndex = lines.length;
  }

  // Extract and clean section content
  return lines
    .slice(sectionIndex + 1, nextSectionIndex)
    .filter((line) => line.trim())
    .join('\n')
    .trim();
};

/**
 * Extract list items from a section in markdown content
 * @param content Markdown content
 * @param sectionHeader Section header
 * @returns Array of list items or undefined if section not found
 */
export const extractListItems = (content: string, sectionHeader: string): string[] | undefined => {
  const sectionContent = extractSectionContent(content, sectionHeader);
  if (!sectionContent) return undefined;

  return sectionContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-'))
    .map((line) => line.substring(1).trim());
};
