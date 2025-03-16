import { IUseCase } from '../../interfaces/IUseCase.js';
import { IJsonDocumentRepository } from '../../../domain/repositories/IJsonDocumentRepository.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { DocumentType } from '../../../domain/entities/JsonDocument.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../shared/errors/ApplicationError.js';

/**
 * Input data for search JSON documents use case
 */
export interface SearchJsonDocumentsInput {
  /**
   * Branch name (required for branch documents, omit for global)
   */
  branchName?: string;

  /**
   * Tags to search for (optional)
   */
  tags?: string[];

  /**
   * Document type to search for (optional)
   */
  documentType?: DocumentType;

  /**
   * Whether all tags must match (default: false)
   */
  matchAllTags?: boolean;
}

/**
 * Output data for search JSON documents use case
 */
export interface SearchJsonDocumentsOutput {
  /**
   * Found documents
   */
  documents: Array<{
    /**
     * Document ID
     */
    id: string;

    /**
     * Document path
     */
    path: string;

    /**
     * Document title
     */
    title: string;

    /**
     * Document type
     */
    documentType: DocumentType;

    /**
     * Document tags
     */
    tags: string[];

    /**
     * Document content
     */
    content: Record<string, unknown>;

    /**
     * Last modified date (ISO string)
     */
    lastModified: string;

    /**
     * Created date (ISO string)
     */
    createdAt: string;

    /**
     * Document version
     */
    version: number;
  }>;

  /**
   * Search metadata
   */
  searchInfo: {
    /**
     * Number of documents found
     */
    count: number;

    /**
     * Location of search (branch name or "global")
     */
    searchLocation: string;

    /**
     * Tags used for search (if applicable)
     */
    searchedTags?: string[];

    /**
     * Document type used for search (if applicable)
     */
    searchedDocumentType?: string;

    /**
     * Whether all tags matched (if applicable)
     */
    matchedAllTags?: boolean;
  };
}

/**
 * Use case for searching JSON documents
 */
export class SearchJsonDocumentsUseCase
  implements IUseCase<SearchJsonDocumentsInput, SearchJsonDocumentsOutput>
{
  /**
   * Constructor
   * @param jsonRepository JSON document repository
   * @param globalRepository Global JSON document repository (optional)
   */
  constructor(
    private readonly jsonRepository: IJsonDocumentRepository,
    private readonly globalRepository?: IJsonDocumentRepository
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: SearchJsonDocumentsInput): Promise<SearchJsonDocumentsOutput> {
    try {
      // Validate input - at least one search criteria must be provided
      if (!input.tags && !input.documentType) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'At least one search criteria (tags or documentType) must be provided'
        );
      }

      // Determine if searching in branch or global memory bank
      const isGlobal = !input.branchName;
      const repository = isGlobal
        ? this.globalRepository || this.jsonRepository
        : this.jsonRepository;
      const location = isGlobal ? 'global' : input.branchName!;

      // Create branch info
      const branchInfo = isGlobal
        ? BranchInfo.create('feature/global')  // 変更: 'global' -> 'feature/global'
        : BranchInfo.create(input.branchName!);

      // Check if branch exists for branch searches
      if (!isGlobal) {
        // 変更: dummy pathを使用
        const dummyPath = DocumentPath.create('index.json');
        const branchExists = await this.jsonRepository.exists(
          branchInfo,
          dummyPath
        );

        if (!branchExists) {
          throw new DomainError(
            DomainErrorCodes.BRANCH_NOT_FOUND,
            `Branch "${input.branchName}" not found`
          );
        }
      }

      // Set up search parameters
      const matchAllTags = input.matchAllTags ?? false;
      let documents: any[] = [];

      // Tag-based search
      if (input.tags && input.tags.length > 0) {
        // Create Tag domain objects
        const tags = input.tags.map((tag) => Tag.create(tag));

        // Find documents by tags
        documents = await repository.findByTags(branchInfo, tags, matchAllTags);
      }
      // Document type search
      else if (input.documentType) {
        // Find documents by type
        documents = await repository.findByType(branchInfo, input.documentType);
      }

      // Transform to DTOs
      const documentDTOs = documents.map((doc) => ({
        id: doc.id.value,
        path: doc.path.value,
        title: doc.title,
        documentType: doc.documentType,
        tags: doc.tags.map((tag: { value: string }) => tag.value),
        content: doc.content,
        lastModified: doc.lastModified.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        version: doc.version,
      }));

      // Return result
      return {
        documents: documentDTOs,
        searchInfo: {
          count: documentDTOs.length,
          searchLocation: location,
          searchedTags: input.tags,
          searchedDocumentType: input.documentType,
          matchedAllTags: input.tags ? matchAllTags : undefined,
        },
      };
    } catch (error) {
      // Re-throw domain and application errors
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // Wrap other errors
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to search JSON documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
