/**
 * Use Case Factory
 *
 * This file defines factories for creating instances of use cases
 * used in the application.
 */

import { IBranchMemoryBankRepository } from '../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../domain/repositories/IGlobalMemoryBankRepository.js';
import { WriteBranchDocumentUseCase } from '../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '../application/usecases/global/WriteGlobalDocumentUseCase.js';

/**
 * Use Case Factory
 */
export class UseCaseFactory {
  /**
   * Create WriteBranchDocumentUseCase
   *
   * @param branchRepository Branch memory bank repository
   * @returns Instance of WriteBranchDocumentUseCase
   */
  static createWriteBranchDocumentUseCase(
    branchRepository: IBranchMemoryBankRepository
  ): WriteBranchDocumentUseCase {
    return new WriteBranchDocumentUseCase(branchRepository);
  }

  /**
   * Create WriteGlobalDocumentUseCase
   *
   * @param globalRepository Global memory bank repository
   * @returns Instance of WriteGlobalDocumentUseCase
   */
  static createWriteGlobalDocumentUseCase(
    globalRepository: IGlobalMemoryBankRepository
  ): WriteGlobalDocumentUseCase {
    return new WriteGlobalDocumentUseCase(globalRepository);
  }
}
