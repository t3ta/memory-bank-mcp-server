/**
 * ユースケースファクトリー
 * 
 * このファイルでは、アプリケーションで使用するユースケースの
 * インスタンスを作成するファクトリーを定義します。
 * マイグレーション設定に基づいて適切なユースケースを提供します。
 */

import { IBranchMemoryBankRepository } from '../domain/repositories/IBranchMemoryBankRepository';
import { WriteBranchDocumentUseCase } from '../application/usecases/branch/WriteBranchDocumentUseCase';
import { migrationConfig } from '../config/migration-config';

/**
 * ユースケースファクトリー
 */
export class UseCaseFactory {
  /**
   * WriteBranchDocumentUseCaseを作成
   * 
   * マイグレーション設定に基づいて、Markdown書き込み禁止オプションを設定
   * 
   * @param branchRepository ブランチメモリーバンクリポジトリ
   * @returns WriteBranchDocumentUseCaseのインスタンス
   */
  static createWriteBranchDocumentUseCase(
    branchRepository: IBranchMemoryBankRepository
  ): WriteBranchDocumentUseCase {
    return new WriteBranchDocumentUseCase(branchRepository, {
      disableMarkdownWrites: migrationConfig.disableMarkdownWrites
    });
  }
  
  /**
   * その他のユースケースファクトリーメソッド...
   */
}
