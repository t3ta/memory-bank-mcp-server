import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger';
import { TagProcessor, MemoryDocument, TagCategorization } from './tag-processor';

/**
 * タグインデックスエントリの型
 */
export interface TagIndexEntry {
  count: number;
  category: string;
  documents: Array<{
    path: string;
    title: string;
  }>;
}

// Import new schema types
import { TagsIndex, DocumentsMetaIndex, DocumentMeta } from '@memory-bank/schemas'; // Revert to package import

// Keep LegacyIndex definition for generateLegacyIndex

/**
 * レガシーインデックスの型
 */
export interface LegacyIndex {
  schema: string;
  metadata: {
    id: string;
    title: string;
    documentType: string;
    path: string;
    tags: string[];
    lastModified: string;
    createdAt: string;
    version: number;
  };
  index: Record<string, string[]>;
}

/**
 * インデックス生成を行うクラス
 */
export class IndexGenerator {
  /**
   * IndexGeneratorのコンストラクタ
   * @param tagProcessor - タグプロセッサーインスタンス
   * @param logger - ロガーインスタンス
   */
  constructor(
    private tagProcessor: TagProcessor,
    private logger: Logger
  ) {}

  /**
   * 新しい形式のタグインデックスを生成する
   * @param files - 対象ファイルのパスリスト
   * @returns 生成されたタグインデックス
   */
  async generateIndex(files: string[]): Promise<{ tagsIndex: TagsIndex, documentsMetaIndex: DocumentsMetaIndex }> {
    try {
      this.logger.info('新しいインデックスの生成を開始します...');

      const tagsIndex: TagsIndex = {};
      const documentsMetaIndex: DocumentsMetaIndex = {};

      for (const filePath of files) {
        try {
          const document = await fs.readJSON(filePath) as MemoryDocument;

          if (!document || !document.metadata || !Array.isArray(document.metadata.tags)) {
            this.logger.debug(`Skipping file due to missing metadata or tags: ${filePath}`);
            continue;
          }

          const normalizedPath = this.normalizeFilePath(filePath);

          // Build tagsIndex
          for (const tag of document.metadata.tags) {
            if (!tagsIndex[tag]) {
              tagsIndex[tag] = [];
            }
            if (!tagsIndex[tag].includes(normalizedPath)) {
              tagsIndex[tag].push(normalizedPath);
            }
          }

          // Build documentsMetaIndex
          const meta: DocumentMeta = {
            title: document.metadata.title || path.basename(filePath),
            lastModified: document.metadata.lastModified || new Date().toISOString(),
            scope: 'global', // Assuming this generator is only for global index
            // documentType: document.metadata.documentType // Optionally add documentType
          };
          documentsMetaIndex[normalizedPath] = meta;

        } catch (error) {
          this.logger.warning(`インデックス生成中にファイルの読み込み/処理に失敗しました: ${filePath} - ${error}`);
        }
      }

      this.logger.info(`新しいインデックスを生成しました: ${Object.keys(tagsIndex).length}個のタグ, ${Object.keys(documentsMetaIndex).length}個のドキュメントメタデータ`);

      return { tagsIndex, documentsMetaIndex };
    } catch (error) {
      this.logger.error(`新しいインデックスの生成に失敗しました: ${error}`);
      throw error;
    }
  }

  /**
   * カテゴリリストを生成する
   * @param tagCategorization - タグカテゴリ定義
   * @returns カテゴリリスト
   */
  private generateCategories(tagCategorization: TagCategorization): Array<{
    id: string;
    title: string;
    tags: string[];
  }> {
    const categories: Array<{
      id: string;
      title: string;
      tags: string[];
    }> = [];

    // タグカテゴリ定義からカテゴリ情報を抽出
    for (const section of tagCategorization.content.sections) {
      // タイトルからカテゴリIDを抽出（例: "1. プロジェクト基盤 (project-foundation)" -> "project-foundation"）
      const match = section.title.match(/\(([a-z0-9-]+)\)/);
      if (match && section.tags) {
        categories.push({
          id: match[1],
          title: section.title,
          tags: section.tags
        });
      }
    }

    return categories;
  }

  /**
   * レガシー形式のインデックスを生成する
   * @param files - 対象ファイルのパスリスト
   * @returns 生成されたレガシーインデックス
   */
  async generateLegacyIndex(files: string[]): Promise<LegacyIndex> {
    try {
      this.logger.info('レガシーインデックスの生成を開始します...');

      // タグインデックスを初期化
      const tagIndex: Record<string, string[]> = {};

      // 各ファイルを処理
      for (const filePath of files) {
        try {
          // JSONファイルを読み込む
          const document = await fs.readJSON(filePath) as MemoryDocument;

          // メモリドキュメントの基本的な検証
          if (!document || !document.metadata || !Array.isArray(document.metadata.tags)) {
            continue;
          }

          // 正規化されたパス
          const normalizedPath = this.normalizeFilePath(filePath);

          // 各タグを処理
          for (const tag of document.metadata.tags) {
            // タグがインデックスに存在しない場合は初期化
            if (!tagIndex[tag]) {
              tagIndex[tag] = [];
            }

            // パスが既に追加されていない場合のみ追加
            if (!tagIndex[tag].includes(normalizedPath)) {
              tagIndex[tag].push(normalizedPath);
            }
          }
        } catch (error) {
          this.logger.warning(`レガシーインデックス生成中にファイルの読み込みに失敗しました: ${filePath} - ${error}`);
        }
      }

      // 現在の日時
      const now = new Date().toISOString();

      // レガシーインデックスを生成
      const legacyIndex: LegacyIndex = {
        schema: 'tag_index_v1',
        metadata: {
          id: 'global-tag-index',
          title: 'グローバルタグインデックス',
          documentType: 'index',
          path: '_global_index.json',
          tags: ['index', 'meta'],
          lastModified: now,
          createdAt: now, // これは既存ファイルの値を使うべきかもしれない
          version: 1 // これも既存ファイルから増分すべきかもしれない
        },
        index: tagIndex
      };

      this.logger.info(`レガシーインデックスを生成しました: ${Object.keys(tagIndex).length}個のタグ`);

      return legacyIndex;
    } catch (error) {
      this.logger.error(`レガシーインデックスの生成に失敗しました: ${error}`);
      throw error;
    }
  }

  /**
   * インデックスデータをファイルに保存する
   * @param indexData - 保存するインデックスデータ (TagsIndex, DocumentsMetaIndex, or LegacyIndex)
   * @param filePath - 保存先のファイルパス
   * @param dryRun - 実際に保存しない（テストモード）
   */
  async saveIndex(indexData: TagsIndex | DocumentsMetaIndex | LegacyIndex, filePath: string, dryRun = false): Promise<void> {
    try {
      // ディレクトリが存在しない場合は作成
      if (!dryRun) {
        await fs.ensureDir(path.dirname(filePath));

        // ファイルに保存
        await fs.writeJSON(filePath, indexData, { spaces: 2 });

        this.logger.info(`インデックスを保存しました: ${filePath}`);
      } else {
        this.logger.info(`インデックスを保存しました（ドライラン）: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`インデックスの保存に失敗しました: ${filePath} - ${error}`);
      throw error;
    }
  }

  /**
   * ファイルパスを正規化する（プロジェクトルートからの相対パス）
   * @param filePath - 元のファイルパス
   * @returns 正規化されたパス
   */
  private normalizeFilePath(filePath: string): string {
    // プロジェクトルートの推定
    // docs/global-memory-bank/xxxx.json -> docs/global-memory-bank/xxxx.json
    const match = filePath.match(/(.+?)\/docs\/global-memory-bank\/(.*)/);
    if (match) {
      return `docs/global-memory-bank/${match[2]}`;
    }

    return filePath;
  }
}
