import path from 'node:path';
import { BranchTagIndex, GlobalTagIndex, TagIndex, TAG_INDEX_VERSION } from '@memory-bank/schemas';

import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';
import { FileSystemMemoryDocumentRepository } from './FileSystemMemoryDocumentRepository.js';

/**
 * タグ操作に関連する処理を担当するコンポーネント
 */
export class TagOperations extends FileSystemMemoryBankRepositoryBase {
  // タグインデックスファイル名
  private static readonly GLOBAL_INDEX_FILENAME = '_global_index.json';
  private static readonly BRANCH_INDEX_FILENAME = '_index.json';

  // キャッシュ管理
  private branchIndexCache = new Map<string, { index: BranchTagIndex | TagIndex, lastUpdated: Date }>();
  private globalIndexCache: { index: GlobalTagIndex | TagIndex, lastUpdated: Date } | null = null;
  private readonly CACHE_TTL_MS = 30000; // 30秒キャッシュを保持

  /**
   * コンストラクタ
   * @param basePath 基本パス
   * @param fileSystemService ファイルシステムサービス
   */
  constructor(
    private readonly basePath: string,
    fileSystemService: IFileSystemService
  ) {
    super(fileSystemService);
  }

  /**
   * ドキュメントリポジトリを取得
   * @returns ドキュメントリポジトリ
   */
  private getDocumentRepository(): FileSystemMemoryDocumentRepository {
    return new FileSystemMemoryDocumentRepository(this.basePath, this.fileSystemService);
  }

  /**
   * ブランチインデックスファイルのパスを取得
   * @param branchInfo ブランチ情報
   * @returns インデックスファイルのパス
   */
  private getBranchIndexPath(branchInfo: BranchInfo): string {
    return path.join(this.basePath, TagOperations.BRANCH_INDEX_FILENAME);
  }

  /**
   * グローバルインデックスファイルのパスを取得
   * @returns インデックスファイルのパス
   */
  private getGlobalIndexPath(): string {
    return path.join(this.basePath, TagOperations.GLOBAL_INDEX_FILENAME);
  }

  /**
   * ブランチのタグインデックスを取得
   * @param branchInfo ブランチ情報
   * @returns タグインデックス、存在しない場合はnull
   */
  async getBranchTagIndex(branchInfo: BranchInfo): Promise<BranchTagIndex | TagIndex | null> {
    try {
      const branchKey = branchInfo.safeName;
      const now = new Date();
      
      // キャッシュチェック
      const cachedData = this.branchIndexCache.get(branchKey);
      if (cachedData && (now.getTime() - cachedData.lastUpdated.getTime()) < this.CACHE_TTL_MS) {
        logger.debug(`Using cached branch index for ${branchInfo.name}`);
        return cachedData.index;
      }

      const indexPath = this.getBranchIndexPath(branchInfo);
      logger.debug(`Reading branch index from disk: ${indexPath}`);

      // ファイルが存在するかチェック
      const exists = await this.fileExists(indexPath);
      if (!exists) {
        return null;
      }

      // インデックスファイルを読み込む
      const content = await this.readFile(indexPath);
      const indexData = JSON.parse(content);
      
      // キャッシュに保存
      this.branchIndexCache.set(branchKey, { index: indexData, lastUpdated: now });
      
      return indexData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error(`Invalid JSON in branch tag index file for ${branchInfo.name}`, error);
        return null;
      }

      if (
        error instanceof InfrastructureError &&
        error.code === InfrastructureErrorCodes.FILE_NOT_FOUND
      ) {
        return null;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to read branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * グローバルタグインデックスを取得
   * @returns タグインデックス、存在しない場合はnull
   */
  async getGlobalTagIndex(): Promise<GlobalTagIndex | TagIndex | null> {
    try {
      const now = new Date();
      
      // キャッシュチェック
      if (this.globalIndexCache && (now.getTime() - this.globalIndexCache.lastUpdated.getTime()) < this.CACHE_TTL_MS) {
        logger.debug('Using cached global index');
        return this.globalIndexCache.index;
      }

      const indexPath = this.getGlobalIndexPath();
      logger.debug(`Reading global index from disk: ${indexPath}`);

      // ファイルが存在するかチェック
      const exists = await this.fileExists(indexPath);
      if (!exists) {
        return null;
      }

      // インデックスファイルを読み込む
      const content = await this.readFile(indexPath);
      const indexData = JSON.parse(content);
      
      // キャッシュに保存
      this.globalIndexCache = { index: indexData, lastUpdated: now };
      
      return indexData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error(`Invalid JSON in global tag index file`, error);
        return null;
      }

      if (
        error instanceof InfrastructureError &&
        error.code === InfrastructureErrorCodes.FILE_NOT_FOUND
      ) {
        return null;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to read global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチのタグインデックスを保存
   * @param branchInfo ブランチ情報
   * @param index タグインデックス
   */
  async saveBranchTagIndex(branchInfo: BranchInfo, index: BranchTagIndex | TagIndex): Promise<void> {
    try {
      const indexPath = this.getBranchIndexPath(branchInfo);
      const branchKey = branchInfo.safeName;

      // ディレクトリが存在することを確認
      const dirPath = path.dirname(indexPath);
      await this.createDirectory(dirPath);

      // ファイルを書き込む
      const content = JSON.stringify(index, null, 2);
      await this.writeFile(indexPath, content);
      
      // キャッシュを更新
      this.branchIndexCache.set(branchKey, { index, lastUpdated: new Date() });
      logger.debug(`Updated branch index cache for ${branchInfo.name}`);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to write branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * グローバルタグインデックスを保存
   * @param index タグインデックス
   */
  async saveGlobalTagIndex(index: GlobalTagIndex | TagIndex): Promise<void> {
    try {
      const indexPath = this.getGlobalIndexPath();

      // ディレクトリが存在することを確認
      const dirPath = path.dirname(indexPath);
      await this.createDirectory(dirPath);

      // ファイルを書き込む
      const content = JSON.stringify(index, null, 2);
      await this.writeFile(indexPath, content);
      
      // キャッシュを更新
      this.globalIndexCache = { index, lastUpdated: new Date() };
      logger.debug('Updated global index cache');
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to write global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチのタグインデックスを生成
   * @param branchInfo ブランチ情報
   * @returns 生成されたタグインデックス
   */
  async generateBranchTagIndex(branchInfo: BranchInfo): Promise<BranchTagIndex | TagIndex> {
    try {
      logger.debug(`Generating tag index for branch ${branchInfo.name}`);

      // すべてのドキュメントを取得
      const documentRepository = this.getDocumentRepository();
      const paths = await documentRepository.list();
      const documents: MemoryDocument[] = [];

      for (const docPath of paths) {
        const doc = await documentRepository.findByPath(docPath);
        if (doc) {
          documents.push(doc);
        }
      }

      // タグインデックスを作成
      // v1形式
      const tagIndex: TagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          updatedAt: new Date().toISOString(),
          documentCount: documents.length,
          fullRebuild: true,
          context: 'branch',
        },
        index: {},
      };

      // ドキュメントごとにタグを収集
      for (const doc of documents) {
        for (const tag of doc.tags) {
          if (!tagIndex.index[tag.value]) {
            tagIndex.index[tag.value] = [];
          }
          tagIndex.index[tag.value].push(doc.path.value);
        }
      }

      return tagIndex;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to generate branch tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * グローバルタグインデックスを生成
   * @returns 生成されたタグインデックス
   */
  async generateGlobalTagIndex(): Promise<GlobalTagIndex | TagIndex> {
    try {
      logger.debug('Generating global tag index');

      // すべてのドキュメントを取得
      const documentRepository = this.getDocumentRepository();
      const paths = await documentRepository.list();
      const documents: MemoryDocument[] = [];

      for (const docPath of paths) {
        const doc = await documentRepository.findByPath(docPath);
        if (doc) {
          documents.push(doc);
        }
      }

      // タグインデックスを作成
      // v1形式
      const tagIndex: TagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          updatedAt: new Date().toISOString(),
          documentCount: documents.length,
          fullRebuild: true,
          context: 'global',
        },
        index: {},
      };

      // ドキュメントごとにタグを収集
      for (const doc of documents) {
        for (const tag of doc.tags) {
          if (!tagIndex.index[tag.value]) {
            tagIndex.index[tag.value] = [];
          }
          tagIndex.index[tag.value].push(doc.path.value);
        }
      }

      return tagIndex;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to generate global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * タグを使ってドキュメントを検索
   * @param tags 検索するタグ
   * @param matchAll すべてのタグにマッチする必要があるか (AND検索)
   * @returns マッチしたドキュメントパスの配列
   */
  async findDocumentPathsByTags(tags: Tag[], matchAll: boolean = false): Promise<DocumentPath[]> {
    try {
      logger.debug('Finding documents by tags');

      // インデックスを使用して検索
      const tagIndex = await this.getGlobalTagIndex();
      
      if (!tagIndex) {
        // インデックスがなければ通常のメソッドにフォールバック
        logger.debug('No tag index found, falling back to regular method');
        const documents = await this.findDocumentsByTags(tags, matchAll);
        return documents.map(doc => doc.path);
      }

      let resultPaths: string[] = [];

      if (matchAll) {
        // AND論理 - すべてのタグにマッチする必要がある
        if (tags.length === 0) return [];

        // 最初のタグのドキュメントから開始
        const firstTag = tags[0].value;
        let matchedPaths = tagIndex.index[firstTag] || [];

        // 追加タグごとにフィルタリング
        for (let i = 1; i < tags.length; i++) {
          const tagValue = tags[i].value;
          const tagPaths = tagIndex.index[tagValue] || [];

          // 両方のセットに存在するパスのみを保持
          matchedPaths = matchedPaths.filter(path => tagPaths.includes(path));

          // マッチがなければ早期終了
          if (matchedPaths.length === 0) break;
        }

        resultPaths = matchedPaths;
      } else {
        // OR論理 - いずれかのタグにマッチすればよい
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
      return resultPaths.map(p => DocumentPath.create(p));
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags using index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチでタグを使ってドキュメントを検索
   * @param branchInfo ブランチ情報
   * @param tags 検索するタグ
   * @param matchAll すべてのタグにマッチする必要があるか (AND検索)
   * @returns マッチしたドキュメントパスの配列
   */
  async findBranchDocumentPathsByTags(
    branchInfo: BranchInfo,
    tags: Tag[],
    matchAll: boolean = false
  ): Promise<DocumentPath[]> {
    try {
      logger.debug(`Finding documents by tags in branch ${branchInfo.name}`);

      // インデックスを使用して検索
      const tagIndex = await this.getBranchTagIndex(branchInfo);
      
      if (!tagIndex) {
        // インデックスがなければ通常のメソッドにフォールバック
        logger.debug(`No tag index found for branch ${branchInfo.name}, falling back to regular method`);
        const documents = await this.findBranchDocumentsByTags(branchInfo, tags, matchAll);
        return documents.map(doc => doc.path);
      }

      let resultPaths: string[] = [];

      if (matchAll) {
        // AND論理 - すべてのタグにマッチする必要がある
        if (tags.length === 0) return [];

        // 最初のタグのドキュメントから開始
        const firstTag = tags[0].value;
        let matchedPaths = tagIndex.index[firstTag] || [];

        // 追加タグごとにフィルタリング
        for (let i = 1; i < tags.length; i++) {
          const tagValue = tags[i].value;
          const tagPaths = tagIndex.index[tagValue] || [];

          // 両方のセットに存在するパスのみを保持
          matchedPaths = matchedPaths.filter(path => tagPaths.includes(path));

          // マッチがなければ早期終了
          if (matchedPaths.length === 0) break;
        }

        resultPaths = matchedPaths;
      } else {
        // OR論理 - いずれかのタグにマッチすればよい
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
      return resultPaths.map(p => DocumentPath.create(p));
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags in branch ${branchInfo.name}: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * タグでドキュメントを検索する（インデックスを使わない方法）
   * @param tags 検索するタグ
   * @param matchAll すべてのタグにマッチする必要があるか (AND検索)
   * @returns マッチしたドキュメントの配列
   */
  async findDocumentsByTags(tags: Tag[], matchAll: boolean = false): Promise<MemoryDocument[]> {
    try {
      logger.debug('Finding documents by tags (no index)');

      const documentRepository = this.getDocumentRepository();
      const paths = await documentRepository.list();
      const matchedDocs: MemoryDocument[] = [];

      // すべてのドキュメントを取得して検索
      for (const docPath of paths) {
        const doc = await documentRepository.findByPath(docPath);
        if (!doc) continue;

        let isMatch = false;
        
        if (matchAll) {
          // AND検索 - すべてのタグを持っている必要がある
          isMatch = tags.length > 0 && tags.every(tag => doc.hasTag(tag));
        } else {
          // OR検索 - いずれかのタグがあればOK
          isMatch = tags.length === 0 || tags.some(tag => doc.hasTag(tag));
        }

        if (isMatch) {
          matchedDocs.push(doc);
        }
      }

      return matchedDocs;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチ内でタグでドキュメントを検索する（インデックスを使わない方法）
   * @param branchInfo ブランチ情報
   * @param tags 検索するタグ
   * @param matchAll すべてのタグにマッチする必要があるか (AND検索)
   * @returns マッチしたドキュメントの配列
   */
  async findBranchDocumentsByTags(branchInfo: BranchInfo, tags: Tag[], matchAll: boolean = false): Promise<MemoryDocument[]> {
    try {
      logger.debug(`Finding documents by tags in branch ${branchInfo.name} (no index)`);

      const documentRepository = this.getDocumentRepository();
      const paths = await documentRepository.list();
      const matchedDocs: MemoryDocument[] = [];

      // すべてのドキュメントを取得して検索
      for (const docPath of paths) {
        const doc = await documentRepository.findByPath(docPath);
        if (!doc) continue;

        let isMatch = false;
        
        if (matchAll) {
          // AND検索 - すべてのタグを持っている必要がある
          isMatch = tags.length > 0 && tags.every(tag => doc.hasTag(tag));
        } else {
          // OR検索 - いずれかのタグがあればOK
          isMatch = tags.length === 0 || tags.some(tag => doc.hasTag(tag));
        }

        if (isMatch) {
          matchedDocs.push(doc);
        }
      }

      return matchedDocs;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags in branch ${branchInfo.name}: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * キャッシュを無効化する
   * @param branchInfo ブランチ情報、nullの場合はグローバルキャッシュのみを無効化
   */
  invalidateCache(branchInfo: BranchInfo | null = null): void {
    if (branchInfo) {
      const branchKey = branchInfo.safeName;
      this.branchIndexCache.delete(branchKey);
      logger.debug(`Invalidated branch index cache for ${branchInfo.name}`);
    } else {
      this.globalIndexCache = null;
      logger.debug('Invalidated global index cache');
    }
  }

  /**
   * すべてのキャッシュを無効化する
   */
  invalidateAllCaches(): void {
    this.branchIndexCache.clear();
    this.globalIndexCache = null;
    logger.debug('Invalidated all index caches');
  }
}
