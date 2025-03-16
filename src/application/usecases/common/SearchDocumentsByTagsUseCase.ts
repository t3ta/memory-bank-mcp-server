import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../shared/errors/ApplicationError.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';

/**
 * Input data for searching documents by tags
 */
export interface SearchDocumentsByTagsInput {
  /**
   * Tags to search for (at least one required)
   */
  tags: string[];
  
  /**
   * Branch name (optional - if not provided, searches in global memory bank)
   */
  branchName?: string;
  
  /**
   * Whether to require all tags to match (default: false, meaning ANY tag matches)
   */
  matchAllTags?: boolean;
}

/**
 * Output data for searching documents by tags
 */
export interface SearchDocumentsByTagsOutput {
  /**
   * Matching documents
   */
  documents: DocumentDTO[];
  
  /**
   * Information about the search
   */
  searchInfo: {
    /**
     * Number of documents found
     */
    count: number;
    
    /**
     * Tags used for search
     */
    searchedTags: string[];
    
    /**
     * Whether all tags were required to match
     */
    matchedAllTags: boolean;
    
    /**
     * Where the search was performed (branch name or 'global')
     */
    searchLocation: string;
  };
}

/**
 * Use case for searching documents by tags
 */
export class SearchDocumentsByTagsUseCase implements IUseCase<SearchDocumentsByTagsInput, SearchDocumentsByTagsOutput> {
  /**
   * Constructor
   * @param globalRepository Global memory bank repository
   * @param branchRepository Branch memory bank repository
   */
  constructor(
    private readonly globalRepository: IGlobalMemoryBankRepository,
    private readonly branchRepository: IBranchMemoryBankRepository
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: SearchDocumentsByTagsInput): Promise<SearchDocumentsByTagsOutput> {
    try {
      // Validate input
      if (!input.tags || input.tags.length === 0) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'At least one tag must be provided for search'
        );
      }

      // Convert tag strings to Tag domain objects
      const tags = input.tags.map(tag => Tag.create(tag));
      
      // Set default values
      const matchAllTags = input.matchAllTags ?? false;
      const searchLocation = input.branchName ? input.branchName : 'global';
      
      // Perform search in either branch or global memory bank
      let documents = [];
      
      if (input.branchName) {
        // Check if branch exists
        const branchExists = await this.branchRepository.exists(input.branchName);
        
        if (!branchExists) {
          throw new DomainError(
            DomainErrorCodes.BRANCH_NOT_FOUND,
            `Branch "${input.branchName}" not found`
          );
        }
        
        // Create branch info and search in branch
        const branchInfo = BranchInfo.create(input.branchName);
        documents = await this.branchRepository.findDocumentsByTags(branchInfo, tags);
      } else {
        // Search in global memory bank
        documents = await this.globalRepository.findDocumentsByTags(tags);
      }
      
      // Filter documents if matchAllTags is true
      if (matchAllTags && tags.length > 1) {
        documents = documents.filter(doc => {
          // Check if document contains all the search tags
          return tags.every(searchTag => 
            doc.tags.some(docTag => docTag.equals(searchTag))
          );
        });
      }
      
      // Transform to DTOs
      const documentDTOs = documents.map(doc => ({
        path: doc.path.value,
        content: doc.content,
        tags: doc.tags.map(tag => tag.value),
        lastModified: doc.lastModified.toISOString()
      }));
      
      return {
        documents: documentDTOs,
        searchInfo: {
          count: documentDTOs.length,
          searchedTags: input.tags,
          matchedAllTags: matchAllTags,
          searchLocation
        }
      };
    } catch (error) {
      // Re-throw domain and application errors
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }
      
      // Wrap other errors
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to search documents by tags: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
