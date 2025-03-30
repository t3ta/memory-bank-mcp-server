import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentId } from '../../../domain/entities/DocumentId.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import type { JsonDocument } from '../../../domain/entities/JsonDocument.js';
import type { IJsonDocumentRepository } from '../../../domain/repositories/IJsonDocumentRepository.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../shared/errors/ApplicationError.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import type { IUseCase } from '../../interfaces/IUseCase.js';


/**
 * Input data for read JSON document use case
 */
export interface ReadJsonDocumentInput {
  /**
   * Branch name (if reading from branch memory bank)
   */
  branchName?: string;

  /**
   * Document path (either path or id must be provided)
   */
  path?: string;

  /**
   * Document ID (either path or id must be provided)
   */
  id?: string;
}

/**
 * Output data for read JSON document use case
 */
export interface ReadJsonDocumentOutput {
  /**
   * Document data
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
    documentType: import('../../../domain/entities/JsonDocument.js').DocumentType;

    /**
     * Document tags
     */
    tags: string[];

    /**
     * Document content (generic record)
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

    /**
     * Branch name (if available)
     */
    branch?: string;
  };

  /**
   * Location where document was found (branch name or "global")
   */
  location: string;
}

/**
 * Use case for reading a JSON document
 */
export class ReadJsonDocumentUseCase
  implements IUseCase<ReadJsonDocumentInput, ReadJsonDocumentOutput> {
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
  async execute(input: ReadJsonDocumentInput): Promise<ReadJsonDocumentOutput> {
    try {
      if (!input.path && !input.id) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Either document path or ID must be provided'
        );
      }

      const isGlobal = !input.branchName;
      let location = isGlobal ? 'global' : input.branchName || 'unknown'; // Changed const to let for reassignment

      let document: JsonDocument | null = null;

      if (input.id) {
        const documentId = DocumentId.create(input.id);

        // Search global repository directly if global search
        if (isGlobal) {
          if (!this.globalRepository) {
            throw new ApplicationError(
              ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
              'Global repository not provided for global document lookup'
            );
          }
          document = await this.globalRepository.findById(documentId);
        } else {
          // Original implementation for branch search
          document = await this.jsonRepository.findById(documentId);

          if (!document && this.globalRepository) {
            document = await this.globalRepository.findById(documentId);
            if (document) {
              location = 'global';
            }
          }
        }
      }
      else if (input.path) {
        const documentPath = DocumentPath.create(input.path);

        if (isGlobal) {
          if (!this.globalRepository) {
            throw new ApplicationError(
              ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
              'Global repository not provided for global document lookup'
            );
          }
          // Changed argument for BranchInfo.create
          const globalBranchInfo = BranchInfo.create('feature/global');
          document = await this.globalRepository.findByPath(globalBranchInfo, documentPath);
        } else {
          const branchInfo = BranchInfo.create(input.branchName!);
          document = await this.jsonRepository.findByPath(branchInfo, documentPath);
        }
      }

      if (!document) {
        const identifier = input.path || input.id;
        const context = isGlobal ? 'global memory bank' : `branch "${input.branchName}"`;
        throw new DomainError(
          DomainErrorCodes.DOCUMENT_NOT_FOUND,
          `Document "${identifier}" not found in ${context}`
        );
      }

      return {
        document: {
          id: document.id.value,
          path: document.path.value,
          title: document.title,
          documentType: document.documentType,
          tags: document.tags.map((tag) => tag.value),
          content: document.content,
          lastModified: document.lastModified.toISOString(),
          createdAt: new Date().toISOString(), // Fallback createdAt
          version: document.version,
          branch: document.branch,
        },
        location,
      };
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to read JSON document: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
