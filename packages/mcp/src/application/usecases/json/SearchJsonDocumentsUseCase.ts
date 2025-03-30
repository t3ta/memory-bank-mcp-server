import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { DocumentType } from "../../../domain/entities/JsonDocument.js";
import { Tag } from "../../../domain/entities/Tag.js";
import type { IJsonDocumentRepository } from "../../../domain/repositories/IJsonDocumentRepository.js";
import { ApplicationError, ApplicationErrorCodes } from "../../../shared/errors/ApplicationError.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import type { IUseCase } from "../../interfaces/IUseCase.js";


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
  implements IUseCase<SearchJsonDocumentsInput, SearchJsonDocumentsOutput> {
  /**
   * Constructor
   * @param jsonRepository JSON document repository
   * @param globalRepository Global JSON document repository (optional)
   */
  constructor(
    private readonly jsonRepository: IJsonDocumentRepository,
    private readonly globalRepository?: IJsonDocumentRepository
  ) { }

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: SearchJsonDocumentsInput): Promise<SearchJsonDocumentsOutput> {
    try {
      if (!input.tags && !input.documentType) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'At least one search criteria (tags or documentType) must be provided'
        );
      }

      const isGlobal = !input.branchName;
      const repository = isGlobal
        ? this.globalRepository || this.jsonRepository
        : this.jsonRepository;
      const location = isGlobal ? 'global' : input.branchName!;

      const branchInfo = isGlobal
        ? BranchInfo.create('feature/global') // Changed: 'global' -> 'feature/global'
        : BranchInfo.create(input.branchName!);

      if (!isGlobal) {
        // Changed: use dummy path for existence check
        const dummyPath = DocumentPath.create('index.json');
        const branchExists = await this.jsonRepository.exists(branchInfo, dummyPath);

        if (!branchExists) {
          throw new DomainError(
            DomainErrorCodes.BRANCH_NOT_FOUND,
            `Branch "${input.branchName}" not found`
          );
        }
      }

      const matchAllTags = input.matchAllTags ?? false;
      let documents: any[] = [];

      if (input.tags && input.tags.length > 0) {
        const tags = input.tags.map((tag) => Tag.create(tag));
        documents = await repository.findByTags(branchInfo, tags, matchAllTags);
      }
      else if (input.documentType) {
        documents = await repository.findByType(branchInfo, input.documentType);
      }

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
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to search JSON documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
