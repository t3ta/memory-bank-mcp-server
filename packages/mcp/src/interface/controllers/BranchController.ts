import { logger } from '../../shared/utils/logger.js';
import { MCPResponsePresenter } from '../presenters/MCPResponsePresenter.js';
import { ReadBranchDocumentUseCase } from '../../application/usecases/branch/ReadBranchDocumentUseCase.js';
import { WriteBranchDocumentUseCase } from '../../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { SearchDocumentsByTagsUseCase } from '../../application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { UpdateTagIndexUseCase } from '../../application/usecases/common/UpdateTagIndexUseCase.js';
import { GetRecentBranchesUseCase } from '../../application/usecases/common/GetRecentBranchesUseCase.js';
import { ReadBranchCoreFilesUseCase } from '../../application/usecases/common/ReadBranchCoreFilesUseCase.js';
import { CreateBranchCoreFilesUseCase } from '../../application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { DomainErrors } from '../../shared/errors/DomainError.js';
import { ApplicationErrors } from '../../shared/errors/ApplicationError.js';
import { BaseError } from '../../shared/errors/BaseError.js';
// import { BranchInfo } from '../../domain/entities/BranchInfo.js'; // Removed unused import

/**
 * ブランチ関連のコントローラー
 */
export class BranchController {
  private readonly componentLogger = logger.withContext({ component: 'BranchController' });

  constructor(
    private readonly readBranchDocumentUseCase: ReadBranchDocumentUseCase,
    private readonly writeBranchDocumentUseCase: WriteBranchDocumentUseCase,
    private readonly searchDocumentsByTagsUseCase: SearchDocumentsByTagsUseCase,
    private readonly updateTagIndexUseCase: UpdateTagIndexUseCase,
    private readonly getRecentBranchesUseCase: GetRecentBranchesUseCase,
    private readonly readBranchCoreFilesUseCase: ReadBranchCoreFilesUseCase,
    private readonly createBranchCoreFilesUseCase: CreateBranchCoreFilesUseCase,
    private readonly presenter: MCPResponsePresenter,
  ) {}

  /**
   * ブランチドキュメントを読み取る
   */
  async readDocument(branchName: string, path: string) {
    try {
      this.componentLogger.info('Reading branch document', { branchName, path });
      const document = await this.readBranchDocumentUseCase.execute({
        branchName,
        path,
      });

      return this.presenter.presentSuccess(document);
    } catch (error) {
      this.componentLogger.error('Failed to read branch document', { branchName, path, error });
      return this.handleError(error);
    }
  }

  /**
   * ブランチドキュメントを書き込む
   */
 async writeDocument(branchName: string, path: string, content: any) {
   try {
     this.componentLogger.info('Writing branch document', { branchName, path });
     await this.writeBranchDocumentUseCase.execute({
       branchName,
       document: { // Nest path and content within document object
         path: path,
         content: content,
         // tags are not passed from this controller method, use default [] if needed by use case
       }
     });

     return this.presenter.presentSuccess({ message: 'Document written successfully' });
    } catch (error) {
      this.componentLogger.error('Failed to write branch document', { branchName, path, error });
      return this.handleError(error);
    }
  }

  /**
   * ブランチのコアファイルを読み取る
   */
  async readCoreFiles(branchName: string) {
    try {
      this.componentLogger.info('Reading branch core files', { branchName });
      const result = await this.readBranchCoreFilesUseCase.execute({ branchName });
      return this.presenter.presentSuccess(result);
    } catch (error) {
      this.componentLogger.error('Failed to read branch core files', { branchName, error });
      return this.handleError(error);
    }
  }

  /**
   * ブランチのコアファイルを作成する
   */
  async createCoreFiles(branchName: string, files: Record<string, any>) {
    try {
      this.validateFiles(files);
      this.componentLogger.info('Creating branch core files', { branchName });

      // Pass branchName instead of branchInfo
      await this.createBranchCoreFilesUseCase.execute({
        branchName: branchName, // Use branchName from method argument
        files,
      });

      return this.presenter.presentSuccess({ message: 'Core files created successfully' });
    } catch (error) {
      this.componentLogger.error('Failed to create branch core files', { branchName, error });
      return this.handleError(error);
    }
  }

  /**
   * タグでドキュメントを検索する
   */
  async searchByTags(tags: string[]) {
    try {
      this.componentLogger.info('Searching documents by tags', { tags });
      const documents = await this.searchDocumentsByTagsUseCase.execute({ tags });
      return this.presenter.presentSuccess(documents);
    } catch (error) {
      this.componentLogger.error('Failed to search documents by tags', { tags, error });
      return this.handleError(error);
    }
  }

  /**
   * タグインデックスを更新する
   */
  async updateTagIndex(branchName: string) { // Add branchName parameter
    try {
      this.componentLogger.info('Updating tag index', { branchName }); // Log branchName
      await this.updateTagIndexUseCase.execute({ branchName }); // Pass branchName
      return this.presenter.presentSuccess({ message: 'Tag index updated successfully' });
    } catch (error) {
      this.componentLogger.error('Failed to update tag index', { error });
      return this.handleError(error);
    }
  }

  /**
   * 最近のブランチを取得する
   */
  async getRecentBranches() {
    try {
      this.componentLogger.info('Getting recent branches');
      const branches = await this.getRecentBranchesUseCase.execute({}); // Pass empty object
      return this.presenter.presentSuccess(branches);
    } catch (error) {
      this.componentLogger.error('Failed to get recent branches', { error });
      return this.handleError(error);
    }
  }

  /**
   * ファイルの検証を行う
   */
  private validateFiles(files: any): void {
    if (!files || typeof files !== 'object') {
      throw DomainErrors.validationError('Files must be provided as an object');
    }
  }

  /**
   * エラー処理
   */
  private handleError(error: unknown) {
    if (error instanceof BaseError) {
      return this.presenter.presentError(error);
    }

    // 未知のエラーの場合は、ApplicationErrorに変換
    const applicationError = ApplicationErrors.unexpectedControllerError(
      'BranchController',
      error instanceof Error ? error : undefined
    );
    return this.presenter.presentError(applicationError);
  }
}
