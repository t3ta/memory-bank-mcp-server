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

/**
 * タグインデックスの型
 */
export interface TagIndex {
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
  content: {
    sections: Array<{
      title: string;
      content: string;
    }>;
    tagMap: Record<string, TagIndexEntry>;
    categories: Array<{
      id: string;
      title: string;
      tags: string[];
    }>;
  };
}

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
  async generateIndex(files: string[]): Promise<TagIndex> {
    try {
      this.logger.info('タグインデックスの生成を開始します...');
      
      const tagCategorization = this.tagProcessor.getTagCategorization();
      if (!tagCategorization) {
        throw new Error('タグカテゴリ定義が読み込まれていません');
      }
      
      // タグマップを初期化
      const tagMap: Record<string, TagIndexEntry> = {};
      
      // 各ファイルを処理
      for (const filePath of files) {
        try {
          // JSONファイルを読み込む
          const document = await fs.readJSON(filePath) as MemoryDocument;
          
          // メモリドキュメントの基本的な検証
          if (!document || !document.metadata || !Array.isArray(document.metadata.tags)) {
            continue;
          }
          
          // 各タグを処理
          for (const tag of document.metadata.tags) {
            // タグがマップに存在しない場合は初期化
            if (!tagMap[tag]) {
              tagMap[tag] = {
                count: 0,
                category: tagCategorization.content.tagCategoryMappings[tag] || 'uncategorized',
                documents: []
              };
            }
            
            // カウントを増やす
            tagMap[tag].count++;
            
            // ドキュメント情報を追加
            tagMap[tag].documents.push({
              path: this.normalizeFilePath(filePath),
              title: document.metadata.title || path.basename(filePath)
            });
          }
        } catch (error) {
          this.logger.warning(`インデックス生成中にファイルの読み込みに失敗しました: ${filePath} - ${error}`);
        }
      }
      
      // カテゴリリストを生成
      const categories = this.generateCategories(tagCategorization);
      
      // 現在の日時
      const now = new Date().toISOString();
      
      // インデックスを生成
      const index: TagIndex = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'tags-index',
          title: 'タグインデックス',
          documentType: 'index',
          path: 'tags/index.json',
          tags: ['index', 'meta'],
          lastModified: now,
          createdAt: now, // これは既存ファイルの値を使うべきかもしれない
          version: 1 // これも既存ファイルから増分すべきかもしれない
        },
        content: {
          sections: [
            {
              title: 'タグインデックスについて',
              content: 'このドキュメントはグローバルメモリバンク内のすべてのドキュメントのタグを索引化したものです。タグは論理的なカテゴリにグループ化され、関連するドキュメントへのリンクを提供します。'
            }
          ],
          tagMap,
          categories
        }
      };
      
      this.logger.info(`タグインデックスを生成しました: ${Object.keys(tagMap).length}個のタグ`);
      
      return index;
    } catch (error) {
      this.logger.error(`タグインデックスの生成に失敗しました: ${error}`);
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
   * インデックスをファイルに保存する
   * @param index - タグインデックス
   * @param filePath - 保存先のファイルパス
   * @param dryRun - 実際に保存しない（テストモード）
   */
  async saveIndex(index: TagIndex | LegacyIndex, filePath: string, dryRun = false): Promise<void> {
    try {
      // ディレクトリが存在しない場合は作成
      if (!dryRun) {
        await fs.ensureDir(path.dirname(filePath));
        
        // ファイルに保存
        await fs.writeJSON(filePath, index, { spaces: 2 });
        
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
