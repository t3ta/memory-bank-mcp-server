import path from 'node:path';
import { BranchTagIndex, GlobalTagIndex, Language, TAG_INDEX_VERSION } from '@memory-bank/schemas';

import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import type { IConfigProvider } from '../../config/index.js';
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
  private branchIndexCache = new Map<string, { index: BranchTagIndex | GlobalTagIndex, lastUpdated: Date }>();
  private globalIndexCache: { index: GlobalTagIndex | TagIndex, lastUpdated: Date } | null = null;
  private readonly CACHE_TTL_MS = 30000; // 30秒キャッシュを保持

  /**
   * コンストラクタ
   * @param basePath 基本パス
   * @param fileSystemService ファイルシステムサービス
   * @param configProvider 設定プロバイダー
   */
  constructor(
    private readonly basePath: string,
    fileSystemService: IFileSystemService,
    protected readonly configProvider: IConfigProvider
  ) {
    super(fileSystemService, configProvider);
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
  private getBranchIndexPath(_branchInfo: BranchInfo): string {
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
  async getBranchTagIndex(branchInfo: BranchInfo): Promise<BranchTagIndex | GlobalTagIndex | null> {
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
  async getGlobalTagIndex(): Promise<GlobalTagIndex | null> {
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
  async saveBranchTagIndex(branchInfo: BranchInfo, index: BranchTagIndex | GlobalTagIndex): Promise<void> {
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
  async saveGlobalTagIndex(index: GlobalTagIndex): Promise<void> {
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
  async generateBranchTagIndex(branchInfo: BranchInfo): Promise<BranchTagIndex> {
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
      const tagIndex: BranchTagIndex = {
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
  async generateGlobalTagIndex(): Promise<GlobalTagIndex> {
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
      const tagIndex: GlobalTagIndex = {
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
   * タグインデックスを使用してドキュメントを検索
   * @param tags 検索するタグ
   * @param documents ドキュメント配列（オプション、指定がない場合はインデックスのみ使用）
   * @param matchAll すべてのタグにマッチする必要があるか（AND検索）
   * @returns マッチしたドキュメントパスの配列
   */
  async findDocumentPathsByTagsUsingIndex(
    tags: Tag[],
    documents?: MemoryDocument[], 
    matchAll: boolean = false
  ): Promise<DocumentPath[]> {
    try {
      this.logDebug(`Finding documents by ${tags.length} tags using index (matchAll: ${matchAll})`);

      // 提供されたドキュメントがある場合は、それらを直接フィルタリング
      if (documents && documents.length > 0) {
        this.logDebug(`Using provided ${documents.length} documents instead of index`);
        
        // ドキュメントを直接フィルタリング
        const matchedDocs = this.filterDocumentsByTags(documents, tags, matchAll);
        return matchedDocs.map(doc => doc.path);
      }
      
      // インデックスを使用して検索
      const tagIndex = await this.getGlobalTagIndex();
      
      if (!tagIndex) {
        // インデックスがなければ通常のメソッドにフォールバック
        this.logDebug('No tag index found, falling back to regular method');
        const foundDocs = await this.findDocumentsByTags(tags, matchAll);
        return foundDocs.map(doc => doc.path);
      }

      // 以下は従来のfindDocumentPathsByTagsの実装と同じ
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
          matchedPaths = matchedPaths.filter((path: string) => tagPaths.includes(path));

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
   * ドキュメント配列をタグでフィルタリングする
   * @param documents フィルタリングするドキュメント配列
   * @param tags 検索するタグ
   * @param matchAll すべてのタグにマッチする必要があるか（AND検索）
   * @returns マッチしたドキュメントの配列
   */
  private filterDocumentsByTags(
    documents: MemoryDocument[],
    tags: Tag[],
    matchAll: boolean = false
  ): MemoryDocument[] {
    // タグがない場合はすべて返す
    if (tags.length === 0) {
      return documents;
    }

    return documents.filter(doc => {
      if (matchAll) {
        // AND検索 - すべてのタグを持っている必要がある
        return tags.every(tag => doc.hasTag(tag));
      } else {
        // OR検索 - いずれかのタグがあればOK
        return tags.some(tag => doc.hasTag(tag));
      }
    });
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
          matchedPaths = matchedPaths.filter((path: string) => tagPaths.includes(path));

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
          matchedPaths = matchedPaths.filter((path: string) => tagPaths.includes(path));

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

  /**
   * タグインデックスを生成して保存する
   * @param documents タグインデックスを生成するためのドキュメント配列
   * @returns 生成したタグインデックス
   */
  async generateAndSaveTagIndex(documents: MemoryDocument[]): Promise<GlobalTagIndex> {
    try {
      this.logDebug(`Generating tag index for ${documents.length} documents`);
      
      // タグインデックスを作成
      const tagIndex: GlobalTagIndex = {
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
      
      // タグインデックスを保存
      await this.saveGlobalTagIndex(tagIndex);
      
      return tagIndex;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to generate and save tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * レガシーなタグインデックスを更新する
   * @param documents ドキュメント配列
   * @param language 言語設定
   */
  async updateLegacyTagsIndex(documents: MemoryDocument[], language: Language): Promise<void> {
    try {
      this.logDebug('Updating legacy tags index');
      
      // tags/index.mdまたはtags/index.jsonのパスを構築
      const indexPath = `tags/index.${language === 'en' ? 'json' : 'md'}`;
      
      // タグごとのドキュメント数をカウント
      const tagCounts: Record<string, number> = {};
      for (const doc of documents) {
        for (const tag of doc.tags) {
          if (!tagCounts[tag.value]) {
            tagCounts[tag.value] = 0;
          }
          tagCounts[tag.value]++;
        }
      }
      
      // タグをアルファベット順にソート
      const sortedTags = Object.keys(tagCounts).sort();
      
      // タグインデックスドキュメントを作成
      const jsonDoc: JsonDocumentV2 = {
        schema: 'memory_document_v2',
        title: language === 'en' ? 'Tags Index' : 'タグインデックス',
        documentType: 'generic',
        path: indexPath,
        tags: ['index', 'meta'],
        lastModified: new Date(),
        createdAt: new Date(),
        version: 1,
        id: 'tags-index',
        sections: [
          {
            title: language === 'en' ? 'Tags List' : 'タグ一覧',
            content: JSON.stringify(sortedTags.map(tag => ({
              name: tag,
              count: tagCounts[tag]
            })))
          }
        ]
      };
      
      // ドキュメントを保存
      const doc = MemoryDocument.fromJSON(jsonDoc, DocumentPath.create(indexPath));
      await new FileSystemMemoryDocumentRepository(this.basePath, this.fileSystemService).save(doc);
      
      this.logDebug('Legacy tags index updated');
    } catch (error) {
      // エラーは記録するが、処理は続行（非クリティカルな操作）
      this.logError('Failed to update legacy tags index', error);
    }
  }
}
