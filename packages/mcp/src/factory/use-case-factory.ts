/**
 * ユースケースファクトリー
 *
 * このファイルでは、アプリケーションで使用するユースケースの
 * インスタンスを作成するファクトリーを定義します。
 */

import { IBranchMemoryBankRepository } from '../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../domain/repositories/IGlobalMemoryBankRepository.js';
import { WriteBranchDocumentUseCase } from '../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '../application/usecases/global/WriteGlobalDocumentUseCase.js';

/**
 * ユースケースファクトリー
 */
export class UseCaseFactory {
  /**
   * WriteBranchDocumentUseCaseを作成
   *
   * @param branchRepository ブランチメモリーバンクリポジトリ
   * @returns WriteBranchDocumentUseCaseのインスタンス
   */
  static createWriteBranchDocumentUseCase(
    branchRepository: IBranchMemoryBankRepository
  ): WriteBranchDocumentUseCase {
    return new WriteBranchDocumentUseCase(branchRepository);
  }

  /**
   * WriteGlobalDocumentUseCaseを作成
   *
   * @param globalRepository グローバルメモリーバンクリポジトリ
   * @returns WriteGlobalDocumentUseCaseのインスタンス
   */
  static createWriteGlobalDocumentUseCase(
    globalRepository: IGlobalMemoryBankRepository
  ): WriteGlobalDocumentUseCase {
    return new WriteGlobalDocumentUseCase(globalRepository);
  }
}
