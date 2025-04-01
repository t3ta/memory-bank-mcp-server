import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import type { IJsonDocumentRepository } from "../../../domain/repositories/IJsonDocumentRepository.js";
import type { IIndexService } from "../../../infrastructure/index/index.js";
import { ApplicationError, ApplicationErrorCodes } from "../../../shared/errors/ApplicationError.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";
import type { IUseCase } from "../../interfaces/IUseCase.js";


/**
 * Input data for update JSON index use case
 */
export interface UpdateJsonIndexInput {
  /**
   * Branch name (required for branch index, omit for global)
   */
  branchName?: string;

  /**
   * Whether to perform a full rebuild (default: false)
   */
  fullRebuild?: boolean;
}

/**
 * Output data for update JSON index use case
 */
export interface UpdateJsonIndexOutput {
  /**
   * List of all tags in the index
   */
  tags: string[];

  /**
   * Number of documents in the index
   */
  documentCount: number;

  /**
   * Index update metadata
   */
  updateInfo: {
    /**
     * Location of index (branch name or "global")
     */
    updateLocation: string;

    /**
     * Whether a full rebuild was performed
     */
    fullRebuild: boolean;

    /**
     * Timestamp of update
     */
    timestamp: string;
  };
}

/**
 * Use case for updating JSON document indexes
 */
export class UpdateJsonIndexUseCase
  implements IUseCase<UpdateJsonIndexInput, UpdateJsonIndexOutput> {
  /**
   * Constructor
   * @param jsonRepository JSON document repository
   * @param indexService Index service for updating indexes
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
  async execute(input: UpdateJsonIndexInput): Promise<UpdateJsonIndexOutput> {
    try {
      const isGlobal = !input.branchName;
      const repository = isGlobal
        ? this.globalRepository || this.jsonRepository
        : this.jsonRepository;
      const location = isGlobal ? 'global' : input.branchName!;
      const fullRebuild = input.fullRebuild ?? false;

      const branchInfo = isGlobal
        ? BranchInfo.create('feature/global')
        : BranchInfo.create(input.branchName!);

      if (!isGlobal) {
        const dummyPath = DocumentPath.create('index.json');
        const branchExists = await this.jsonRepository.exists(branchInfo, dummyPath);

        if (!branchExists) {
          throw new DomainError(
            DomainErrorCodes.BRANCH_NOT_FOUND,
            `Branch "${input.branchName}" not found`
          );
        }
      }

      const documents = await repository.listAll(branchInfo);

      if (fullRebuild) {
        await this.indexService.buildIndex(branchInfo, documents);
      } else {
        for (const document of documents) {
          await this.indexService.addToIndex(branchInfo, document);
        }
      }

      const uniqueTags = new Set<string>();
      documents.forEach((doc) => {
        doc.tags.forEach((tag) => uniqueTags.add(tag.value));
      });

      const tags = Array.from(uniqueTags);

      return {
        tags,
        documentCount: documents.length,
        updateInfo: {
          updateLocation: location,
          fullRebuild,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to update JSON index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
