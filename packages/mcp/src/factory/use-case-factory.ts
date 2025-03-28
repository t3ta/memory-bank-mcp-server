/**
 * ユースケースファクトリー
 *
 * このファイルでは、アプリケーションで使用するユースケースの
 * インスタンスを作成するファクトリーを定義します。
 * マイグレーション設定に基づいて適切なユースケースを提供します。
 */

import { IBranchMemoryBankRepository } from '../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../domain/repositories/IGlobalMemoryBankRepository.js';
import { WriteBranchDocumentUseCase } from '../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '../application/usecases/global/WriteGlobalDocumentUseCase.js';
import { Constants } from '../main/config/constants.js';

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
      disableMarkdownWrites: Constants.MIGRATION.disableMarkdownWrites
    });
  }

  /**
   * WriteGlobalDocumentUseCaseを作成
   *
   * マイグレーション設定に基づいて、Markdown書き込み禁止オプションを設定
   *
   * @param globalRepository グローバルメモリーバンクリポジトリ
   * @returns WriteGlobalDocumentUseCaseのインスタンス
   */
  static createWriteGlobalDocumentUseCase(
    globalRepository: IGlobalMemoryBankRepository
  ): WriteGlobalDocumentUseCase {
    return new WriteGlobalDocumentUseCase(globalRepository, {
      disableMarkdownWrites: Constants.MIGRATION.disableMarkdownWrites
    });
  }
}
