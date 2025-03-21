import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger';

/**
 * タグカテゴリ定義の型
 */
export interface TagCategorization {
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
      tags?: string[];
      primaryTags?: string[];
      tagMappings?: Record<string, string>;
    }>;
    tagCategoryMappings: Record<string, string>;
    tagAliases: Record<string, string>;
  };
}

/**
 * メモリドキュメントの型
 */
export interface MemoryDocument {
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
    [key: string]: any;
  };
  content: any;
}

/**
 * タグ更新処理の統計情報
 */
export interface TagProcessingStats {
  processedFiles: number;
  updatedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  tagsUpdated: number;
  tagsAdded: number;
  tagsRemoved: number;
}

/**
 * タグ処理を行うクラス
 */
export class TagProcessor {
  private tagCategorization: TagCategorization | null = null;
  private stats: TagProcessingStats = {
    processedFiles: 0,
    updatedFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
    tagsUpdated: 0,
    tagsAdded: 0,
    tagsRemoved: 0
  };
  
  /**
   * TagProcessorのコンストラクタ
   * @param logger - ロガーインスタンス
   */
  constructor(private logger: Logger) {}
  
  /**
   * タグカテゴリ定義を読み込む
   * @param filePath - タグカテゴリ定義ファイルのパス
   */
  async loadTagCategorization(filePath: string): Promise<void> {
    try {
      this.logger.info(`タグカテゴリ定義を読み込んでいます: ${filePath}`);
      
      if (!await fs.pathExists(filePath)) {
        throw new Error(`タグカテゴリ定義ファイルが見つかりません: ${filePath}`);
      }
      
      this.tagCategorization = await fs.readJSON(filePath) as TagCategorization;
      
      // 基本的な検証
      if (!this.tagCategorization || 
          !this.tagCategorization.content || 
          !this.tagCategorization.content.tagCategoryMappings || 
          !this.tagCategorization.content.tagAliases) {
        throw new Error('タグカテゴリ定義の形式が不正です');
      }
      
      this.logger.info(`タグカテゴリ定義を読み込みました`);
      this.logger.debug(`カテゴリマッピング: ${Object.keys(this.tagCategorization.content.tagCategoryMappings).length}個`);
      this.logger.debug(`タグエイリアス: ${Object.keys(this.tagCategorization.content.tagAliases).length}個`);
    } catch (error) {
      this.logger.error(`タグカテゴリ定義の読み込みに失敗しました: ${error}`);
      throw error;
    }
  }
  
  /**
   * ファイルを処理してタグを更新する
   * @param filePath - 処理対象のファイルパス
   * @param dryRun - 実際に変更を保存しない（テストモード）
   * @returns 更新が行われたかどうか
   */
  async processFile(filePath: string, dryRun = false): Promise<boolean> {
    if (!this.tagCategorization) {
      throw new Error('タグカテゴリ定義が読み込まれていません');
    }
    
    try {
      this.stats.processedFiles++;
      
      // JSONファイルを読み込む
      const document = await fs.readJSON(filePath) as MemoryDocument;
      
      // メモリドキュメントの基本的な検証
      if (!document || !document.metadata || !Array.isArray(document.metadata.tags)) {
        this.logger.warning(`ファイルはメモリドキュメント形式でないかタグがありません: ${filePath}`);
        this.stats.skippedFiles++;
        return false;
      }
      
      // 元のタグを保存
      const originalTags = [...document.metadata.tags];
      
      // タグを更新
      const updatedTags = this.updateTags(document);
      
      // タグに変更があるか確認
      const hasChanges = this.hasTagChanges(originalTags, updatedTags);
      
      if (hasChanges) {
        // 変更内容を記録
        this.recordTagChanges(originalTags, updatedTags);
        
        // メタデータの更新
        document.metadata.tags = updatedTags;
        document.metadata.lastModified = new Date().toISOString();
        
        // ドライランでなければファイルを保存
        if (!dryRun) {
          await fs.writeJSON(filePath, document, { spaces: 2 });
        }
        
        this.logger.debug(`ファイルのタグを更新しました${dryRun ? '（ドライラン）' : ''}: ${filePath}`);
        this.stats.updatedFiles++;
        return true;
      } else {
        this.logger.debug(`タグの変更はありません: ${filePath}`);
        this.stats.skippedFiles++;
        return false;
      }
    } catch (error) {
      this.logger.error(`ファイルの処理に失敗しました: ${filePath} - ${error}`);
      this.stats.failedFiles++;
      return false;
    }
  }
  
  /**
   * ドキュメントのタグを更新する
   * @param document - メモリドキュメント
   * @returns 更新されたタグのリスト
   */
  private updateTags(document: MemoryDocument): string[] {
    const updatedTags: string[] = [];
    
    // 既存のタグをループ
    for (const tag of document.metadata.tags) {
      // エイリアスがある場合は置き換え
      const updatedTag = this.tagCategorization!.content.tagAliases[tag] || tag;
      updatedTags.push(updatedTag);
    }
    
    // 重複を除去
    const uniqueTags = [...new Set(updatedTags)];
    
    // セクションタグを追加（オプション）
    // this.addSectionTags(uniqueTags, document);
    
    return uniqueTags;
  }
  
  /**
   * タグに変更があるかどうかを確認
   * @param originalTags - 元のタグリスト
   * @param updatedTags - 更新後のタグリスト
   * @returns 変更があればtrue
   */
  private hasTagChanges(originalTags: string[], updatedTags: string[]): boolean {
    if (originalTags.length !== updatedTags.length) {
      return true;
    }
    
    // タグをソートして比較
    const sortedOriginal = [...originalTags].sort();
    const sortedUpdated = [...updatedTags].sort();
    
    for (let i = 0; i < sortedOriginal.length; i++) {
      if (sortedOriginal[i] !== sortedUpdated[i]) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * タグの変更を記録する（統計情報の更新）
   * @param originalTags - 元のタグリスト
   * @param updatedTags - 更新後のタグリスト
   */
  private recordTagChanges(originalTags: string[], updatedTags: string[]): void {
    // 元のタグセットと更新後のタグセット
    const originalSet = new Set(originalTags);
    const updatedSet = new Set(updatedTags);
    
    // 追加されたタグ
    const addedTags = updatedTags.filter(tag => !originalSet.has(tag));
    this.stats.tagsAdded += addedTags.length;
    
    // 削除されたタグ
    const removedTags = originalTags.filter(tag => !updatedSet.has(tag));
    this.stats.tagsRemoved += removedTags.length;
    
    // 更新されたタグの総数
    this.stats.tagsUpdated += addedTags.length + removedTags.length;
  }
  
  /**
   * タグ処理の統計情報を取得
   * @returns 統計情報
   */
  getStats(): TagProcessingStats {
    return { ...this.stats };
  }
  
  /**
   * 統計情報をリセット
   */
  resetStats(): void {
    this.stats = {
      processedFiles: 0,
      updatedFiles: 0,
      skippedFiles: 0,
      failedFiles: 0,
      tagsUpdated: 0,
      tagsAdded: 0,
      tagsRemoved: 0
    };
  }
  
  /**
   * タグカテゴリ定義を取得
   * @returns タグカテゴリ定義
   */
  getTagCategorization(): TagCategorization | null {
    return this.tagCategorization;
  }
}
