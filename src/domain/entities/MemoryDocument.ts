import { DocumentPath } from './DocumentPath.js';
import { Tag } from './Tag.js';
import { BaseJsonDocument } from '../../schemas/json-document.js';
import { DomainError } from '../../shared/errors/DomainError.js';

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
      lastModified: new Date(props.lastModified),
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
    return this.props.tags.some((t) => t.equals(tag));
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
      lastModified: new Date(),
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
      lastModified: new Date(),
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
      tags: this.props.tags.filter((t) => !t.equals(tag)),
      lastModified: new Date(),
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
      lastModified: new Date(),
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
    return this.props.path.isMarkdown;
  }

  /**
   * Check if the document is a JSON file
   */
  public get isJSON(): boolean {
    return this.props.path.isJSON;
  }

  /**
   * Convert to plain object for serialization
   */
  public toObject(): Record<string, unknown> {
    return {
      path: this.props.path.value,
      content: this.props.content,
      tags: this.props.tags.map((tag) => tag.value),
      lastModified: this.props.lastModified.toISOString(),
    };
  }

  /**
   * Convert document to JSON format
   * @returns JSON document object
   */
  public toJSON(): BaseJsonDocument {
    if (this.isJSON) {
      try {
        return JSON.parse(this.props.content) as BaseJsonDocument;
      } catch (error) {
        console.error('Failed to parse JSON document:', error);
      }
    }

    const documentType = this.determineDocumentType();
    const title = this.title || this.props.path.filename;

    // Create a default content structure based on document type
    let content: Record<string, unknown>;
    switch (documentType) {
      case 'branch_context':
        content = {
          purpose: this.props.content,
          createdAt: new Date(),
          userStories: [],
        };
        break;
      case 'active_context':
        content = {
          currentWork: this.props.content,
          recentChanges: [],
          activeDecisions: [],
          considerations: [],
          nextSteps: [],
        };
        break;
      case 'progress':
        content = {
          status: this.props.content,
          workingFeatures: [],
          pendingImplementation: [],
          knownIssues: [],
        };
        break;
      case 'system_patterns':
        content = {
          technicalDecisions: [],
        };
        break;
      default:
        content = {
          text: this.props.content,
        };
    }

    return {
      schema: 'memory_document_v1',
      metadata: {
        title,
        documentType,
        path: this.props.path.value,
        tags: this.props.tags.map((tag) => tag.value),
        lastModified: this.props.lastModified,
      },
      content,
    };
  }

  /**
   * Convert JSON document to Markdown
   * @param jsonDoc JSON document to convert
   * @returns Markdown formatted string
   */
  public static fromJSON(jsonDoc: BaseJsonDocument, path: DocumentPath): MemoryDocument {
    // Sanitize tags before creating Tag objects
    const sanitizedTags = (jsonDoc.metadata.tags || []).map((tag: string) => {
      // First try to create the tag as is
      try {
        return Tag.create(tag);
      } catch (e: unknown) {
        // If creation fails, sanitize the tag
        if (e instanceof DomainError && e.code === 'DOMAIN_ERROR.INVALID_TAG_FORMAT') {
          // Make lowercase and replace invalid characters with hyphens
          const sanitizedTagStr = tag.toLowerCase().replace(/[^a-z0-9-]/g, '-');
          // Log the sanitization for debugging
          console.warn(`Sanitized tag '${tag}' to '${sanitizedTagStr}'`);
          return Tag.create(sanitizedTagStr);
        }
        throw e; // Re-throw if it's not a format error
      }
    });

    return MemoryDocument.create({
      path,
      content: JSON.stringify(jsonDoc, null, 2),
      tags: sanitizedTags,
      lastModified: new Date(jsonDoc.metadata.lastModified),
    });
  }

  /**
   * Determine the document type based on the path or content
   * @returns document type
   */
  private determineDocumentType(): string {
    const filename = this.props.path.filename.toLowerCase();

    if (filename.includes('branchcontext') || filename.includes('branch-context')) {
      return 'branch_context';
    } else if (filename.includes('activecontext') || filename.includes('active-context')) {
      return 'active_context';
    } else if (filename.includes('progress')) {
      return 'progress';
    } else if (filename.includes('systempatterns') || filename.includes('system-patterns')) {
      return 'system_patterns';
    } else {
      return 'generic';
    }
  }
}
