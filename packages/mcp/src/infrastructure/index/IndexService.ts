import path from 'node:path';

import { BranchInfo } from '../../domain/entities/BranchInfo.js';
import { DocumentId } from '../../domain/entities/DocumentId.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { JsonDocument, DocumentType } from '../../domain/entities/JsonDocument.js';
import { Tag } from '../../domain/entities/Tag.js';
import { IFileSystemService } from '../storage/interfaces/IFileSystemService.js';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from '../../shared/errors/InfrastructureError.js';
import { IIndexService } from './interfaces/IIndexService.js';
import {
  DocumentReference,
  TAG_INDEX_VERSION as INDEX_SCHEMA_VERSION,
} from '@memory-bank/schemas';

// このファイル内で使う DocumentReference の型定義
interface InternalDocumentReference {
  id: string;
  path: string;
  documentType: DocumentType; // ← これが必要だった
  title: string;
  lastModified: Date; // ★ IIndexService との互換性のために追加
}

// このファイル内で使う DocumentIndex の型定義
interface InternalDocumentIndex {
  schema: string;
  lastUpdated: Date;
  branchName: string;
  idIndex: Record<string, InternalDocumentReference>; // ← InternalDocumentReference を使う
  pathIndex: Record<string, string>; // path to id mapping
  typeIndex: Record<string, string[]>; // documentType to id[] mapping
  tagIndex: Record<string, string[]>; // tag to id[] mapping
}

/**
 * Implementation of the document index service
 * Provides efficient lookup capabilities for documents using in-memory indices
 * with file system persistence
 */
export class IndexService implements IIndexService {
  // In-memory indices per branch
  private indices: Map<string, InternalDocumentIndex> = new Map(); // ★ DocumentIndex -> InternalDocumentIndex

  /**
   * Create a new IndexService
   * @param fileSystemService File system service for file operations
   * @param rootPath Root path for storing index files
   */
  constructor(
    private readonly fileSystemService: IFileSystemService,
    private readonly rootPath: string
  ) { }

  /**
   * Initialize the index for a branch
   * @param branchInfo Branch information
   */
  public async initializeIndex(branchInfo: BranchInfo): Promise<void> {
    // First try to load existing index
    try {
      await this.loadIndex(branchInfo);
    } catch (error) {
      // If loading fails, create a new empty index
      const newIndex: InternalDocumentIndex = { // ★ DocumentIndex -> InternalDocumentIndex
        schema: INDEX_SCHEMA_VERSION,
        lastUpdated: new Date(),
        branchName: branchInfo.name,
        idIndex: {},
        pathIndex: {},
        typeIndex: {} as Record<string, string[]>,
        tagIndex: {},
      };

      this.indices.set(branchInfo.name, newIndex);

      // Save the new index
      await this.saveIndex(branchInfo);
    }
  }

  /**
   * Build the index from a collection of documents
   * @param branchInfo Branch information
   * @param documents Documents to index
   */
  public async buildIndex(branchInfo: BranchInfo, documents: JsonDocument[]): Promise<void> {
    // Create a fresh index
    const newIndex: InternalDocumentIndex = { // ★ DocumentIndex -> InternalDocumentIndex
      schema: INDEX_SCHEMA_VERSION,
      lastUpdated: new Date(),
      branchName: branchInfo.name,
      idIndex: {},
      pathIndex: {},
      typeIndex: {} as Record<string, string[]>,
      tagIndex: {},
    };

    // Add all documents to the index
    for (const document of documents) {
      this.addDocumentToIndex(newIndex, document);
    }

    // Store the index in memory
    this.indices.set(branchInfo.name, newIndex);

    // Persist the index
    await this.saveIndex(branchInfo);
  }

  /**
   * Add a document to the index
   * @param branchInfo Branch information
   * @param document Document to add
   */
  public async addToIndex(branchInfo: BranchInfo, document: JsonDocument): Promise<void> {
    const index = await this.getOrCreateIndex(branchInfo);

    // Add document to the index
    this.addDocumentToIndex(index, document);

    // Update last updated timestamp
    index.lastUpdated = new Date();

    // Persist the updated index
    await this.saveIndex(branchInfo);
  }

  /**
   * Remove a document from the index
   * @param branchInfo Branch information
   * @param document Document or document ID or path to remove
   */
  public async removeFromIndex(
    branchInfo: BranchInfo,
    document: JsonDocument | DocumentId | DocumentPath
  ): Promise<void> {
    const index = await this.getOrCreateIndex(branchInfo);

    let documentId: string;

    // Determine document ID based on input type
    if (document instanceof JsonDocument) {
      documentId = document.id.value;
    } else if (document instanceof DocumentId) {
      documentId = document.value;
    } else if (document instanceof DocumentPath) {
      // Look up ID from path
      documentId = index.pathIndex[document.value];
      if (!documentId) {
        // Document not found in index, nothing to remove
        return;
      }
    } else {
      throw new InfrastructureError(
        InfrastructureErrorCodes.INVALID_ARGUMENT,
        'Invalid document reference type'
      );
    }

    // Get the document reference
    const docRef = index.idIndex[documentId];
    if (!docRef) {
      // Document not found in index, nothing to remove
      return;
    }

    // Remove from path index
    delete index.pathIndex[docRef.path];

    // Remove from type index
    const typeArray = index.typeIndex[docRef.documentType];
    if (typeArray) {
      index.typeIndex[docRef.documentType] = typeArray.filter((id: string) => id !== documentId); // Add string type
      if (index.typeIndex[docRef.documentType].length === 0) {
        delete index.typeIndex[docRef.documentType];
      }
    }

    // Find and remove from tag indices
    for (const [tag, documentIds] of Object.entries(index.tagIndex)) {
      // Assert documentIds as string[] based on usage elsewhere
      const ids = documentIds as string[];
      index.tagIndex[tag] = ids.filter((id: string) => id !== documentId); // Add string type
      if (index.tagIndex[tag].length === 0) {
        delete index.tagIndex[tag];
      }
    }

    // Remove from ID index (do this last as we need the reference above)
    delete index.idIndex[documentId];

    // Update last updated timestamp
    index.lastUpdated = new Date();

    // Persist the updated index
    await this.saveIndex(branchInfo);
  }

  /**
   * Find document reference by ID
   * @param branchInfo Branch information
   * @param id Document ID
   * @returns Document reference if found, null otherwise
   */
  public async findById(branchInfo: BranchInfo, id: DocumentId): Promise<DocumentReference | null> {
    const index = await this.getOrCreateIndex(branchInfo);
    const docRef = index.idIndex[id.value];
    if (!docRef) return null;
    return this.convertToDocumentReference(docRef);
  }

  /**
   * Convert internal document reference to the schema DocumentReference type
   * @param internal Internal document reference
   * @returns Schema-compatible document reference
   */
  private convertToDocumentReference(internal: InternalDocumentReference): DocumentReference {
    // DocumentReferenceの型定義にはdocumentTypeプロパティがないため除外
    return {
      id: internal.id,
      path: internal.path,
      title: internal.title,
      lastModified: internal.lastModified
    };
  }

  /**
   * Find document reference by path
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Document reference if found, null otherwise
   */
  public async findByPath(
    branchInfo: BranchInfo,
    path: DocumentPath
  ): Promise<DocumentReference | null> {
    const index = await this.getOrCreateIndex(branchInfo);

    const documentId = index.pathIndex[path.value];
    if (!documentId) {
      return null;
    }

    const docRef = index.idIndex[documentId];
    if (!docRef) {
      return null;
    }

    return this.convertToDocumentReference(docRef);
  }

  /**
   * Find document references by tags
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags; if false, any tag is sufficient
   * @returns Array of matching document references
   */
  // パラメータをオブジェクトリテラル型に変更
  public async findByTags(params: {
    branchInfo: BranchInfo;
    tags: Tag[];
    matchAll?: boolean;
  }): Promise<DocumentReference[]> {
    const { branchInfo, tags, matchAll = false } = params; // 分割代入で取り出す
    const index = await this.getOrCreateIndex(branchInfo);

    if (tags.length === 0) {
      return [];
    }

    // Get document IDs matching the tags
    let matchingIds: Set<string>;

    if (matchAll) {
      // Documents must have all tags - start with the first tag's documents
      const firstTag = tags[0].value;
      const firstTagDocs = index.tagIndex[firstTag] || [];
      matchingIds = new Set(firstTagDocs);

      // For each additional tag, keep only documents that have that tag too
      for (let i = 1; i < tags.length; i++) {
        const tagDocs = new Set(index.tagIndex[tags[i].value] || []);
        matchingIds = new Set([...matchingIds].filter((id) => tagDocs.has(id)));
      }
    } else {
      // Documents can have any of the tags - union of all tag document sets
      matchingIds = new Set<string>();
      for (const tag of tags) {
        const tagDocs = index.tagIndex[tag.value] || [];
        for (const docId of tagDocs) {
          matchingIds.add(docId);
        }
      }
    }

    // Convert document IDs to document references
    return Array.from(matchingIds)
      .map((id) => index.idIndex[id])
      .filter((ref): ref is InternalDocumentReference => ref !== undefined)
      .map((ref) => this.convertToDocumentReference(ref));
  }

  /**
   * Find document references by document type
   * @param branchInfo Branch information
   * @param documentType Document type to search for
   * @returns Array of matching document references
   */
  public async findByType(
    branchInfo: BranchInfo,
    documentType: DocumentType
  ): Promise<DocumentReference[]> {
    const index = await this.getOrCreateIndex(branchInfo);

    const documentIds = index.typeIndex[documentType] || [];

    // Convert document IDs to document references
    return documentIds
      .map((id: string) => index.idIndex[id])
      .filter((ref: InternalDocumentReference | undefined): ref is InternalDocumentReference => ref !== undefined)
      .map((ref) => this.convertToDocumentReference(ref));
  }

  /**
   * List all document references
   * @param branchInfo Branch information
   * @returns Array of all document references
   */
  public async listAll(branchInfo: BranchInfo): Promise<DocumentReference[]> {
    const index = await this.getOrCreateIndex(branchInfo);
    return Object.values(index.idIndex).map(ref => this.convertToDocumentReference(ref));
  }

  /**
   * Save the index to persistent storage
   * @param branchInfo Branch information
   */
  public async saveIndex(branchInfo: BranchInfo): Promise<void> {
    const index = this.indices.get(branchInfo.name);
    if (!index) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_NOT_FOUND,
        `Index for branch ${branchInfo.name} not found`
      );
    }

    // Get the index file path
    const indexFilePath = this.getIndexFilePath(branchInfo);

    // Ensure directory exists
    const indexDir = path.dirname(indexFilePath);
    await this.fileSystemService.createDirectory(indexDir);

    // Write index to file
    try {
      await this.fileSystemService.writeFile(
        indexFilePath,
        JSON.stringify(index, null, 2) // Pretty print for debugging
      );
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to save index: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * Load the index from persistent storage
   * @param branchInfo Branch information
   */
  public async loadIndex(branchInfo: BranchInfo): Promise<void> {
    // Get the index file path
    const indexFilePath = this.getIndexFilePath(branchInfo);

    try {
      // Check if index file exists
      const exists = await this.fileSystemService.fileExists(indexFilePath);
      if (!exists) {
        throw new InfrastructureError(
          InfrastructureErrorCodes.PERSISTENCE_ERROR,
          `Index file not found: ${indexFilePath}`
        );
      }

      // Read and parse the index file
      const indexJson = await this.fileSystemService.readFile(indexFilePath);
      const index = JSON.parse(indexJson) as InternalDocumentIndex; // ★ DocumentIndex -> InternalDocumentIndex

      // Store the index in memory
      this.indices.set(branchInfo.name, index);
    } catch (error) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to load index: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * Get the index file path for a branch
   * @param branchInfo Branch information
   * @returns Absolute file path to the index file
   */
  private getIndexFilePath(branchInfo: BranchInfo): string {
    // Normalize branch name for file system (replace / with -)
    const normalizedBranchName = branchInfo.name.replace(/\//g, '-');

    // Build path: rootPath / branch-name / _index.json
    return path.join(this.rootPath, normalizedBranchName, '_index.json');
  }

  /**
   * Get an existing index or create a new one if it doesn't exist
   * @param branchInfo Branch information
   * @returns Document index
   */
  private async getOrCreateIndex(branchInfo: BranchInfo): Promise<InternalDocumentIndex> { // ★ DocumentIndex -> InternalDocumentIndex
    // Check if index exists in memory
    let index = this.indices.get(branchInfo.name);
    if (!index) {
      // Try to load from disk
      try {
        await this.loadIndex(branchInfo);
        index = this.indices.get(branchInfo.name);
      } catch (error) {
        // If loading fails, create a new empty index
        index = {
          schema: INDEX_SCHEMA_VERSION,
          lastUpdated: new Date(),
          branchName: branchInfo.name,
          idIndex: {},
          pathIndex: {},
          typeIndex: {} as Record<string, string[]>,
          tagIndex: {},
        };
        this.indices.set(branchInfo.name, index!); // ★ Use non-null assertion
      }
    }

    // This should never happen due to the above logic
    if (!index) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_NOT_FOUND,
        `Index for branch ${branchInfo.name} not found`
      );
    }

    return index;
  }

  /**
   * Add a document to an index
   * @param index Document index to update
   * @param document Document to add
   */
  private addDocumentToIndex(index: InternalDocumentIndex, document: JsonDocument): void { // ★ DocumentIndex -> InternalDocumentIndex
    const documentId = document.id.value;

    // Create document reference
    const docRef: InternalDocumentReference = { // ★ DocumentReference -> InternalDocumentReference
      id: documentId,
      path: document.path.value,
      documentType: document.documentType,
      title: document.title,
      lastModified: document.lastModified, // ★ lastModified を追加
    };

    // Add to ID index
    index.idIndex[documentId] = docRef;

    // Add to path index
    index.pathIndex[document.path.value] = documentId;

    // Add to document type index
    if (!index.typeIndex[document.documentType]) {
      index.typeIndex[document.documentType] = [];
    }
    if (!index.typeIndex[document.documentType].includes(documentId)) {
      index.typeIndex[document.documentType].push(documentId);
    }

    // Add to tag indices
    for (const tag of document.tags) {
      const tagValue = tag.value;
      if (!index.tagIndex[tagValue]) {
        index.tagIndex[tagValue] = [];
      }
      if (!index.tagIndex[tagValue].includes(documentId)) {
        index.tagIndex[tagValue].push(documentId);
      }
    }
  }
}
