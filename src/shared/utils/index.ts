// ロガーは後方互換性のために残します
export { logger } from './logger.js';

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
