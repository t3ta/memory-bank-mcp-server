import { IUseCase } from '../../interfaces/IUseCase.js';
import { IJsonDocumentRepository } from '../../../domain/repositories/IJsonDocumentRepository.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../shared/errors/ApplicationError.js';
import { IIndexService } from '../../../infrastructure/index/interfaces/IIndexService.js';

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
  implements IUseCase<UpdateJsonIndexInput, UpdateJsonIndexOutput>
{
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
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: UpdateJsonIndexInput): Promise<UpdateJsonIndexOutput> {
    try {
      // Determine if updating branch or global index
      const isGlobal = !input.branchName;
      const repository = isGlobal
        ? this.globalRepository || this.jsonRepository
        : this.jsonRepository;
      const location = isGlobal ? 'global' : input.branchName!;
      const fullRebuild = input.fullRebuild ?? false;

      // Create branch info - use feature/global for global operations to pass BranchInfo validation
      const branchInfo = isGlobal
        ? BranchInfo.create('feature/global')
        : BranchInfo.create(input.branchName!);

      // Check if branch exists for branch index updates
      if (!isGlobal) {
        // Create a dummy path to check if branch exists
        const dummyPath = DocumentPath.create('index.json');
        const branchExists = await this.jsonRepository.exists(branchInfo, dummyPath);

        if (!branchExists) {
          throw new DomainError(
            DomainErrorCodes.BRANCH_NOT_FOUND,
            `Branch "${input.branchName}" not found`
          );
        }
      }

      // List all documents
      const documents = await repository.listAll(branchInfo);

      // Update index
      if (fullRebuild) {
        // Full rebuild
        await this.indexService.buildIndex(branchInfo, documents);
      } else {
        // Incremental update - update each document in index
        for (const document of documents) {
          await this.indexService.addToIndex(branchInfo, document);
        }
      }

      // Get index stats
      // We need to extract tags from the documents since getIndex method isn't available
      const uniqueTags = new Set<string>();
      documents.forEach(doc => {
        doc.tags.forEach(tag => uniqueTags.add(tag.value));
      });
      
      const tags = Array.from(uniqueTags);

      // Return result
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
      // Re-throw domain and application errors
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // Wrap other errors
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to update JSON index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
