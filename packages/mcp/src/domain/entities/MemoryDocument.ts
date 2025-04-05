import { DocumentPath } from './DocumentPath.js';
import { Tag } from './Tag.js';
import { DomainError } from '../../shared/errors/DomainError.js';
import { IDocumentLogger } from '../logger/IDocumentLogger.js';
import { JsonDocumentV2 } from '@memory-bank/schemas';
import crypto from 'crypto'; // crypto をインポート

/**
 * Static logger instance for MemoryDocument
 * This is set from outside to avoid domain entities depending directly on infrastructure
 */
let documentLogger: IDocumentLogger | null = null;

/**
 * Set the logger instance for MemoryDocument
 * This allows dependency injection from outside the domain
 * @param logger Logger implementation to use
 */
export function setDocumentLogger(logger: IDocumentLogger): void {
  documentLogger = logger;
}

/**
 * Get the current logger or use a no-op logger if not set
 * @returns The current logger or a no-op logger
 */
function getLogger(): IDocumentLogger {
  if (!documentLogger) {
    return {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };
  }
  return documentLogger;
}

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
    getLogger().debug('Checking tag:', {
      documentTags: this.props.tags.map(t => t.value),
      searchTag: tag.value
    });
    const hasTag = this.props.tags.some((t) => {
      const matches = t.equals(tag);
      getLogger().debug('Tag comparison:', { tag1: t.value, tag2: tag.value, matches });
      return matches;
    });
    return hasTag;
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
    // If JSON, try to parse and get metadata.title
    if (this.isJSON) {
      try {
        const parsed = JSON.parse(this.props.content);
        if (parsed && parsed.metadata && typeof parsed.metadata.title === 'string') {
          return parsed.metadata.title;
        }
      } catch {
        // Ignore parsing errors for title extraction
      }
    }
    return undefined;
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
  public toJSON(): JsonDocumentV2 {
    if (this.isJSON) { // <<<--- if ブロックを復活！
      try {
        // ファイルの内容をパース
        const parsedContent = JSON.parse(this.props.content);
        // スキーマ v2 形式であることを確認し、そのまま返す
        // (ここで Zod などでバリデーションするのがより堅牢)
        if (parsedContent.schema === 'memory_document_v2' && parsedContent.documentType && parsedContent.metadata && parsedContent.content) {
           // パースした内容をそのまま返す (ID などもファイルの内容を維持)
           // 必要であれば、lastModified や tags を props の値で上書きする
           // parsedContent.metadata.lastModified = this.props.lastModified.toISOString();
           // parsedContent.metadata.tags = this.props.tags.map(tag => tag.value);
          return parsedContent as JsonDocumentV2;
        } else {
           getLogger().warn('Parsed JSON content does not match expected v2 schema, falling back to reconstruction.', { path: this.props.path.value });
           // スキーマが不正な場合は、後半の組み立てロジックにフォールバック
        }
      } catch (error) {
        getLogger().error('Failed to parse JSON document, falling back to reconstruction:', { error, path: this.props.path.value });
        // パースエラーの場合も、後半の組み立てロジックにフォールバック
      }
    }

    // --- JSON 形式でない場合、またはパース/バリデーション失敗時のフォールバック ---
    const documentType = this.determineDocumentType(); // <<<--- 呼び出しはここ
    const title = this.title || this.props.path.filename;

    // metadata オブジェクトを作成 (documentType を除く)
    const metadata = {
      id: crypto.randomUUID(), // 新しいIDを生成 (JSONでない場合はこれで良い)
      title: title,
      path: this.props.path.value,
      tags: this.props.tags.map((tag) => tag.value),
      lastModified: this.props.lastModified.toISOString(),
      createdAt: new Date().toISOString(), // 作成日時は常に現在時刻
      version: 1,
    };

    // content オブジェクトを作成 (JSONでない場合の簡易的な構造)
    let content: Record<string, unknown> = {
        text: this.props.content, // デフォルトは text フィールドに入れる
    };
    // 必要に応じて documentType ごとの特殊な content 構造を定義
    // (例: branch_context なら purpose に入れるなど、ただし今回は text に統一)

    // スキーマ v2 形式で返す (documentType をトップレベルに)
    return {
      schema: 'memory_document_v2',
      documentType: documentType, // <<<--- トップレベルに追加！
      metadata: metadata,
      content: content,
    } as JsonDocumentV2; // 型アサーションは維持 (必要に応じて調整)
  }

  /**
   * Convert JSON document to Markdown
   * @param jsonDoc JSON document to convert
   * @returns Markdown formatted string
   */
  public static fromJSON(jsonDoc: JsonDocumentV2, path: DocumentPath): MemoryDocument {
    getLogger().debug('Creating MemoryDocument from JSON:', {
      path: path.value,
      schema: jsonDoc.schema
    });

    const lastModified = jsonDoc.metadata.lastModified; // Access via metadata

    const sanitizedTags = (jsonDoc.metadata.tags || []).map((tag: string) => { // Access via metadata
      try {
        const tagObj = Tag.create(tag);
        getLogger().debug('Created tag:', { tag: tagObj.value, source: tag });
        return tagObj;
      } catch (e: unknown) {
        if (e instanceof DomainError && e.code === 'DOMAIN_ERROR.INVALID_TAG_FORMAT') {
          const sanitizedTagStr = tag.toLowerCase().replace(/[^a-z0-9-]/g, '-');
          getLogger().warn(`Sanitized tag '${tag}' to '${sanitizedTagStr}'`);
          const tagObj = Tag.create(sanitizedTagStr);
          getLogger().debug('Created sanitized tag:', { tag: tagObj.value });
          return tagObj;
        }
        throw e;
      }
    });

    const doc = MemoryDocument.create({
      path,
      content: JSON.stringify(jsonDoc, null, 2),
      tags: sanitizedTags,
      lastModified: new Date(lastModified),
    });

    getLogger().debug('Created MemoryDocument with tags:', { tags: doc.tags.map(t => t.value) });
    return doc;
  }

  /**
   * Determine the document type based on the path or content
   * @returns document type
   */
  private determineDocumentType(): JsonDocumentV2['documentType'] { // <<<--- 型修正済み
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
      // JsonDocumentV2 に 'generic' はないので、デフォルトの型を返す
      // (本来はどう扱うべきか要検討)
      // ここで適切なデフォルトタイプを返すか、エラーを投げるべき
      // 例として 'branch_context' を返す (スキーマ定義に合わせて調整が必要)
      getLogger().warn(`Could not determine specific document type for ${filename}, defaulting.`);
      // return 'generic'; // スキーマに generic がない場合はエラーになる
      return 'branch_context'; // 仮のデフォルト
    }
  }
}
