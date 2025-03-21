/**
 * Utility class for building Markdown strings
 *
 * Provides a fluent interface for creating markdown content
 * with proper formatting and structure.
 * 
 * @deprecated This class is deprecated in v2.1.0 as Markdown support has been removed.
 * All documents should use JSON format only.
 */
export class MarkdownBuilder {
  private content: string[];

  /**
   * Create a new MarkdownBuilder
   */
  constructor() {
    this.content = [];
  }

  /**
   * Add a heading to the markdown
   * @param text Heading text
   * @param level Heading level (1-6), defaults to 1
   * @returns this builder for chaining
   */
  heading(text: string, level: number = 1): MarkdownBuilder {
    if (level < 1) level = 1;
    if (level > 6) level = 6;

    const hashes = '#'.repeat(level);
    this.content.push(`${hashes} ${text}`);
    this.content.push('');

    return this;
  }

  /**
   * Add a paragraph of text
   * @param text Paragraph text
   * @returns this builder for chaining
   */
  paragraph(text: string): MarkdownBuilder {
    // Skip if empty
    if (!text.trim()) return this;

    this.content.push(text);
    this.content.push('');

    return this;
  }

  /**
   * Add a list of items
   * @param items List items
   * @param ordered Whether to create an ordered (numbered) list
   * @returns this builder for chaining
   */
  list(items: string[], ordered: boolean = false): MarkdownBuilder {
    // Skip if empty
    if (items.length === 0) return this;

    items.forEach((item, index) => {
      const prefix = ordered ? `${index + 1}.` : '-';
      this.content.push(`${prefix} ${item}`);
    });

    this.content.push('');

    return this;
  }

  /**
   * Add a task list (checkboxes)
   * @param items List of {text, checked} objects
   * @returns this builder for chaining
   */
  taskList(items: Array<{ text: string; checked: boolean }>): MarkdownBuilder {
    // Skip if empty
    if (items.length === 0) return this;

    items.forEach((item) => {
      const checkbox = item.checked ? '[x]' : '[ ]';
      this.content.push(`- ${checkbox} ${item.text}`);
    });

    this.content.push('');

    return this;
  }

  /**
   * Add a code block
   * @param code Code content
   * @param language Optional language for syntax highlighting
   * @returns this builder for chaining
   */
  codeBlock(code: string, language?: string): MarkdownBuilder {
    const fence = '```';
    const lang = language || '';

    this.content.push(`${fence}${lang}`);
    this.content.push(code);
    this.content.push(fence);
    this.content.push('');

    return this;
  }

  /**
   * Add a blockquote
   * @param text Quote text
   * @returns this builder for chaining
   */
  blockquote(text: string): MarkdownBuilder {
    // Split by newlines and prefix each line with >
    const lines = text.split('\n');

    lines.forEach((line) => {
      this.content.push(`> ${line}`);
    });

    this.content.push('');

    return this;
  }

  /**
   * Add a horizontal rule
   * @returns this builder for chaining
   */
  horizontalRule(): MarkdownBuilder {
    this.content.push('---');
    this.content.push('');

    return this;
  }

  /**
   * Add a link
   * @param text Link text
   * @param url Link URL
   * @returns this builder for chaining
   */
  link(text: string, url: string): MarkdownBuilder {
    this.content.push(`[${text}](${url})`);
    this.content.push('');

    return this;
  }

  /**
   * Add an image
   * @param altText Image alt text
   * @param url Image URL
   * @returns this builder for chaining
   */
  image(altText: string, url: string): MarkdownBuilder {
    this.content.push(`![${altText}](${url})`);
    this.content.push('');

    return this;
  }

  /**
   * Add a table
   * @param headers Table headers
   * @param rows Table rows (array of arrays)
   * @returns this builder for chaining
   */
  table(headers: string[], rows: string[][]): MarkdownBuilder {
    if (headers.length === 0) return this;

    // Add header row
    this.content.push(`| ${headers.join(' | ')} |`);

    // Add separator row
    const separator = headers.map(() => '---');
    this.content.push(`| ${separator.join(' | ')} |`);

    // Add data rows
    rows.forEach((row) => {
      // Ensure row has same length as headers
      const paddedRow = [...row];
      while (paddedRow.length < headers.length) {
        paddedRow.push('');
      }
      this.content.push(`| ${paddedRow.join(' | ')} |`);
    });

    this.content.push('');

    return this;
  }

  /**
   * Add bold text
   * @param text Text to make bold
   * @returns this builder for chaining
   */
  bold(text: string): MarkdownBuilder {
    this.content.push(`**${text}**`);
    this.content.push('');

    return this;
  }

  /**
   * Add italic text
   * @param text Text to italicize
   * @returns this builder for chaining
   */
  italic(text: string): MarkdownBuilder {
    this.content.push(`*${text}*`);
    this.content.push('');

    return this;
  }

  /**
   * Add raw markdown text
   * @param markdown Raw markdown content
   * @returns this builder for chaining
   */
  raw(markdown: string): MarkdownBuilder {
    // Skip if empty
    if (!markdown.trim()) return this;

    this.content.push(markdown);

    return this;
  }

  /**
   * Add tags section in frontmatter format
   * @param tags Array of tags
   * @returns this builder for chaining
   */
  tags(tags: string[]): MarkdownBuilder {
    if (tags.length === 0) return this;

    // Format tags with # prefix
    const formattedTags = tags.map((tag) => `#${tag}`).join(' ');
    this.content.push(`tags: ${formattedTags}`);
    this.content.push('');

    return this;
  }

  /**
   * Build the final markdown string
   * @returns Complete markdown content
   */
  build(): string {
    return this.content.join('\n');
  }

  /**
   * Clear the builder content
   * @returns this builder for chaining
   */
  clear(): MarkdownBuilder {
    this.content = [];
    return this;
  }
}
