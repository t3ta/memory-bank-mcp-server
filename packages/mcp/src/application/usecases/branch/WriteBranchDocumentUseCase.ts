import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { WriteDocumentDTO } from '../../dtos/WriteDocumentDTO.js';
import { logger } from '../../../shared/utils/logger.js';
import { WriteDocumentUseCase } from '../common/WriteDocumentUseCase.js';

/**
 * Input data for write branch document use case
 */
export interface WriteBranchDocumentInput {
  /**
   * Branch name
   */
  branchName?: string;

  /**
   * Document data
   */
  document: WriteDocumentDTO;

  /**
   * JSON Patch operations (optional, use instead of document.content)
   */
  patches?: any[];

  /**
   * If true, return the full document content in the output. Defaults to false.
   * @optional
   */
  returnContent?: boolean;
}

/**
 * Output data for write branch document use case
 */
export interface WriteBranchDocumentOutput {
  /**
   * Document data after write.
   * Content and tags are included only if `returnContent` was true in the input.
   */
  document: Omit<DocumentDTO, 'content' | 'tags'> & {
    content?: string;
    tags?: string[];
  };
}

/**
 * Use case for writing a document to branch memory bank
 */
export class WriteBranchDocumentUseCase
  implements IUseCase<WriteBranchDocumentInput, WriteBranchDocumentOutput> {
  private readonly componentLogger = logger.withContext({ 
    component: 'WriteBranchDocumentUseCase' 
  });

  /**
   * Constructor
   * @param writeDocumentUseCase Unified document write use case
   */
  constructor(
    private readonly writeDocumentUseCase: WriteDocumentUseCase
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteBranchDocumentInput): Promise<WriteBranchDocumentOutput> {
    this.componentLogger.info('Delegating to WriteDocumentUseCase', {
      path: input.document?.path,
      branchName: input.branchName,
      hasContent: input.document?.content !== undefined && input.document?.content !== null,
      hasPatches: input.patches && Array.isArray(input.patches) && input.patches.length > 0
    });

    // Delegate to the new use case with scope set to 'branch'
    return await this.writeDocumentUseCase.execute({
      scope: 'branch',
      branch: input.branchName,
      path: input.document.path,
      content: input.document.content,
      patches: input.patches,
      tags: input.document.tags,
      returnContent: input.returnContent
    });
  }
}
