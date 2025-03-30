import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentId } from "../../../domain/entities/DocumentId.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import type { IJsonDocumentRepository } from "../../../domain/repositories/IJsonDocumentRepository.js";
import type { IIndexService } from "../../../infrastructure/index/index.js";
import { ApplicationError, ApplicationErrorCodes } from "../../../shared/errors/ApplicationError.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import type { IUseCase } from "../../interfaces/IUseCase.js";

/**
 * Input data for delete JSON document use case
 */
export interface DeleteJsonDocumentInput {
  /**
   * Branch name (required for branch documents, omit for global)
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
 * Output data for delete JSON document use case
 */
export interface DeleteJsonDocumentOutput {
  /**
   * Indicates if document was successfully deleted
   */
  success: boolean;

  /**
   * Location where document was deleted from (branch name or "global")
   */
  location: string;

  /**
   * Additional delete operation details
   */
  details: {
    /**
     * Document path or ID that was deleted
     */
    identifier: string;

    /**
     * Deletion timestamp
     */
    timestamp: string;
  };
}

/**
 * Use case for deleting a JSON document
 */
export class DeleteJsonDocumentUseCase
  implements IUseCase<DeleteJsonDocumentInput, DeleteJsonDocumentOutput> {
  /**
   * Constructor
   * @param jsonRepository JSON document repository
   * @param indexService Index service for updating indexes after delete
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
  async execute(input: DeleteJsonDocumentInput): Promise<DeleteJsonDocumentOutput> {
    try {
      if (!input.path && !input.id) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Either document path or ID must be provided'
        );
      }

      const isGlobal = !input.branchName;
      const location = isGlobal ? 'global' : input.branchName!;
      const repository = isGlobal
        ? this.globalRepository || this.jsonRepository
        : this.jsonRepository;

      // Note: Using BranchInfo even for global operations.
      // TODO: Refactor in the future so global operations do not depend on BranchInfo.
      // Currently using 'feature/global' for consistency with WriteJsonDocumentUseCase.
      const branchInfo = isGlobal
        ? BranchInfo.create('feature/global')
        : BranchInfo.create(input.branchName!);

      let success = false;
      const identifier = input.path || input.id || '';

      if (input.id) {
        const documentId = DocumentId.create(input.id);
        const document = await repository.findById(documentId);
        if (!document) {
          throw new DomainError(
            DomainErrorCodes.DOCUMENT_NOT_FOUND,
            `Document with ID "${input.id}" not found in ${isGlobal ? 'global memory bank' : `branch "${input.branchName}"`}`
          );
        }
        success = await repository.delete(branchInfo, documentId);
        await this.indexService.removeFromIndex(branchInfo, documentId);
      } else if (input.path) {
        const documentPath = DocumentPath.create(input.path);
        const documentExists = await repository.exists(branchInfo, documentPath);
        if (!documentExists) {
          throw new DomainError(
            DomainErrorCodes.DOCUMENT_NOT_FOUND,
            `Document "${input.path}" not found in ${isGlobal ? 'global memory bank' : `branch "${input.branchName}"`}`
          );
        }
        success = await repository.delete(branchInfo, documentPath);
        await this.indexService.removeFromIndex(branchInfo, documentPath);
      }

      return {
        success,
        location,
        details: {
          identifier,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to delete JSON document: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
