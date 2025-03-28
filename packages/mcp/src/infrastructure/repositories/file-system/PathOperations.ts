import path from 'node:path';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import type { IConfigProvider } from '../../config/index.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';

/**
 * パス操作に関連する処理を担当するコンポーネント
 */
export class PathOperations extends FileSystemMemoryBankRepositoryBase {
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
   * ブランチの基本パスを取得する
   * @param branchInfo ブランチ情報
   * @returns ブランチの基本パス
   */
  getBranchBasePath(_branchInfo: BranchInfo): string {
    // branchInfoパラメータは現在使用していませんが、将来的な拡張性のために残しています
    return this.basePath;
  }

  /**
   * グローバルな基本パスを取得する
   * @returns グローバルな基本パス
   */
  getGlobalBasePath(): string {
    return this.basePath;
  }

  /**
   * パスを解決する
   * @param documentPath ドキュメントパス
   * @returns 完全なファイルパス
   */
  resolvePath(documentPath: string): string {
    // パスを正規化
    const normalizedPath = path.normalize(documentPath);

    // パストラバーサル攻撃のチェック
    if (normalizedPath.startsWith('..')) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Invalid document path: ${documentPath}. Path cannot traverse outside the base directory.`
      );
    }

    // フルパスを解決
    return path.join(this.basePath, normalizedPath);
  }

  /**
   * ブランチのパスを解決する
   * @param branchInfo ブランチ情報
   * @param documentPath ドキュメントパス
   * @returns 完全なファイルパス
   */
  resolveBranchPath(branchInfo: BranchInfo, documentPath: string): string {
    const branchBasePath = this.getBranchBasePath(branchInfo);
    return this.resolvePathWithBase(branchBasePath, documentPath);
  }

  /**
   * 指定された基本パスを使用してパスを解決する
   * @param basePath 基本パス
   * @param documentPath ドキュメントパス
   * @returns 完全なファイルパス
   */
  private resolvePathWithBase(basePath: string, documentPath: string): string {
    // パスを正規化
    const normalizedPath = path.normalize(documentPath);

    // パストラバーサル攻撃のチェック
    if (normalizedPath.startsWith('..')) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Invalid document path: ${documentPath}. Path cannot traverse outside the base directory.`
      );
    }

    // フルパスを解決
    return path.join(basePath, normalizedPath);
  }

  /**
   * パスの存在確認
   * @param documentPath ドキュメントパス
   * @returns パスが存在する場合はtrue、それ以外はfalse
   */
  async exists(documentPath: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(documentPath);
      return await this.fileExists(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if path exists: ${documentPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチパスの存在確認
   * @param branchInfo ブランチ情報
   * @param documentPath ドキュメントパス
   * @returns パスが存在する場合はtrue、それ以外はfalse
   */
  async branchPathExists(branchInfo: BranchInfo, documentPath: string): Promise<boolean> {
    try {
      const fullPath = this.resolveBranchPath(branchInfo, documentPath);
      return await this.fileExists(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if branch path exists: ${branchInfo.name}/${documentPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ディレクトリを作成する
   * @param directoryPath ディレクトリパス
   */
  async createDirectory(directoryPath: string): Promise<void> {
    try {
      const fullPath = this.resolvePath(directoryPath);
      await super.createDirectory(fullPath);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to create directory: ${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチディレクトリを作成する
   * @param branchInfo ブランチ情報
   * @param directoryPath ディレクトリパス
   */
  async createBranchDirectory(branchInfo: BranchInfo, directoryPath: string): Promise<void> {
    try {
      const fullPath = this.resolveBranchPath(branchInfo, directoryPath);
      await super.createDirectory(fullPath);
      logger.debug(`Created directory for branch ${branchInfo.name}: ${directoryPath}`);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to create branch directory: ${branchInfo.name}/${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ディレクトリが存在するか確認する
   * @param directoryPath ディレクトリパス
   * @returns ディレクトリが存在する場合はtrue、それ以外はfalse
   */
  async directoryExists(directoryPath: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(directoryPath);
      return await super.directoryExists(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if directory exists: ${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチディレクトリが存在するか確認する
   * @param branchInfo ブランチ情報
   * @param directoryPath ディレクトリパス
   * @returns ディレクトリが存在する場合はtrue、それ以外はfalse
   */
  async branchDirectoryExists(branchInfo: BranchInfo, directoryPath: string): Promise<boolean> {
    try {
      const fullPath = this.resolveBranchPath(branchInfo, directoryPath);
      return await super.directoryExists(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if branch directory exists: ${branchInfo.name}/${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ファイル一覧を取得する
   * @param directoryPath ディレクトリパス
   * @returns ファイルパスの配列
   */
  async listFiles(directoryPath: string): Promise<string[]> {
    try {
      const fullPath = this.resolvePath(directoryPath);
      return await super.listFiles(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list files: ${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチのファイル一覧を取得する
   * @param branchInfo ブランチ情報
   * @param directoryPath ディレクトリパス
   * @returns ファイルパスの配列
   */
  async listBranchFiles(branchInfo: BranchInfo, directoryPath: string): Promise<string[]> {
    try {
      const fullPath = this.resolveBranchPath(branchInfo, directoryPath);
      return await super.listFiles(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list files in branch: ${branchInfo.name}/${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ファイルをコピーする
   * @param sourcePath コピー元のパス
   * @param destinationPath コピー先のパス
   */
  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const sourceFullPath = this.resolvePath(sourcePath);
      const destFullPath = this.resolvePath(destinationPath);

      // コピー元のファイルが存在することを確認
      const exists = await this.fileExists(sourceFullPath);
      if (!exists) {
        throw new InfrastructureError(
          InfrastructureErrorCodes.FILE_NOT_FOUND,
          `Source file not found: ${sourcePath}`
        );
      }

      // ディレクトリが存在することを確認
      const destDir = path.dirname(destFullPath);
      await super.createDirectory(destDir);

      // ファイルの内容を読み取り
      const content = await this.readFile(sourceFullPath);

      // 新しい場所にファイルを書き込み
      await this.writeFile(destFullPath, content);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to copy file from ${sourcePath} to ${destinationPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチ間でファイルをコピーする
   * @param sourceBranchInfo コピー元のブランチ情報
   * @param sourcePath コピー元のパス
   * @param destinationBranchInfo コピー先のブランチ情報
   * @param destinationPath コピー先のパス
   */
  async copyFileBetweenBranches(
    sourceBranchInfo: BranchInfo,
    sourcePath: string,
    destinationBranchInfo: BranchInfo,
    destinationPath: string
  ): Promise<void> {
    try {
      const sourceFullPath = this.resolveBranchPath(sourceBranchInfo, sourcePath);
      const destFullPath = this.resolveBranchPath(destinationBranchInfo, destinationPath);

      // コピー元のファイルが存在することを確認
      const exists = await this.fileExists(sourceFullPath);
      if (!exists) {
        throw new InfrastructureError(
          InfrastructureErrorCodes.FILE_NOT_FOUND,
          `Source file not found in branch ${sourceBranchInfo.name}: ${sourcePath}`
        );
      }

      // ディレクトリが存在することを確認
      const destDir = path.dirname(destFullPath);
      await super.createDirectory(destDir);

      // ファイルの内容を読み取り
      const content = await this.readFile(sourceFullPath);

      // 新しい場所にファイルを書き込み
      await this.writeFile(destFullPath, content);

      logger.debug(
        `Copied file from branch ${sourceBranchInfo.name}/${sourcePath} to ${destinationBranchInfo.name}/${destinationPath}`
      );
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to copy file between branches: ${sourceBranchInfo.name}/${sourcePath} to ${destinationBranchInfo.name}/${destinationPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ファイルを移動する
   * @param sourcePath 移動元のパス
   * @param destinationPath 移動先のパス
   */
  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      // まずファイルをコピー
      await this.copyFile(sourcePath, destinationPath);

      // コピーが成功したら元のファイルを削除
      const sourceFullPath = this.resolvePath(sourcePath);
      await super.deleteFile(sourceFullPath);

      logger.debug(`Moved file from ${sourcePath} to ${destinationPath}`);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to move file from ${sourcePath} to ${destinationPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチ間でファイルを移動する
   * @param sourceBranchInfo 移動元のブランチ情報
   * @param sourcePath 移動元のパス
   * @param destinationBranchInfo 移動先のブランチ情報
   * @param destinationPath 移動先のパス
   */
  async moveFileBetweenBranches(
    sourceBranchInfo: BranchInfo,
    sourcePath: string,
    destinationBranchInfo: BranchInfo,
    destinationPath: string
  ): Promise<void> {
    try {
      // まずファイルをコピー
      await this.copyFileBetweenBranches(
        sourceBranchInfo,
        sourcePath,
        destinationBranchInfo,
        destinationPath
      );

      // コピーが成功したら元のファイルを削除
      const sourceFullPath = this.resolveBranchPath(sourceBranchInfo, sourcePath);
      await super.deleteFile(sourceFullPath);

      logger.debug(
        `Moved file from branch ${sourceBranchInfo.name}/${sourcePath} to ${destinationBranchInfo.name}/${destinationPath}`
      );
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to move file between branches: ${sourceBranchInfo.name}/${sourcePath} to ${destinationBranchInfo.name}/${destinationPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * 指定されたディレクトリ内のファイル一覧を取得する
   * @param directoryPath ディレクトリパス
   * @param allowedExtensions 許可される拡張子の配列（省略時は全ファイル）
   * @returns ファイルパスの配列
   */
  async listFilesInDirectory(directoryPath: string, allowedExtensions: string[] = []): Promise<string[]> {
    try {
      const fullPath = this.resolvePath(directoryPath);
      
      // ディレクトリの存在確認
      const exists = await this.directoryExists(fullPath);
      if (!exists) {
        return [];
      }
      
      // ファイル一覧を取得
      const allFiles = await super.listFiles(fullPath);
      
      // 拡張子フィルタリング
      if (allowedExtensions.length === 0) {
        return allFiles;
      }
      
      return allFiles.filter(file => {
        const ext = path.extname(file);
        return allowedExtensions.includes(ext);
      });
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list files in directory: ${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * DocumentPath配列をフィルタリングする
   * @param paths DocumentPath配列
   * @param pattern フィルターパターン (glob形式)
   * @returns フィルタリングされたDocumentPath配列
   */
  filterPaths(paths: DocumentPath[], pattern: string): DocumentPath[] {
    try {
      // 単純な前方一致・後方一致の処理
      let filtered: DocumentPath[] = paths;

      // 拡張子でフィルタリング
      if (pattern.startsWith('*.')) {
        const extension = pattern.substring(1); // '*.json' -> '.json'
        filtered = paths.filter(p => p.value.endsWith(extension));
      }
      // ディレクトリでフィルタリング
      else if (pattern.endsWith('/*')) {
        const dir = pattern.substring(0, pattern.length - 1); // 'dir/*' -> 'dir/'
        filtered = paths.filter(p => p.value.startsWith(dir));
      }
      // 前方一致
      else if (pattern.endsWith('*')) {
        const prefix = pattern.substring(0, pattern.length - 1); // 'prefix*' -> 'prefix'
        filtered = paths.filter(p => p.value.startsWith(prefix));
      }
      // 後方一致
      else if (pattern.startsWith('*')) {
        const suffix = pattern.substring(1); // '*suffix' -> 'suffix'
        filtered = paths.filter(p => p.value.endsWith(suffix));
      }
      // 完全一致
      else {
        filtered = paths.filter(p => p.value === pattern);
      }

      return filtered;
    } catch (error) {
      logger.error(`Error filtering paths with pattern ${pattern}:`, error);
      return paths;
    }
  }
}
