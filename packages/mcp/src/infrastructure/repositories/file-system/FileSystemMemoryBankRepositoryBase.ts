import path from 'node:path';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IConfigProvider } from '../../config/index.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';

/**
 * 基底クラス: ファイルシステムベースのメモリバンクリポジトリの共通機能を提供
 */
export abstract class FileSystemMemoryBankRepositoryBase {
  /**
   * Constructor
   * @param fileSystemService ファイルシステムサービス
   * @param configProvider 設定プロバイダ
   */
  constructor(
    protected readonly fileSystemService: IFileSystemService,
    protected readonly configProvider: IConfigProvider
  ) {}

  /**
   * ディレクトリが存在するかチェック
   * @param dirPath ディレクトリパス
   * @returns ディレクトリが存在する場合はtrue
   */
  protected async directoryExists(dirPath: string): Promise<boolean> {
    try {
      return await this.fileSystemService.directoryExists(dirPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if directory exists: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ファイルが存在するかチェック
   * @param filePath ファイルパス
   * @returns ファイルが存在する場合はtrue
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      return await this.fileSystemService.fileExists(filePath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if file exists: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ディレクトリを作成
   * @param dirPath ディレクトリパス
   */
  protected async createDirectory(dirPath: string): Promise<void> {
    try {
      await this.fileSystemService.createDirectory(dirPath);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to create directory: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ファイルを書き込む
   * @param filePath ファイルパス
   * @param content ファイル内容
   */
  protected async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // ディレクトリが存在することを確認
      const dirPath = path.dirname(filePath);
      await this.createDirectory(dirPath);

      // ファイルを書き込む
      await this.fileSystemService.writeFile(filePath, content);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to write file: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ファイルを読み込む
   * @param filePath ファイルパス
   * @returns ファイル内容
   */
  protected async readFile(filePath: string): Promise<string> {
    try {
      return await this.fileSystemService.readFile(filePath);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to read file: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ファイルを削除
   * @param filePath ファイルパス
   * @returns 削除に成功したらtrue
   */
  protected async deleteFile(filePath: string): Promise<boolean> {
    try {
      return await this.fileSystemService.deleteFile(filePath);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete file: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ファイルの一覧を取得
   * @param dirPath ディレクトリパス
   * @returns ファイルパスの配列
   */
  protected async listFiles(dirPath: string): Promise<string[]> {
    try {
      return await this.fileSystemService.listFiles(dirPath);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list files: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * ファイルの統計情報を取得
   * @param filePath ファイルパス
   * @returns ファイル統計情報
   */
  protected async getFileStats(filePath: string): Promise<{ lastModified: Date }> {
    try {
      return await this.fileSystemService.getFileStats(filePath);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to get file stats: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * UUIDを生成
   * @returns UUID文字列
   */
  protected generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * パスが有効かどうかチェック（パストラバーサル対策）
   * @param requestedPath パス
   * @param basePath ベースパス
   * @returns 有効なパスの場合はtrue
   */
  protected isValidPath(requestedPath: string, basePath: string): boolean {
    const normalizedPath = path.normalize(requestedPath);
    const resolvedPath = path.resolve(basePath, normalizedPath);
    
    // パスが基底ディレクトリの外にあるかチェック
    return resolvedPath.startsWith(path.resolve(basePath));
  }

  /**
   * エラーをログに記録
   * @param message エラーメッセージ
   * @param error エラーオブジェクト
   */
  protected logError(message: string, error: unknown): void {
    logger.error(message, error);
  }

  /**
   * デバッグ情報をログに記録
   * @param message デバッグメッセージ
   * @param context コンテキスト（オプション）
   */
  protected logDebug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      logger.debug(message, context);
    } else {
      logger.debug(message);
    }
  }
}
