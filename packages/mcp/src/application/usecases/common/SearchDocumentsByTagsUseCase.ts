import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
// Unused imports removed: Tag, IBranchMemoryBankRepository, IGlobalMemoryBankRepository, DomainError, DomainErrorCodes
import { ApplicationError, ApplicationErrorCodes } from "../../../shared/errors/ApplicationError.js";
import { logger } from "../../../shared/utils/logger.js";
// Import new schema types and necessary infrastructure interfaces
// Use 'any' for now due to persistent import issues
type TagsIndex = any;
type DocumentsMetaIndex = any;
type SearchResultItem = any;
type SearchResults = any;
import type { IFileSystemService } from '../../../infrastructure/storage/interfaces/IFileSystemService.js';
import type { IConfigProvider } from '../../../infrastructure/config/interfaces/IConfigProvider.js';
import type { IUseCase } from "../../interfaces/IUseCase.js";
import path from 'path'; // Import path module


/**
 * Input data for searching documents by tags
 */
export interface SearchDocumentsByTagsInput {
  /**
   * Tags to search for (at least one required)
   */
  tags: string[];

  /**
   * Branch name (required if scope is 'branch' or 'all')
   */
  branchName?: string;

  /**
   * Search scope ('branch', 'global', or 'all')
   * @default 'all'
   */
  scope?: 'branch' | 'global' | 'all';

  /**
   * Match type ('and' or 'or')
   * @default 'or'
   */
  match?: 'and' | 'or';

  /**
   * Path to docs directory (needed to construct index paths)
   */
  docs: string;
}

/**
 * Output data for searching documents by tags
 */
export interface SearchDocumentsByTagsOutput {
  /**
   * Matching documents metadata
   */
  results: SearchResultItem[];
}

/**
 * Use case for searching documents by tags
 */
export class SearchDocumentsByTagsUseCase
  implements IUseCase<SearchDocumentsByTagsInput, SearchDocumentsByTagsOutput> {
  /**
   * Constructor
   * @param globalRepository Global memory bank repository
   * @param branchRepository Branch memory bank repository
   */
  constructor(
    // Remove old repositories, inject new dependencies
    private readonly fileSystemService: IFileSystemService,
    // private readonly configProvider: IConfigProvider // configProvider is used, keep it
    private readonly configProvider: IConfigProvider
  ) { }

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: SearchDocumentsByTagsInput): Promise<SearchResults> {
    logger.info('Executing SearchDocumentsByTagsUseCase:', input);

    // --- Input Validation ---
    if (!input.tags || input.tags.length === 0) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'At least one tag must be provided.');
    }
    if (!input.docs) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Docs path is required.');
    }
    const scope = input.scope ?? 'all';
    const match = input.match ?? 'or';
    if (scope === 'branch' && !input.branchName) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Branch name is required for branch scope search.');
    }
    if (scope === 'all' && !input.branchName) {
      logger.warn('Branch name not provided for "all" scope. Searching global only.');
      // Or potentially throw error depending on desired behavior
    }

    // --- Load Indices ---
    let combinedTagsIndex: TagsIndex = {};
    let combinedDocumentsMeta: DocumentsMetaIndex = {};

    try {
      if (scope === 'global' || scope === 'all') {
        const globalTagsPath = path.join(input.docs, 'global-memory-bank', '.index', 'tags_index.json');
        const globalMetaPath = path.join(input.docs, 'global-memory-bank', '.index', 'documents_meta.json');
        logger.debug(`Loading global indices: ${globalTagsPath}, ${globalMetaPath}`);
        const [globalTags, globalMeta] = await Promise.all([
          this.readIndexFile<TagsIndex>(globalTagsPath),
          this.readIndexFile<DocumentsMetaIndex>(globalMetaPath)
        ]);
        combinedTagsIndex = { ...combinedTagsIndex, ...globalTags };
        combinedDocumentsMeta = { ...combinedDocumentsMeta, ...globalMeta };
        logger.debug(`Loaded ${Object.keys(globalTags || {}).length} global tags, ${Object.keys(globalMeta || {}).length} global meta entries.`);
      }

      if ((scope === 'branch' || scope === 'all') && input.branchName) {
        const branchInfo = BranchInfo.create(input.branchName); // Validate branch name format
        const branchIndexPath = path.join(input.docs, 'branch-memory-bank', branchInfo.safeName, '.index');
        const branchTagsPath = path.join(branchIndexPath, 'tags_index.json');
        const branchMetaPath = path.join(branchIndexPath, 'documents_meta.json');
        logger.debug(`Loading branch indices: ${branchTagsPath}, ${branchMetaPath}`);
        // Note: Branch indices might not exist yet, handle gracefully
        const [branchTags, branchMeta] = await Promise.all([
          this.readIndexFile<TagsIndex>(branchTagsPath).catch(() => null), // Return null if not found
          this.readIndexFile<DocumentsMetaIndex>(branchMetaPath).catch(() => null) // Return null if not found
        ]);
        if (branchTags) combinedTagsIndex = { ...combinedTagsIndex, ...branchTags };
        if (branchMeta) combinedDocumentsMeta = { ...combinedDocumentsMeta, ...branchMeta };
        logger.debug(`Loaded ${Object.keys(branchTags || {}).length} branch tags, ${Object.keys(branchMeta || {}).length} branch meta entries.`);
      }
    } catch (error) {
      logger.error('Error loading index files:', error);
      throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to load index files: ${(error as Error).message}`); // Use appropriate error code
    }


    // --- Perform Search ---
    logger.debug(`Performing search with match type: ${match}`);
    let matchingPaths: Set<string> = new Set();

    if (match === 'or') {
      for (const tag of input.tags) {
        const paths: string[] = combinedTagsIndex[tag] || []; // Explicitly type paths
        paths.forEach(p => matchingPaths.add(p));
      }
      logger.debug(`Found ${matchingPaths.size} paths with OR match.`);
    } else { // 'and' match
      let firstTag = true;
      for (const tag of input.tags) {
        const pathsForTag = new Set<string>(combinedTagsIndex[tag] || []); // Explicitly type Set
        if (firstTag) {
          matchingPaths = pathsForTag;
          firstTag = false;
        } else {
          matchingPaths = new Set([...matchingPaths].filter(p => pathsForTag.has(p)));
        }
        // Early exit if no paths match all tags so far
        if (matchingPaths.size === 0) break;
      }
      logger.debug(`Found ${matchingPaths.size} paths with AND match.`);
    }

    // --- Retrieve Metadata and Format Results ---
    const results: SearchResultItem[] = [];
    for (const docPath of matchingPaths) {
      const meta = combinedDocumentsMeta[docPath];
      if (meta) {
        results.push({
          path: docPath,
          title: meta.title,
          lastModified: meta.lastModified,
          scope: meta.scope,
        });
      } else {
        logger.warn(`Metadata not found for path: ${docPath}`);
        // Optionally include result with missing meta, or skip
        results.push({
          path: docPath,
          title: path.basename(docPath), // Fallback title
          lastModified: new Date(0).toISOString(), // Default date
          scope: docPath.includes('global-memory-bank') ? 'global' : 'branch', // Infer scope
        });
      }
    }

    logger.info(`Search completed. Found ${results.length} documents.`);
    return { results };
  }

  /**
   * Helper to read and parse index JSON file
   */
  private async readIndexFile<T>(filePath: string): Promise<T | null> {
    try {
      const content = await this.fileSystemService.readFile(filePath);
      return JSON.parse(content) as T;
    } catch (error) {
      // If file not found, return null, otherwise rethrow
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.warn(`Index file not found: ${filePath}`);
        return null;
      }
      logger.error(`Failed to read or parse index file ${filePath}:`, error);
      throw error; // Rethrow other errors
    }
  }
}
