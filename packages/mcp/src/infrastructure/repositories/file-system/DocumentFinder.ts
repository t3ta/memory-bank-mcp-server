import { logger } from "../../../shared/utils/logger.js";
import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import { Tag } from "../../../domain/entities/Tag.js";
import { DocumentLister } from "./DocumentLister.js";
import { DocumentIO } from "./DocumentIO.js";

/**
 * Handles finding documents within a branch, potentially using tags or indices.
 */
export class DocumentFinder {
  private readonly documentLister: DocumentLister;
  private readonly documentIO: DocumentIO;

  /**
   * Constructor
   * @param documentLister Instance for listing documents.
   * @param documentIO Instance for reading document content.
   */
  constructor(documentLister: DocumentLister, documentIO: DocumentIO) {
    this.documentLister = documentLister;
    this.documentIO = documentIO;
    logger.debug(`[DocumentFinder] Initialized`);
  }

  /**
   * Finds documents by tags (currently returns all documents).
   * Migrated from FileSystemBranchMemoryBankRepository.findDocumentsByTags
   * @param branchInfo Branch information
   * @param _tags Tags to search for (currently unused)
   * @returns Promise resolving to array of matching documents
   */
  async findDocumentsByTags(branchInfo: BranchInfo, _tags: Tag[]): Promise<MemoryDocument[]> {
    // TODO: Implement actual tag filtering based on doc.tags and input _tags
    // This likely requires reading and parsing each document via DocumentIO.
    logger.warn('[DocumentFinder] findDocumentsByTags currently returns all documents. Implement tag filtering.');
    const documents: MemoryDocument[] = [];
    const paths = await this.documentLister.listDocuments(branchInfo);
    logger.debug(`[DocumentFinder] Found ${paths.length} documents to check for tags.`);

    for (const docPath of paths) {
      const doc = await this.documentIO.getDocument(branchInfo, docPath);
      if (doc) {
        // Placeholder for tag filtering logic
        // if (tagsMatch(doc.tags, _tags, matchAll)) {
        //   documents.push(doc);
        // }
        documents.push(doc); // Currently adding all found documents
      }
    }
    logger.debug(`[DocumentFinder] Returning ${documents.length} documents (no tag filtering yet).`);
    return documents;
  }

  /**
   * Finds document paths by tags using index (currently falls back).
   * Migrated from FileSystemBranchMemoryBankRepository.findDocumentPathsByTagsUsingIndex
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param _matchAll If true, documents must have all tags (AND), otherwise any tag (OR)
   * @returns Promise resolving to array of document paths
   */
  async findDocumentPathsByTagsUsingIndex(params: {
    branchInfo: BranchInfo;
    tags: Tag[];
    matchAll?: boolean;
  }): Promise<DocumentPath[]> {
    // TODO: Implement index usage for efficiency. Requires TagIndexHandler.
    logger.warn('[DocumentFinder] findDocumentPathsByTagsUsingIndex currently falls back to findDocumentsByTags. Implement index usage.');
    const { branchInfo, tags } = params;
    // Fallback to the less efficient method for now
    const docs = await this.findDocumentsByTags(branchInfo, tags);
    return docs.map(doc => doc.path);
  }
}
