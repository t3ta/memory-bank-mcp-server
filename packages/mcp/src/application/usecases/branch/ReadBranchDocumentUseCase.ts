import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { logger } from '../../../shared/utils/logger.js';
import { ReadDocumentUseCase } from '../common/ReadDocumentUseCase.js';

/**
 * Input data for read branch document use case
 */
export interface ReadBranchDocumentInput {
  /**
   * Branch name (optional, will be detected if not provided)
   */
  branchName?: string;

  /**
   * Document path
   */
  path: string;
}

/**
 * Output data for read branch document use case
 */
export interface ReadBranchDocumentOutput {
  /**
   * Document data
   */
  document: DocumentDTO;
}

/**
 * Use case for reading a document from branch memory bank
 */
export class ReadBranchDocumentUseCase
  implements IUseCase<ReadBranchDocumentInput, ReadBranchDocumentOutput> {
  private readonly useCaseLogger = logger.withContext({
    component: 'ReadBranchDocumentUseCase'
  });

  /**
   * Constructor
   * @param readDocumentUseCase Unified document read use case
   */
  constructor(
    private readonly readDocumentUseCase: ReadDocumentUseCase
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: ReadBranchDocumentInput): Promise<ReadBranchDocumentOutput> {
    this.useCaseLogger.info('Delegating to ReadDocumentUseCase', {
      path: input.path,
      branchName: input.branchName
    });

    // Delegate to the new use case with scope set to 'branch'
    return await this.readDocumentUseCase.execute({
      scope: 'branch',
      branch: input.branchName,
      path: input.path
    });
  }
}
