import path from 'node:path';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';
import { FileSystemMemoryDocumentRepository } from './FileSystemMemoryDocumentRepository.js';

/**
 * ドキュメント操作に関連する処理を担当するコンポーネント
 */
export class DocumentOperations extends FileSystemMemoryBankRepositoryBase {
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
   * ドキュメントを取得する
   * @param path ドキュメントパス
   * @returns 取得したドキュメント、存在しない場合はnull
   */
  async getDocument(path: DocumentPath): Promise<MemoryDocument | null> {
    try {
      const documentRepository = this.getDocumentRepository();
      return await documentRepository.findByPath(path);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get document: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチのドキュメントを取得する
   * @param branchInfo ブランチ情報
   * @param path ドキュメントパス
   * @returns 取得したドキュメント、存在しない場合はnull
   */
  async getBranchDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<MemoryDocument | null> {
    try {
      const documentRepository = this.getDocumentRepository();
      return await documentRepository.findByPath(path);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get document from branch: ${branchInfo.name}, path: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * ドキュメントを保存する
   * @param document 保存するドキュメント
   */
  async saveDocument(document: MemoryDocument): Promise<void> {
    try {
      const documentRepository = this.getDocumentRepository();
      await documentRepository.save(document);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save document: ${document.path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチにドキュメントを保存する
   * @param branchInfo ブランチ情報
   * @param document 保存するドキュメント
   */
  async saveBranchDocument(branchInfo: BranchInfo, document: MemoryDocument): Promise<void> {
    try {
      const documentRepository = this.getDocumentRepository();
      await documentRepository.save(document);
      logger.debug(`Document saved to branch ${branchInfo.name}: ${document.path.value}`);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save document to branch: ${branchInfo.name}, path: ${document.path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * ドキュメントを削除する
   * @param path 削除するドキュメントのパス
   * @returns 削除が成功したかどうか
   */
  async deleteDocument(path: DocumentPath): Promise<boolean> {
    try {
      const documentRepository = this.getDocumentRepository();
      return await documentRepository.delete(path);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete document: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * ブランチのドキュメントを削除する
   * @param branchInfo ブランチ情報
   * @param path 削除するドキュメントのパス
   * @returns 削除が成功したかどうか
   */
  async deleteBranchDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<boolean> {
    try {
      const documentRepository = this.getDocumentRepository();
      const result = await documentRepository.delete(path);
      if (result) {
        logger.debug(`Document deleted from branch ${branchInfo.name}: ${path.value}`);
      }
      return result;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete document from branch: ${branchInfo.name}, path: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * すべてのドキュメントの一覧を取得する
   * @returns ドキュメントパスの配列
   */
  async listDocuments(): Promise<DocumentPath[]> {
    try {
      const documentRepository = this.getDocumentRepository();
      return await documentRepository.list();
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        'Failed to list documents',
        { originalError: error }
      );
    }
  }

  /**
   * ブランチのすべてのドキュメントの一覧を取得する
   * @param branchInfo ブランチ情報
   * @returns ドキュメントパスの配列
   */
  async listBranchDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    try {
      const documentRepository = this.getDocumentRepository();
      const documents = await documentRepository.list();
      logger.debug(`Listed ${documents.length} documents from branch ${branchInfo.name}`);
      return documents;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list documents from branch: ${branchInfo.name}`,
        { originalError: error }
      );
    }
  }
}
