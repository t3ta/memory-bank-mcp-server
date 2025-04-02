// Removed unused Language import
import { logger } from './logger.js'; // Import logger

// Logger is kept for backward compatibility
// export { logger } from './logger.js'; // Remove re-export if logger is used internally

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
    logger.error('Error parsing date', { error: error instanceof Error ? error.message : String(error), dateInput }); // Use logger
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

  let nextSectionIndex = lines.findIndex(
    (line, index) => index > sectionIndex && line.startsWith('##')
  );
  if (nextSectionIndex === -1) {
    nextSectionIndex = lines.length;
  }

  return lines
    .slice(sectionIndex + 1, nextSectionIndex)
    .filter((line) => line.trim())
    .join('\n')
    .trim();
};
