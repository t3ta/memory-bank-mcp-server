import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentId } from "../../../domain/entities/DocumentId.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { JsonDocument, DocumentType } from "../../../domain/entities/JsonDocument.js";
import { DocumentVersionInfo } from "../../../domain/entities/DocumentVersionInfo.js";
import { Tag } from "../../../domain/entities/Tag.js";
import type { IJsonDocumentRepository } from "../../../domain/repositories/IJsonDocumentRepository.js";
import type { IIndexService } from "../../../infrastructure/index/index.js";
import { ApplicationError, ApplicationErrorCodes } from "../../../shared/errors/ApplicationError.js";
import { DomainError } from "../../../shared/errors/DomainError.js";
import type { IUseCase } from "../../interfaces/IUseCase.js";

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
  implements IUseCase<WriteJsonDocumentInput, WriteJsonDocumentOutput> {
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
  ) { }

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: WriteJsonDocumentInput): Promise<WriteJsonDocumentOutput> {
    try {
      this.validateInput(input);

      const isGlobal = !input.branchName;
      const location = isGlobal ? 'global' : input.branchName;
      const repository = isGlobal
        ? this.globalRepository || this.jsonRepository
        : this.jsonRepository;

      // Note: Using BranchInfo even for global operations.
      // TODO: Refactor in the future so global operations do not depend on BranchInfo.
      const branchInfo = isGlobal
        ? BranchInfo.create('feature/global')
        : BranchInfo.create(input.branchName!);

      const documentPath = DocumentPath.create(input.document.path);

      const existingDocument = await repository.findByPath(branchInfo, documentPath);
      const isNew = !existingDocument;

      const documentId = existingDocument
        ? existingDocument.id
        : input.document.id
          ? DocumentId.create(input.document.id)
          : DocumentId.generate();

      const tags = (input.document.tags || []).map((tag) => Tag.create(tag));

      let document: JsonDocument;

      if (isNew) {
        document = JsonDocument.create({
          id: documentId,
          path: documentPath,
          title: input.document.title,
          documentType: input.document.documentType,
          tags,
          content: input.document.content,
        });
      } else {
        document = JsonDocument.create({
          id: documentId,
          path: documentPath,
          title: input.document.title,
          documentType: input.document.documentType,
          tags,
          content: input.document.content,
          versionInfo: new DocumentVersionInfo({
            version: existingDocument.version + 1,
            lastModified: new Date(),
            modifiedBy: 'system'
          }),
        });
      }

      const savedDocument = await repository.save(branchInfo, document);

      await this.indexService.addToIndex(branchInfo, savedDocument);

      return {
        document: {
          id: savedDocument.id.value,
          path: savedDocument.path.value,
          title: savedDocument.title,
          documentType: savedDocument.documentType,
          tags: savedDocument.tags.map((tag) => tag.value),
          content: savedDocument.content,
          lastModified: savedDocument.lastModified.toISOString(),
          createdAt: new Date().toISOString(), // Fallback createdAt
          version: savedDocument.version,
        },
        isNew,
        location: location || '',
      };
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

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
    if (!input.document) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document data is required');
    }

    if (!input.document.path) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document path is required');
    }

    if (!input.document.title) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document title is required');
    }

    if (!input.document.documentType) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Document type is required');
    }

    if (!input.document.content || Object.keys(input.document.content).length === 0) {
      throw new ApplicationError(
        ApplicationErrorCodes.INVALID_INPUT,
        'Document content is required and cannot be empty'
      );
    }

    if (!input.branchName && !this.globalRepository) {
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        'Global repository not provided for global document write'
      );
    }
  }
}
