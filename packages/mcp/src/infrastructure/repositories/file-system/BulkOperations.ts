import path from 'node:path';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import type { IConfigProvider } from '../../config/index.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';
import { DocumentOperations } from './DocumentOperations.js';
import { TagOperations } from './TagOperations.js';
import { PathOperations } from './PathOperations.js';

/**
 * 一括操作を担当するコンポーネント
 * 複数ドキュメントの一括取得・更新・削除などを担当
 */
export class BulkOperations extends FileSystemMemoryBankRepositoryBase {
  private readonly documentOps: DocumentOperations;
  private readonly tagOps: TagOperations;
  private readonly pathOps: PathOperations;

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
    this.documentOps = new DocumentOperations(basePath, fileSystemService, configProvider);
    this.tagOps = new TagOperations(basePath, fileSystemService, configProvider);
    this.pathOps = new PathOperations(basePath, fileSystemService, configProvider);
  }

  /**
   * 複数ドキュメントを一括取得
   * @param paths 取得するドキュメントパスの配列
   * @returns ドキュメントの配列（存在しないものはnullを含む）
   */
  async getDocuments(paths: DocumentPath[]): Promise<(MemoryDocument | null)[]> {
    try {
      this.logDebug(`Bulk getting ${paths.length} documents`);

      // 各ドキュメントを並行取得
      const promises = paths.map(path => this.documentOps.getDocument(path));
      return await Promise.all(promises);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get multiple documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * 複数ドキュメントを一括保存
   * @param documents 保存するドキュメントの配列
   */
  async saveDocuments(documents: MemoryDocument[]): Promise<void> {
    try {
      this.logDebug(`Bulk saving ${documents.length} documents`);

      // 各ドキュメントを並行保存
      const promises = documents.map(doc => this.documentOps.saveDocument(doc));
      await Promise.all(promises);

      // タグインデックスを更新
      await this.tagOps.generateAndSaveTagIndex(documents);
      
      this.logDebug(`Successfully saved ${documents.length} documents`);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save multiple documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * 複数ドキュメントを一括削除
   * @param paths 削除するドキュメントパスの配列
   * @returns 成功したかどうかのブール値の配列
   */
  async deleteDocuments(paths: DocumentPath[]): Promise<boolean[]> {
    try {
      this.logDebug(`Bulk deleting ${paths.length} documents`);

      // 各ドキュメントを並行削除
      const promises = paths.map(path => this.documentOps.deleteDocument(path));
      const results = await Promise.all(promises);

      // 一部でも削除に成功したらタグインデックスを更新
      if (results.some(result => result)) {
        // 残りのドキュメントを取得してタグインデックスを更新
        const allPaths = await this.documentOps.listDocuments();
        const allDocs = await this.getDocuments(
          allPaths.filter(p => !paths.some(deletedPath => 
            deletedPath.value === p.value || deletedPath.toAlternateFormat().value === p.value
          ))
        );
        const validDocs = allDocs.filter((doc): doc is MemoryDocument => doc !== null);
        
        await this.tagOps.generateAndSaveTagIndex(validDocs);
      }
      
      return results;
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete multiple documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * タグでドキュメントを検索
   * @param tags 検索するタグの配列
   * @param matchAll すべてのタグに一致する必要があるか（AND）、いずれかのタグに一致すればよいか（OR）
   * @returns 一致するドキュメントの配列
   */
  async findDocumentsByTags(tags: Tag[], matchAll: boolean = false): Promise<MemoryDocument[]> {
    try {
      this.logDebug(`Finding documents by ${tags.length} tags (matchAll: ${matchAll})`);

      // まずすべてのドキュメントパスを取得
      const allPaths = await this.documentOps.listDocuments();
      
      // タグインデックスを使用してパスをフィルタリング
      const allDocs = await this.getDocuments(allPaths);
      const validDocs = allDocs.filter((doc): doc is MemoryDocument => doc !== null);
      
      // タグインデックスを使用して検索
      const matchingPaths = await this.tagOps.findDocumentPathsByTagsUsingIndex(tags, validDocs, matchAll);
      
      // 一致するパスのドキュメントを取得
      const matchingDocs = await this.getDocuments(matchingPaths);
      
      // nullでないドキュメントのみを返す
      return matchingDocs.filter((doc): doc is MemoryDocument => doc !== null);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * すべてのドキュメントをリスト
   * @returns すべてのドキュメントの配列
   */
  async getAllDocuments(): Promise<MemoryDocument[]> {
    try {
      this.logDebug('Getting all documents');

      // すべてのパスを取得
      const allPaths = await this.documentOps.listDocuments();
      
      // すべてのドキュメントを取得
      const allDocs = await this.getDocuments(allPaths);
      
      // nullでないドキュメントのみを返す
      return allDocs.filter((doc): doc is MemoryDocument => doc !== null);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get all documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
  
  /**
   * 特定のディレクトリ内のすべてのドキュメントを取得
   * @param directoryPath ディレクトリパス
   * @returns ディレクトリ内のドキュメントの配列
   */
  async getDocumentsInDirectory(directoryPath: string): Promise<MemoryDocument[]> {
    try {
      this.logDebug(`Getting documents in directory: ${directoryPath}`);

      // ディレクトリ内のファイルをリスト
      const fileList = await this.pathOps.listFilesInDirectory(directoryPath, ['.json', '.md']);
      
      // ファイルパスをDocumentPathに変換
      const paths = fileList.map(file => DocumentPath.create(file));
      
      // ドキュメントを取得
      const docs = await this.getDocuments(paths);
      
      // nullでないドキュメントのみを返す
      return docs.filter((doc): doc is MemoryDocument => doc !== null);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get documents in directory ${directoryPath}: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
  
  /**
   * タグインデックスを再生成
   * @returns 成功したかどうか
   */
  async rebuildTagIndex(): Promise<boolean> {
    try {
      this.logDebug('Rebuilding tag index');

      // すべてのドキュメントを取得
      const docs = await this.getAllDocuments();
      
      // タグインデックスを生成して保存
      await this.tagOps.generateAndSaveTagIndex(docs);
      
      // レガシーなタグインデックスも更新
      const language = this.configProvider.getLanguage();
      await this.tagOps.updateLegacyTagsIndex(docs, language);
      
      return true;
    } catch (error) {
      this.logError('Failed to rebuild tag index', error);
      return false;
    }
  }
  
  /**
   * ディレクトリ構造が有効かどうか検証
   * @returns 検証結果（成功した場合はtrue）
   */
  async validateStructure(): Promise<boolean> {
    try {
      this.logDebug('Validating structure');

      // 基本的なディレクトリが存在するか確認
      const baseDirExists = await this.directoryExists(this.basePath);
      if (!baseDirExists) {
        this.logDebug(`Base directory does not exist: ${this.basePath}`);
        return false;
      }
      
      // tagsディレクトリが存在するか確認
      const tagsDir = path.join(this.basePath, 'tags');
      const tagsDirExists = await this.directoryExists(tagsDir);
      if (!tagsDirExists) {
        this.logDebug(`Tags directory does not exist: ${tagsDir}`);
        // タグディレクトリがなければ作成
        await this.createDirectory(tagsDir);
      }
      
      return true;
    } catch (error) {
      this.logError('Error validating structure', error);
      return false;
    }
  }
}
