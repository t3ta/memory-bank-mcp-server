import { IUseCase } from '../../interfaces/IUseCase';
import { IJsonDocumentRepository } from '../../../domain/repositories/IJsonDocumentRepository';
import { BranchInfo } from '../../../domain/entities/BranchInfo';
import { DocumentPath } from '../../../domain/entities/DocumentPath';
import { DocumentId } from '../../../domain/entities/DocumentId';
import { JsonDocument } from '../../../domain/entities/JsonDocument';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../shared/errors/ApplicationError';

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
    documentType: import('../../../domain/entities/JsonDocument').DocumentType;

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
  implements IUseCase<ReadJsonDocumentInput, ReadJsonDocumentOutput>
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
  async execute(input: ReadJsonDocumentInput): Promise<ReadJsonDocumentOutput> {
    try {
      // Validate input
      if (!input.path && !input.id) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Either document path or ID must be provided'
        );
      }

      // Determine if searching in branch or global memory bank
      const isGlobal = !input.branchName;
      // letに変更: constからletに変えて再代入可能にする
      let location = isGlobal ? 'global' : input.branchName || 'unknown';

      let document: JsonDocument | null = null;

      // If searching by ID
      if (input.id) {
        const documentId = DocumentId.create(input.id);

        // 修正: グローバル検索の場合はグローバルリポジトリから直接探す
        if (isGlobal) {
          if (!this.globalRepository) {
            throw new ApplicationError(
              ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
              'Global repository not provided for global document lookup'
            );
          }
          document = await this.globalRepository.findById(documentId);
        } else {
          // ブランチ検索の場合は元の実装通り
          document = await this.jsonRepository.findById(documentId);

          if (!document && this.globalRepository) {
            // If not found in branch, try global repository if available
            document = await this.globalRepository.findById(documentId);
            if (document) {
              // Update location if found in global
              location = 'global';
            }
          }
        }
      }
      // If searching by path
      else if (input.path) {
        const documentPath = DocumentPath.create(input.path);

        if (isGlobal) {
          // Global memory bank
          if (!this.globalRepository) {
            throw new ApplicationError(
              ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
              'Global repository not provided for global document lookup'
            );
          }

          // BranchInfo.createの引数を変更
          const globalBranchInfo = BranchInfo.create('feature/global');
          document = await this.globalRepository.findByPath(globalBranchInfo, documentPath);
        } else {
          // Branch memory bank
          const branchInfo = BranchInfo.create(input.branchName!);
          document = await this.jsonRepository.findByPath(branchInfo, documentPath);
        }
      }

      // Check if document exists
      if (!document) {
        const identifier = input.path || input.id;
        const context = isGlobal ? 'global memory bank' : `branch "${input.branchName}"`;
        throw new DomainError(
          DomainErrorCodes.DOCUMENT_NOT_FOUND,
          `Document "${identifier}" not found in ${context}`
        );
      }

      // Transform to DTO
      return {
        document: {
          id: document.id.value,
          path: document.path.value,
          title: document.title,
          documentType: document.documentType,
          tags: document.tags.map((tag) => tag.value),
          content: document.content,
          lastModified: document.lastModified.toISOString(),
          createdAt: document.createdAt.toISOString(),
          version: document.version,
        },
        location,
      };
    } catch (error) {
      // Re-throw domain and application errors
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // Wrap other errors
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to read JSON document: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
