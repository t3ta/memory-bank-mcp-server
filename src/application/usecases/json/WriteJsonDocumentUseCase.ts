import { IUseCase } from '../../interfaces/IUseCase.js';
import { IJsonDocumentRepository } from '../../../domain/repositories/IJsonDocumentRepository.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { DocumentId } from '../../../domain/entities/DocumentId.js';
import { JsonDocument, DocumentType } from '../../../domain/entities/JsonDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../shared/errors/ApplicationError.js';
import { IIndexService } from '../../../infrastructure/index/interfaces/IIndexService.js';

/**
 * Input data for write JSON document use case
 */
export interface WriteJsonDocumentInput {
  /**
   * Branch name (required for branch documents, omit for global)
   */
  branchName?: string;

  /**
   * Document data
   */
  document: {
    /**
     * Document ID (optional, will be generated if not provided)
     */
    id?: string;

    /**
     * Document path (required)
     */
    path: string;

    /**
     * Document title
     */
    title: string;

    /**
     * Document type (required)
     */
    documentType: DocumentType;

    /**
     * Document tags (optional)
     */
    tags?: string[];

    /**
     * Document content (required)
     */
    content: Record<string, unknown>;
  };
}

/**
 * Output data for write JSON document use case
 */
export interface WriteJsonDocumentOutput {
  /**
   * Document data after saving
   */
  document: {
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
    documentType: string;

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
  };

  /**
   * Flag indicating if this was a new document (true) or an update (false)
   */
  isNew: boolean;

  /**
   * Location where document was saved (branch name or "global")
   */
  location: string;
}

/**
 * Use case for writing (creating or updating) a JSON document
 */
export class WriteJsonDocumentUseCase
  implements IUseCase<WriteJsonDocumentInput, WriteJsonDocumentOutput>
{
  /**
   * Constructor
   * @param jsonRepository JSON document repository
   * @param indexService Index service for updating indexes after write
   * @param globalRepository Global JSON document repository (optional)
   */
  constructor(
    private readonly jsonRepository: IJsonDocumentRepository,
    private readonly indexService: IIndexService,
    private readonly globalRepository?: IJsonDocumentRepository
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteJsonDocumentInput): Promise<WriteJsonDocumentOutput> {
    try {
      // Validate input
      this.validateInput(input);

      // Determine if saving in branch or global memory bank
      const isGlobal = !input.branchName;
      const location = isGlobal ? 'global' : input.branchName;
      const repository = isGlobal
        ? this.globalRepository || this.jsonRepository
        : this.jsonRepository;

      // Create branch info - BranchInfo validation requires feature/ or fix/ prefix
      const branchInfo = isGlobal
        ? BranchInfo.create('feature/global')  // 変更: 'global' -> 'feature/global'
        : BranchInfo.create(input.branchName!);

      // Create document path
      const documentPath = DocumentPath.create(input.document.path);

      // Check if document already exists
      const existingDocument = await repository.findByPath(branchInfo, documentPath);
      const isNew = !existingDocument;

      // Create document ID (use existing or generate new)
      const documentId = existingDocument
        ? existingDocument.id
        : input.document.id
          ? DocumentId.create(input.document.id)
          : DocumentId.generate();

      // Create tags
      const tags = (input.document.tags || []).map((tag) => Tag.create(tag));

      // Handle document creation or update
      let document: JsonDocument;

      if (isNew) {
        // Create new document
        document = JsonDocument.create({
          id: documentId,
          path: documentPath,
          title: input.document.title,
          documentType: input.document.documentType,
          tags,
          content: input.document.content,
          // Creation and modification dates will be automatically set to now
        });
      } else {
        // Update existing document
        // We'll create a new document but preserve creation date
        document = JsonDocument.create({
          id: documentId,
          path: documentPath,
          title: input.document.title,
          documentType: input.document.documentType,
          tags,
          content: input.document.content,
          createdAt: existingDocument.createdAt,
          version: existingDocument.version + 1,
          // Last modified will be automatically set to now
        });
      }

      // Save document
      const savedDocument = await repository.save(branchInfo, document);

      // Update index
      await this.indexService.addToIndex(branchInfo, savedDocument);

      // Transform to DTO
      return {
        document: {
          id: savedDocument.id.value,
          path: savedDocument.path.value,
          title: savedDocument.title,
          documentType: savedDocument.documentType,
          tags: savedDocument.tags.map((tag) => tag.value),
          content: savedDocument.content,
          lastModified: savedDocument.lastModified.toISOString(),
          createdAt: savedDocument.createdAt.toISOString(),
          version: savedDocument.version,
        },
        isNew,
        location: location || '',
      };
    } catch (error) {
      // Re-throw domain and application errors
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // Wrap other errors
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to write JSON document: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Validate the input data
   * @param input Input data to validate
   * @throws ApplicationError if validation fails
   */
  private validateInput(input: WriteJsonDocumentInput): void {
    // Check if document data is provided
    if (!input.document) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document data is required');
    }

    // Check if document path is provided
    if (!input.document.path) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document path is required');
    }

    // Check if document title is provided
    if (!input.document.title) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document title is required');
    }

    // Check if document type is provided
    if (!input.document.documentType) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document type is required');
    }

    // Check if document content is provided
    if (!input.document.content || Object.keys(input.document.content).length === 0) {
      throw new ApplicationError(
        ApplicationErrorCodes.INVALID_INPUT,
        'Document content is required and cannot be empty'
      );
    }

    // Check global repository for global documents
    if (!input.branchName && !this.globalRepository) {
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        'Global repository not provided for global document write'
      );
    }
  }
}
