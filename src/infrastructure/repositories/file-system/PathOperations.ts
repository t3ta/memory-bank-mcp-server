import path from 'node:path';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import type { IConfigProvider } from '../../config/index.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';

/**
 * パス関連操作を担当するコンポーネント
 * パスの正規化、検証、ディレクトリ構造管理などを担当
 */
export class PathOperations extends FileSystemMemoryBankRepositoryBase {
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
   * ドキュメントパスを完全なファイルパスに解決
   * @param documentPath ドキュメントパスまたはその文字列表現
   * @returns 完全なファイルパス
   */
  resolveDocumentPath(documentPath: DocumentPath | string): string {
    // 文字列の場合はDocumentPathに変換
    const docPath = typeof documentPath === 'string' 
      ? documentPath 
      : documentPath.value;

    // パスを正規化
    const normalizedPath = path.normalize(docPath);

    // パストラバーサル攻撃のチェック
    if (normalizedPath.startsWith('..')) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Invalid document path: ${docPath}. Path cannot traverse outside the base directory.`
      );
    }

    // フルパスを解決
    return path.join(this.basePath, normalizedPath);
  }

  /**
   * ディレクトリを再帰的に作成
   * @param directoryPath ディレクトリパス（相対または絶対）
   */
  async ensureDirectoryExists(directoryPath: string): Promise<void> {
    try {
      // パスが相対パスの場合は基底パスと結合
      const fullPath = path.isAbsolute(directoryPath)
        ? directoryPath
        : path.join(this.basePath, directoryPath);

      // ディレクトリを作成
      await this.createDirectory(fullPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to ensure directory exists: ${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * 指定されたディレクトリ内のファイル一覧を取得
   * @param directoryPath ディレクトリパス（相対パス）
   * @param extensions 取得するファイルの拡張子（例：['.json', '.md']）
   * @returns ファイルパスの配列（basePath からの相対パス）
   */
  async listFilesInDirectory(directoryPath: string, extensions?: string[]): Promise<string[]> {
    try {
      // ディレクトリの完全パス
      const fullDirPath = path.join(this.basePath, directoryPath);

      // ディレクトリが存在するか確認
      const exists = await this.directoryExists(fullDirPath);
      if (!exists) {
        return [];
      }

      // ファイル一覧を取得
      const files = await this.listFiles(fullDirPath);

      // 相対パスに変換
      const relativePaths = files.map(file => path.relative(this.basePath, file));

      // 拡張子でフィルタリング（指定がある場合）
      if (extensions && extensions.length > 0) {
        return relativePaths.filter(file => {
          const ext = path.extname(file);
          return extensions.includes(ext);
        });
      }

      return relativePaths;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list files in directory: ${directoryPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * 有効なドキュメントパスを作成
   * @param rawPath 生のパス文字列
   * @returns 検証済みのドキュメントパス
   */
  createValidDocumentPath(rawPath: string): DocumentPath {
    try {
      // パスを正規化
      const normalizedPath = path.normalize(rawPath);

      // パストラバーサル攻撃のチェック
      if (normalizedPath.startsWith('..')) {
        throw new InfrastructureError(
          InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
          `Invalid document path: ${rawPath}. Path cannot traverse outside the base directory.`
        );
      }

      // 基底パスからの相対パスであることを確認
      const fullPath = path.join(this.basePath, normalizedPath);
      if (!fullPath.startsWith(path.resolve(this.basePath))) {
        throw new InfrastructureError(
          InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
          `Invalid document path: ${rawPath}. Path must be relative to the base directory.`
        );
      }

      // DocumentPathを作成
      return DocumentPath.create(normalizedPath);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to create valid document path: ${rawPath}`,
        { originalError: error }
      );
    }
  }

  /**
   * ファイルパスが特定の拡張子を持つか確認
   * @param filePath ファイルパス
   * @param extensions 拡張子の配列（例：['.json', '.md']）
   * @returns いずれかの拡張子に一致する場合はtrue
   */
  hasExtension(filePath: string, extensions: string[]): boolean {
    const ext = path.extname(filePath);
    return extensions.includes(ext);
  }

  /**
   * パスをディレクトリ構造的に分類
   * @param paths パスの配列
   * @returns ディレクトリ構造（ネストされたオブジェクト）
   */
  categorizePaths(paths: string[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const p of paths) {
      // パスをセグメントに分割
      const segments = p.split('/');
      let current = result;

      // 最後のセグメント以外を処理してディレクトリ構造を構築
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        if (!current[segment]) {
          current[segment] = {};
        }
        current = current[segment];
      }

      // 最後のセグメント（ファイル名）を追加
      const fileName = segments[segments.length - 1];
      current[fileName] = p;
    }

    return result;
  }

  /**
   * パスからベース名（拡張子なし）を取得
   * @param filePath ファイルパス
   * @returns 拡張子を除いたファイル名
   */
  getBaseName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * ディレクトリ内のすべてのサブディレクトリを取得
   * @param directoryPath ディレクトリパス（相対パス）
   * @returns サブディレクトリ名の配列
   */
  async getSubdirectories(directoryPath: string): Promise<string[]> {
    try {
      // ディレクトリの完全パス
      const fullDirPath = path.join(this.basePath, directoryPath);

      // ディレクトリが存在するか確認
      const exists = await this.directoryExists(fullDirPath);
      if (!exists) {
        return [];
      }

      // すべてのエントリを取得
      const entries = await this.listFiles(fullDirPath);

      // ディレクトリのみをフィルタリング
      const subdirs: string[] = [];
      for (const entry of entries) {
        if (await this.directoryExists(entry)) {
          // ディレクトリ名のみを抽出（パスではなく）
          subdirs.push(path.basename(entry));
        }
      }

      return subdirs;
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to get subdirectories: ${directoryPath}`,
        { originalError: error }
      );
    }
  }
}
