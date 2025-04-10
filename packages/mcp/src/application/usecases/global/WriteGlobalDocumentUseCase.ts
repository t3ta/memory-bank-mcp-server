import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { WriteDocumentDTO } from '../../dtos/WriteDocumentDTO.js';
import { logger } from '../../../shared/utils/logger.js';
import { WriteDocumentUseCase } from '../common/WriteDocumentUseCase.js';

/**
 * Input data for write global document use case
 */
export interface WriteGlobalDocumentInput {
  /**
   * Document data (path, content, tags)
   * Content is used if patches are not provided.
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
 * Output data for write global document use case
 */
export interface WriteGlobalDocumentOutput {
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
 * Use case for writing a document to global memory bank
 */
export class WriteGlobalDocumentUseCase
  implements IUseCase<WriteGlobalDocumentInput, WriteGlobalDocumentOutput> {
  private readonly componentLogger = logger.withContext({
    component: 'WriteGlobalDocumentUseCase'
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
  async execute(input: WriteGlobalDocumentInput): Promise<WriteGlobalDocumentOutput> {
    this.componentLogger.info('Delegating to WriteDocumentUseCase', {
      path: input.document?.path,
      hasContent: input.document?.content !== undefined && input.document?.content !== null,
      hasPatches: input.patches && Array.isArray(input.patches) && input.patches.length > 0
    });

    // Delegate to the new use case with scope set to 'global'
    return await this.writeDocumentUseCase.execute({
      scope: 'global',
      path: input.document.path,
      content: input.document.content,
      patches: input.patches,
      tags: input.document.tags,
      returnContent: input.returnContent
    });
  }
}
