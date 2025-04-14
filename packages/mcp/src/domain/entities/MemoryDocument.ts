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
    if (this.isJSON) {
      try {
        // ファイルの内容をパース
        const parsedContent = JSON.parse(this.props.content);

        // スキーマ v2 形式であることを確認
        if (parsedContent.schema === 'memory_document_v2') {
          // 古い形式から新形式への変換をチェック（documentType が metadata 内にある場合）
          if (!parsedContent.documentType && parsedContent.metadata?.documentType) {
            getLogger().info('Converting legacy document format to new format:', {
              path: this.props.path.value,
              documentType: parsedContent.metadata.documentType
            });

            // 新しい形式に変換（documentType をトップレベルに移動）
            const documentType = parsedContent.metadata.documentType;
            const newDocument = {
              ...parsedContent,
              documentType: documentType, // トップレベルに追加
              metadata: {
                ...parsedContent.metadata,
                // metadata.documentType は削除しない（互換性のため）
              }
            };

            return newDocument as JsonDocumentV2;
          }

          // 新形式のチェック（documentType が既にトップレベルにある）
          if (parsedContent.documentType && parsedContent.metadata && parsedContent.content) {
            // 正しい形式なのでそのまま返す
            return parsedContent as JsonDocumentV2;
          }

          // スキーマ形式が不明または不完全な場合は警告
          getLogger().warn('Parsed JSON content has v2 schema but missing required fields, falling back to reconstruction.', {
            path: this.props.path.value,
            hasDocumentType: !!parsedContent.documentType,
            hasMetadataDocumentType: !!parsedContent.metadata?.documentType
          });
        } else {
          getLogger().warn('Parsed JSON content does not match expected v2 schema, falling back to reconstruction.', {
            path: this.props.path.value,
            schema: parsedContent.schema
          });
        }
      } catch (error) {
        getLogger().error('Failed to parse JSON document, will reconstruct document:', {
          error: (error as Error).message,
          path: this.props.path.value
        });
        // エラーをスローせず、以下の再構築処理に進む
      }
    }

    // --- JSON 形式でない場合、またはパース/バリデーション失敗時の再構築処理 ---
    const documentType = this.determineDocumentType();
    const title = this.title || this.props.path.filename;

    // metadata オブジェクトを作成
    const metadata = {
      id: crypto.randomUUID(), // 新しいIDを生成
      title: title,
      path: this.props.path.value,
      tags: this.props.tags.map((tag) => tag.value),
      lastModified: this.props.lastModified.toISOString(),
      createdAt: new Date().toISOString(),
      version: 1,
    };

    // content オブジェクトを作成（デフォルトは単純なテキスト）
    let content: Record<string, unknown> = {
      text: this.props.content,
    };

    // 新形式の v2 スキーマで返す（documentType はトップレベル）
    return {
      schema: 'memory_document_v2',
      documentType: documentType,
      metadata: metadata,
      content: content,
    } as JsonDocumentV2;
  }

  /**
   * JSON ドキュメントから MemoryDocument を作成
   * v2.5.0 以降の新形式と古い形式の両方をサポート
   * @param jsonDoc JSON document to convert
   * @returns MemoryDocument instance
   */
  public static fromJSON(jsonDoc: JsonDocumentV2, path: DocumentPath): MemoryDocument {
    getLogger().debug('Creating MemoryDocument from JSON:', {
      path: path.value,
      schema: jsonDoc.schema
    });

    // documentType フィールドの位置を確認（古い形式か新形式か）
    const hasTopLevelDocumentType = 'documentType' in jsonDoc && typeof jsonDoc.documentType === 'string';

    // 型安全なアクセスのために、`as any`を一時的に使用して型チェックを迂回
    // これは移行期間中の互換性のためだけの措置
    const metadata = jsonDoc.metadata as any;
    const hasMetadataDocumentType = metadata?.documentType && typeof metadata.documentType === 'string';

    if (!hasTopLevelDocumentType && hasMetadataDocumentType) {
      // 古い形式を検出: documentType が metadata 内にあるケース
      getLogger().info('Detected legacy document format with documentType in metadata.', {
        path: path.value,
        documentType: metadata.documentType
      });

      // v2.5.0 以降の新形式に変換（トップレベルに documentType を移動）
      jsonDoc = {
        ...jsonDoc,
        documentType: metadata.documentType, // トップレベルに追加
      } as JsonDocumentV2;
    }

    // 形式に関わらず metadata から必要な情報を取得
    const lastModified = jsonDoc.metadata.lastModified;

    // タグの処理（サニタイズを含む）
    const sanitizedTags = (jsonDoc.metadata.tags || []).map((tag: string) => {
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

    // 常に新形式（v2.5.0以降）として保存するため、
    // 変換済みの jsonDoc オブジェクトを文字列化
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
