import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { ApplicationErrors } from '../../../shared/errors/ApplicationError.js';
import { logger } from '../../../shared/utils/logger.js';
import { DocumentRepositorySelector } from '../../services/DocumentRepositorySelector.js';
import { DocumentWriterService, DocumentWriterInput } from '../../services/DocumentWriterService.js';

/**
 * Input data for write document use case
 */
export interface WriteDocumentInput {
  /**
   * Scope of the memory bank ('branch' or 'global')
   */
  scope: 'branch' | 'global';

  /**
   * Branch name (required for branch scope in non-project mode)
   */
  branch?: string;

  /**
   * Document path
   */
  path: string;

  /**
   * Path to the docs directory (optional in project mode)
   */
  docs?: string;

  /**
   * Document content (mutually exclusive with patches)
   */
  content?: string | Record<string, unknown>;

  /**
   * JSON Patch operations (mutually exclusive with content)
   */
  patches?: any[];

  /**
   * Document tags
   */
  tags?: string[];

  /**
   * If true, return the document content in the response
   */
  returnContent?: boolean;
}

/**
 * Output data for write document use case
 */
export interface WriteDocumentOutput {
  /**
   * Document data after write.
   * Content and tags are included only if returnContent was true in the input.
   */
  document: Omit<DocumentDTO, 'content' | 'tags'> & {
    content?: string;
    tags?: string[];
  };
}

/**
 * Use case for writing a document to either branch or global memory bank
 */
export class WriteDocumentUseCase
  implements IUseCase<WriteDocumentInput, WriteDocumentOutput> {
  private readonly useCaseLogger = logger.withContext({
    component: 'WriteDocumentUseCase'
  });

  /**
   * Constructor
   * @param repositorySelector Service to select appropriate repository based on scope
   * @param documentWriterService Service for document writing and patching
   */
  constructor(
    private readonly repositorySelector: DocumentRepositorySelector,
    private readonly documentWriterService: DocumentWriterService
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteDocumentInput): Promise<WriteDocumentOutput> {
    try {
      // Validate input
      this.validateInput(input);

      this.useCaseLogger.info('Executing write document use case', {
        scope: input.scope,
        branch: input.branch,
        path: input.path,
        hasContent: input.content !== undefined && input.content !== null,
        hasPatches: input.patches && Array.isArray(input.patches) && input.patches.length > 0
      });

      // Get appropriate repository based on scope
      const { repository } = await this.repositorySelector.getRepository(
        input.scope,
        input.branch
      );

      // Create document path
      const documentPath = DocumentPath.create(input.path);

      // Prepare tags
      const tags = (input.tags ?? []).map(tag => Tag.create(tag));

      // Prepare input for DocumentWriterService
      const writerInput: DocumentWriterInput = {
        path: documentPath,
        content: input.content,
        patches: input.patches,
        tags
      };

      // Use DocumentWriterService to handle the write operation
      const savedDocument = await this.documentWriterService.write(repository, writerInput);

      // Prepare return data based on returnContent flag
      const shouldReturnContent = input.returnContent === true;
      const outputDocument: WriteDocumentOutput['document'] = {
        path: savedDocument.path.value,
        lastModified: savedDocument.lastModified.toISOString(),
        ...(shouldReturnContent && {
          content: savedDocument.content,
          tags: savedDocument.tags.map(tag => tag.value)
        })
      };

      return {
        document: outputDocument
      };
    } catch (error) {
      // Re-throw domain or application errors directly
      if (error instanceof Error && (error.name === 'DomainError' || error.name === 'ApplicationError')) {
        throw error;
      }

      // Wrap other errors
      this.useCaseLogger.error('Unexpected error in WriteDocumentUseCase', { error });
      throw ApplicationErrors.executionFailed(
        `Failed to write document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validates the input parameters
   * @param input The input parameters to validate
   * @throws ApplicationError if input is invalid
   */
  private validateInput(input: WriteDocumentInput): void {
    // Validate scope
    if (input.scope !== 'branch' && input.scope !== 'global') {
      throw ApplicationErrors.invalidInput(
        `Invalid scope: ${input.scope}. Must be 'branch' or 'global'.`
      );
    }

    // Validate path
    if (!input.path) {
      throw ApplicationErrors.invalidInput('Document path is required');
    }

    // Validate content and patches (mutually exclusive)
    const hasContent = input.content !== undefined && input.content !== null;
    const hasPatches = input.patches && Array.isArray(input.patches) && input.patches.length > 0;

    if (!hasContent && !hasPatches) {
      throw ApplicationErrors.invalidInput('Either document content or patches must be provided');
    }
    
    if (hasContent && hasPatches) {
      throw ApplicationErrors.invalidInput('Cannot provide both document content and patches simultaneously');
    }

    // Branch name validation is handled by DocumentRepositorySelector
  }
}
