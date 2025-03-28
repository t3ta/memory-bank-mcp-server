import path from 'node:path';
import type { BranchTagIndex, GlobalTagIndex } from '@memory-bank/schemas';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import type { IConfigProvider } from '../../config/index.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';

/**
 * タグ関連操作を担当するコンポーネント
 * タグインデックスの管理、タグ検索などを担当
 */
export class TagOperations extends FileSystemMemoryBankRepositoryBase {
  /**
   * Constructor
   * @param basePath 基底パス
   * @param fileSystemService ファイルシステムサービス
   * @param configProvider 設定プロバイダー
   */
  constructor(
    private readonly basePath: string,
    fileSystemService: IFileSystemService,
    configProvider: IConfigProvider
  ) {
    super(fileSystemService, configProvider);
  }

  /**
   * タグインデックスを保存
   * @param tagIndex タグインデックス（ブランチまたはグローバル）
   * @param isGlobal グローバルインデックスかどうか
   */
  async saveTagIndex(tagIndex: BranchTagIndex | GlobalTagIndex, isGlobal: boolean = false): Promise<void> {
    try {
      this.logDebug(`Saving ${isGlobal ? 'global' : 'branch'} tag index`);

      // インデックスファイルのパス
      const indexFileName = isGlobal ? '_global_index.json' : '_index.json';
      const indexPath = path.join(this.basePath, indexFileName);

      // JSON文字列に変換（整形あり）
      const jsonContent = JSON.stringify(tagIndex, null, 2);

      // ファイルに書き込み
      await this.writeFile(indexPath, jsonContent);

      this.logDebug(`${isGlobal ? 'Global' : 'Branch'} tag index saved`);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save ${isGlobal ? 'global' : 'branch'} tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * タグインデックスを取得
   * @param isGlobal グローバルインデックスかどうか
   * @returns タグインデックス（存在しない場合はnull）
   */
  async getTagIndex<T extends BranchTagIndex | GlobalTagIndex>(isGlobal: boolean = false): Promise<T | null> {
    try {
      this.logDebug(`Getting ${isGlobal ? 'global' : 'branch'} tag index`);

      // インデックスファイルのパス
      const indexFileName = isGlobal ? '_global_index.json' : '_index.json';
      const indexPath = path.join(this.basePath, indexFileName);

      // ファイルが存在するかチェック
      const exists = await this.fileExists(indexPath);

      if (!exists) {
        this.logDebug(`No ${isGlobal ? 'global' : 'branch'} tag index found`);
        return null;
      }

      // ファイル内容を読み込み
      const content = await this.readFile(indexPath);

      // JSONをパース
      const tagIndex = JSON.parse(content) as T;

      this.logDebug(`${isGlobal ? 'Global' : 'Branch'} tag index loaded`);
      return tagIndex;
    } catch (error) {
      if (
        error instanceof InfrastructureError &&
        error.code === `INFRA_ERROR.${InfrastructureErrorCodes.FILE_NOT_FOUND}`
      ) {
        return null;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get ${isGlobal ? 'global' : 'branch'} tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * タグを使用してドキュメントパスを検索（インデックス使用）
   * @param tags 検索するタグ
   * @param documents すべてのドキュメント（インデックスがない場合のフォールバック用）
   * @param matchAll すべてのタグに一致する必要があるか（AND）、いずれかのタグに一致すればよいか（OR）
   * @returns 一致するドキュメントパスの配列
   */
  async findDocumentPathsByTagsUsingIndex(
    tags: Tag[],
    documents: MemoryDocument[],
    matchAll: boolean = false
  ): Promise<DocumentPath[]> {
    try {
      this.logDebug(`Finding documents by tags using index (matchAll: ${matchAll})`);

      // タグインデックスを取得
      const tagIndex = await this.getTagIndex<BranchTagIndex | GlobalTagIndex>();

      if (!tagIndex) {
        // インデックスがない場合は通常の検索にフォールバック
        this.logDebug(`No tag index found, falling back to regular method`);
        return this.findDocumentPathsByTagsFallback(tags, documents, matchAll);
      }

      let resultPaths: string[] = [];

      if (matchAll) {
        // ANDロジック - ドキュメントはすべてのタグを持っている必要がある
        if (tags.length === 0) return [];

        // 最初のタグに一致するすべてのドキュメントから始める
        const firstTag = tags[0].value;
        let matchedPaths = tagIndex.index[firstTag] || [];

        // 追加の各タグでフィルタリング
        for (let i = 1; i < tags.length; i++) {
          const tagValue = tags[i].value;
          const tagPaths = tagIndex.index[tagValue] || [];

          // 両方のセットに含まれるパスのみを保持
          matchedPaths = matchedPaths.filter((path) => tagPaths.includes(path));

          // 一致するものがなくなったら早期終了
          if (matchedPaths.length === 0) break;
        }

        resultPaths = matchedPaths;
      } else {
        // ORロジック - ドキュメントはいずれかのタグを持っていればよい
        const pathSet = new Set<string>();

        // すべてのタグのすべてのパスを収集
        for (const tag of tags) {
          const tagValue = tag.value;
          const tagPaths = tagIndex.index[tagValue] || [];

          // 結果セットに追加
          for (const docPath of tagPaths) {
            pathSet.add(docPath);
          }
        }

        resultPaths = Array.from(pathSet);
      }

      // 文字列パスをDocumentPathオブジェクトに変換
      return resultPaths.map((p) => DocumentPath.create(p));
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags using index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * 指定されたタグでドキュメントパスを検索するフォールバックメソッド（インデックスが利用できない場合）
   * @param tags 検索するタグ
   * @param documents すべてのドキュメント
   * @param matchAll すべてのタグに一致するか（true）、いずれかのタグに一致するか（false）
   * @returns 一致するドキュメントパスの配列
   */
  private findDocumentPathsByTagsFallback(
    tags: Tag[],
    documents: MemoryDocument[],
    matchAll: boolean = false
  ): DocumentPath[] {
    // フィルタ条件に基づいてドキュメントをフィルタリング
    const filtered = documents.filter((doc) => {
      if (tags.length === 0) return true;

      if (matchAll) {
        // ANDロジック - すべてのタグを持っている必要がある
        return tags.every((tag) => doc.hasTag(tag));
      } else {
        // ORロジック - いずれかのタグを持っていればよい
        return tags.some((tag) => doc.hasTag(tag));
      }
    });

    // ドキュメントパスのみを返す
    return filtered.map((doc) => doc.path);
  }

  /**
   * タグインデックスを生成して保存
   * @param documents すべてのドキュメント
   * @param isGlobal グローバルインデックスかどうか
   */
  async generateAndSaveTagIndex(documents: MemoryDocument[], isGlobal: boolean = false): Promise<void> {
    try {
      this.logDebug(`Generating ${isGlobal ? 'global' : 'branch'} tag index`);

      // タグインデックスを作成
      const tagIndex: BranchTagIndex | GlobalTagIndex = {
        schema: 'tag_index_v1',
        metadata: {
          updatedAt: new Date().toISOString(),
          documentCount: documents.length,
          fullRebuild: true,
          context: isGlobal ? 'global' : 'branch',
        },
        index: {},
      };

      // タグごとにドキュメントを収集
      for (const doc of documents) {
        for (const tag of doc.tags) {
          if (!tagIndex.index[tag.value]) {
            tagIndex.index[tag.value] = [];
          }
          tagIndex.index[tag.value].push(doc.path.value);
        }
      }

      // タグインデックスを保存
      await this.saveTagIndex(tagIndex, isGlobal);

      this.logDebug(`${isGlobal ? 'Global' : 'Branch'} tag index generated and saved`);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to generate and save tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * タグごとのドキュメント数を取得
   * @param isGlobal グローバルインデックスを使用するかどうか
   * @returns タグとドキュメント数のマップ
   */
  async getTagCounts(isGlobal: boolean = false): Promise<Map<string, number>> {
    try {
      const tagCounts = new Map<string, number>();
      
      // タグインデックスを取得
      const tagIndex = await this.getTagIndex<BranchTagIndex | GlobalTagIndex>(isGlobal);
      
      if (!tagIndex) {
        return tagCounts;
      }
      
      // 各タグのドキュメント数を計算
      for (const [tag, docPaths] of Object.entries(tagIndex.index)) {
        tagCounts.set(tag, docPaths.length);
      }
      
      return tagCounts;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get tag counts: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * すべてのユニークなタグを取得
   * @param documents すべてのドキュメント
   * @returns 一意のタグの配列
   */
  getUniqueTags(documents: MemoryDocument[]): Tag[] {
    // タグ値の一意なセット
    const uniqueTagValues = new Set<string>();
    
    // すべてのドキュメントからタグを収集
    for (const doc of documents) {
      for (const tag of doc.tags) {
        uniqueTagValues.add(tag.value);
      }
    }
    
    // 一意のタグ値をタグオブジェクトに変換
    return Array.from(uniqueTagValues).map(tagValue => Tag.create(tagValue));
  }

  /**
   * タグインデックスのタイトルと内容を言語に基づいて取得
   * @param language 言語コード ('en', 'ja', 'zh')
   * @returns タイトルと内容
   */
  private getTagIndexTitleAndContent(language: string): { title: string; content: string } {
    switch (language) {
      case 'ja':
        return {
          title: "タグインデックス",
          content: "タグとドキュメントの関連付け"
        };
      case 'zh':
        return {
          title: "标签索引",
          content: "标签和文档的映射关系"
        };
      default: // 'en'
        return {
          title: "Tags Index",
          content: "Mapping between tags and documents"
        };
    }
  }

  /**
   * レガシーなタグインデックスファイル（tags/index.json）を更新
   * @param documents すべてのドキュメント
   * @param language 言語（'en'|'ja'|'zh'）
   */
  async updateLegacyTagsIndex(documents: MemoryDocument[], language: string = 'en'): Promise<void> {
    try {
      this.logDebug('Updating legacy tags index file');

      // タグとそのドキュメントを収集
      const tagMap = new Map<string, { count: number; documents: string[] }>();

      for (const doc of documents) {
        for (const tag of doc.tags) {
          const existing = tagMap.get(tag.value);

          if (existing) {
            existing.count += 1;
            existing.documents.push(doc.path.value);
          } else {
            tagMap.set(tag.value, {
              count: 1,
              documents: [doc.path.value],
            });
          }
        }
      }

      // タイトルと内容を言語に基づいて取得
      const { title, content } = this.getTagIndexTitleAndContent(language);

      // JSONタグインデックスを作成
      const tagsDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "tags-index",
          title: title,
          documentType: "generic",
          path: "tags/index.json",
          tags: ["index", "meta"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          sections: [
            {
              title: "Tags List",
              content: content
            }
          ],
          tagMap: Object.fromEntries(
            Array.from(tagMap.entries()).map(([tag, info]) => {
              return [tag, {
                count: info.count,
                documents: info.documents.map(d => {
                  const doc = documents.find((doc) => doc.path.value === d);
                  return {
                    path: d,
                    title: doc?.title || d
                  };
                })
              }];
            })
          )
        }
      };

      // JSON文字列に変換（整形あり）
      const indexContent = JSON.stringify(tagsDocument, null, 2);

      // 直接パス - saveDocument からの呼び出し時に循環参照を避けるために使用
      const indexPath = DocumentPath.create('tags/index.json');
      const fullPath = path.join(this.basePath, indexPath.value);
      await this.createDirectory(path.dirname(fullPath));
      await this.writeFile(fullPath, indexContent);

      this.logDebug('Legacy tags index file updated');
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to update legacy tags index file: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
