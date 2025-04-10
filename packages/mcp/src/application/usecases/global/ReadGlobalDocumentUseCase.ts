import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { logger } from '../../../shared/utils/logger.js';
import { ReadDocumentUseCase } from '../common/ReadDocumentUseCase.js';

/**
 * Input data for read global document use case
 */
export interface ReadGlobalDocumentInput {
  /**
   * Document path
   */
  path: string;
}

/**
 * Output data for read global document use case
 */
export interface ReadGlobalDocumentOutput {
  /**
   * Document data
   */
  document: DocumentDTO;
}

/**
 * Use case for reading a document from global memory bank
 */
export class ReadGlobalDocumentUseCase
  implements IUseCase<ReadGlobalDocumentInput, ReadGlobalDocumentOutput> {
  private readonly useCaseLogger = logger.withContext({
    component: 'ReadGlobalDocumentUseCase'
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
  async execute(input: ReadGlobalDocumentInput): Promise<ReadGlobalDocumentOutput> {
    this.useCaseLogger.info('Delegating to ReadDocumentUseCase', {
      path: input.path
    });

    // Delegate to the new use case with scope set to 'global'
    return await this.readDocumentUseCase.execute({
      scope: 'global',
      path: input.path
    });
  }
}
