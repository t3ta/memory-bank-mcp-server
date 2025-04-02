/**
 * Use Case Factory
 *
 * This file defines factories for creating instances of use cases
 * used in the application.
 */

// Removed unused import: import { IBranchMemoryBankRepository } from '../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../domain/repositories/IGlobalMemoryBankRepository.js';
// Removed unused import: import { WriteBranchDocumentUseCase } from '../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '../application/usecases/global/WriteGlobalDocumentUseCase.js';

/**
 * Use Case Factory
 */
export class UseCaseFactory {
  // Removed createWriteBranchDocumentUseCase as it's now instantiated directly in providers.ts
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
