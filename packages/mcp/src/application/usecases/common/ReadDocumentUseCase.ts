import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { DomainErrors } from '../../../shared/errors/DomainError.js';
import { ApplicationErrors } from '../../../shared/errors/ApplicationError.js';
import { logger } from '../../../shared/utils/logger.js';
import { DocumentRepositorySelector } from '../../services/DocumentRepositorySelector.js';

/**
 * Input data for read document use case
 */
export interface ReadDocumentInput {
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
}

/**
 * Output data for read document use case
 */
export interface ReadDocumentOutput {
  /**
   * Document data
   */
  document: DocumentDTO;
}

/**
 * Use case for reading a document from either branch or global memory bank
 */
export class ReadDocumentUseCase
  implements IUseCase<ReadDocumentInput, ReadDocumentOutput> {
  private readonly useCaseLogger = logger.withContext({
    component: 'ReadDocumentUseCase'
  });

  /**
   * Constructor
   * @param repositorySelector Service to select appropriate repository based on scope
   */
  constructor(
    private readonly repositorySelector: DocumentRepositorySelector
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: ReadDocumentInput): Promise<ReadDocumentOutput> {
    try {
      // Validate input
      this.validateInput(input);

      this.useCaseLogger.info('Executing read document use case', {
        scope: input.scope,
        branch: input.branch,
        path: input.path
      });

      // Get appropriate repository based on scope
      const { repository } = await this.repositorySelector.getRepository(
        input.scope,
        input.branch
      );

      // Create document path
      const documentPath = DocumentPath.create(input.path);

      // Get document from repository
      const document = await repository.getDocument(documentPath);

      if (!document) {
        this.useCaseLogger.warn('Document not found', {
          scope: input.scope,
          branch: input.branch,
          documentPath: input.path
        });
        throw DomainErrors.documentNotFound(
          input.path,
          input.scope === 'branch' && input.branch ? { branchName: input.branch } : undefined
        );
      }

      this.useCaseLogger.debug('Document retrieved successfully', {
        documentPath: input.path,
        scope: input.scope
      });

      // Attempt to parse the content as JSON
      let parsedContent: string | object;
      try {
        parsedContent = JSON.parse(document.content);
        this.useCaseLogger.debug('Successfully parsed document content as JSON', { documentPath: input.path });
      } catch (parseError) {
        // If parsing fails, keep the original string content
        parsedContent = document.content;
        this.useCaseLogger.debug('Failed to parse document content as JSON, returning as string', { documentPath: input.path });
      }

      return {
        document: {
          path: document.path.value,
          content: parsedContent,
          tags: document.tags.map((tag) => tag.value),
          lastModified: document.lastModified.toISOString(),
        },
      };
    } catch (error) {
      // Re-throw domain or application errors directly
      if (error instanceof Error && (error.name === 'DomainError' || error.name === 'ApplicationError')) {
        throw error;
      }

      // Wrap other errors
      this.useCaseLogger.error('Unexpected error in ReadDocumentUseCase', { error });
      throw ApplicationErrors.executionFailed(
        `Failed to read document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validates the input parameters
   * @param input The input parameters to validate
   * @throws ApplicationError if input is invalid
   */
  private validateInput(input: ReadDocumentInput): void {
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

    // Branch name validation is handled by DocumentRepositorySelector
  }
}
