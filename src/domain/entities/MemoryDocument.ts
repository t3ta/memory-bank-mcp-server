import { DocumentPath } from './DocumentPath.js';
import { Tag } from './Tag.js';

/**
 * Props for MemoryDocument entity
 */
interface MemoryDocumentProps {
  path: DocumentPath;
  content: string;
  tags: Tag[];
  lastModified: Date;
}

/**
 * Entity representing a document in the memory bank
 */
export class MemoryDocument {
  private readonly props: MemoryDocumentProps;

  private constructor(props: MemoryDocumentProps) {
    this.props = props;
  }

  /**
   * Factory method to create a new MemoryDocument
   * @param props Document properties
   * @returns MemoryDocument instance
   */
  public static create(props: MemoryDocumentProps): MemoryDocument {
    // Create a defensive copy of the props
    const documentProps = {
      path: props.path,
      content: props.content,
      tags: [...props.tags],
      lastModified: new Date(props.lastModified) 
    };
    
    return new MemoryDocument(documentProps);
  }

  /**
   * Get the document path
   */
  public get path(): DocumentPath {
    return this.props.path;
  }

  /**
   * Get the document content
   */
  public get content(): string {
    return this.props.content;
  }

  /**
   * Get the document tags
   */
  public get tags(): Tag[] {
    return [...this.props.tags];
  }

  /**
   * Get the last modified date
   */
  public get lastModified(): Date {
    return new Date(this.props.lastModified);
  }

  /**
   * Check if document has a specific tag
   * @param tag Tag to check
   * @returns boolean indicating if document has tag
   */
  public hasTag(tag: Tag): boolean {
    return this.props.tags.some(t => t.equals(tag));
  }

  /**
   * Create a new document with updated content
   * @param content New content
   * @returns New MemoryDocument instance
   */
  public updateContent(content: string): MemoryDocument {
    if (content === this.props.content) {
      return this;
    }
    
    return MemoryDocument.create({
      ...this.props,
      content,
      lastModified: new Date()
    });
  }

  /**
   * Create a new document with added tag
   * @param tag Tag to add
   * @returns New MemoryDocument instance
   */
  public addTag(tag: Tag): MemoryDocument {
    if (this.hasTag(tag)) {
      return this;
    }
    
    return MemoryDocument.create({
      ...this.props,
      tags: [...this.props.tags, tag],
      lastModified: new Date()
    });
  }

  /**
   * Create a new document with removed tag
   * @param tag Tag to remove
   * @returns New MemoryDocument instance
   */
  public removeTag(tag: Tag): MemoryDocument {
    if (!this.hasTag(tag)) {
      return this;
    }
    
    return MemoryDocument.create({
      ...this.props,
      tags: this.props.tags.filter(t => !t.equals(tag)),
      lastModified: new Date()
    });
  }

  /**
   * Create a new document with updated tags
   * @param tags New tags
   * @returns New MemoryDocument instance
   */
  public updateTags(tags: Tag[]): MemoryDocument {
    return MemoryDocument.create({
      ...this.props,
      tags,
      lastModified: new Date()
    });
  }

  /**
   * Extract the document title from content
   * @returns Document title or undefined if not found
   */
  public get title(): string | undefined {
    const lines = this.props.content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('# ')) {
        return trimmedLine.substring(2).trim();
      }
    }
    return undefined;
  }

  /**
   * Check if the document is a markdown file
   */
  public get isMarkdown(): boolean {
    return this.props.path.extension.toLowerCase() === 'md';
  }

  /**
   * Convert to plain object for serialization
   */
  public toObject(): Record<string, unknown> {
    return {
      path: this.props.path.value,
      content: this.props.content,
      tags: this.props.tags.map(tag => tag.value),
      lastModified: this.props.lastModified.toISOString()
    };
  }
}
