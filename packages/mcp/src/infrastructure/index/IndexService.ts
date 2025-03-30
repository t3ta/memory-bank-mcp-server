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

// Internal type definition for DocumentReference used within this file
interface InternalDocumentReference {
  id: string;
  path: string;
  documentType: DocumentType; // Required for internal indexing
  title: string;
  lastModified: Date; // Added for compatibility with IIndexService
}

// Internal type definition for DocumentIndex used within this file
interface InternalDocumentIndex {
  schema: string;
  lastUpdated: Date;
  branchName: string;
  idIndex: Record<string, InternalDocumentReference>; // Use InternalDocumentReference
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
  private indices: Map<string, InternalDocumentIndex> = new Map();

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
    try {
      await this.loadIndex(branchInfo);
    } catch (error) {
      const newIndex: InternalDocumentIndex = {
        schema: INDEX_SCHEMA_VERSION,
        lastUpdated: new Date(),
        branchName: branchInfo.name,
        idIndex: {},
        pathIndex: {},
        typeIndex: {} as Record<string, string[]>,
        tagIndex: {},
      };
      this.indices.set(branchInfo.name, newIndex);
      await this.saveIndex(branchInfo);
    }
  }

  /**
   * Build the index from a collection of documents
   * @param branchInfo Branch information
   * @param documents Documents to index
   */
  public async buildIndex(branchInfo: BranchInfo, documents: JsonDocument[]): Promise<void> {
    const newIndex: InternalDocumentIndex = {
      schema: INDEX_SCHEMA_VERSION,
      lastUpdated: new Date(),
      branchName: branchInfo.name,
      idIndex: {},
      pathIndex: {},
      typeIndex: {} as Record<string, string[]>,
      tagIndex: {},
    };

    for (const document of documents) {
      this.addDocumentToIndex(newIndex, document);
    }

    this.indices.set(branchInfo.name, newIndex);
    await this.saveIndex(branchInfo);
  }

  /**
   * Add a document to the index
   * @param branchInfo Branch information
   * @param document Document to add
   */
  public async addToIndex(branchInfo: BranchInfo, document: JsonDocument): Promise<void> {
    const index = await this.getOrCreateIndex(branchInfo);
    this.addDocumentToIndex(index, document);
    index.lastUpdated = new Date();
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

    if (document instanceof JsonDocument) {
      documentId = document.id.value;
    } else if (document instanceof DocumentId) {
      documentId = document.value;
    } else if (document instanceof DocumentPath) {
      documentId = index.pathIndex[document.value];
      if (!documentId) {
        return;
      }
    } else {
      throw new InfrastructureError(
        InfrastructureErrorCodes.INVALID_ARGUMENT,
        'Invalid document reference type'
      );
    }

    const docRef = index.idIndex[documentId];
    if (!docRef) {
      return;
    }

    delete index.pathIndex[docRef.path];

    const typeArray = index.typeIndex[docRef.documentType];
    if (typeArray) {
      index.typeIndex[docRef.documentType] = typeArray.filter((id: string) => id !== documentId);
      if (index.typeIndex[docRef.documentType].length === 0) {
        delete index.typeIndex[docRef.documentType];
      }
    }

    for (const [tag, documentIds] of Object.entries(index.tagIndex)) {
      const ids = documentIds as string[];
      index.tagIndex[tag] = ids.filter((id: string) => id !== documentId);
      if (index.tagIndex[tag].length === 0) {
        delete index.tagIndex[tag];
      }
    }

    delete index.idIndex[documentId];
    index.lastUpdated = new Date();
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
    // Exclude documentType as it's not in the schema's DocumentReference
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
  // Changed parameters to object literal type
  public async findByTags(params: {
    branchInfo: BranchInfo;
    tags: Tag[];
    matchAll?: boolean;
  }): Promise<DocumentReference[]> {
    const { branchInfo, tags, matchAll = false } = params;
    const index = await this.getOrCreateIndex(branchInfo);

    if (tags.length === 0) {
      return [];
    }

    let matchingIds: Set<string>;

    if (matchAll) {
      const firstTag = tags[0].value;
      const firstTagDocs = index.tagIndex[firstTag] || [];
      matchingIds = new Set(firstTagDocs);

      for (let i = 1; i < tags.length; i++) {
        const tagDocs = new Set(index.tagIndex[tags[i].value] || []);
        matchingIds = new Set([...matchingIds].filter((id) => tagDocs.has(id)));
      }
    } else {
      matchingIds = new Set<string>();
      for (const tag of tags) {
        const tagDocs = index.tagIndex[tag.value] || [];
        for (const docId of tagDocs) {
          matchingIds.add(docId);
        }
      }
    }

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

    const indexFilePath = this.getIndexFilePath(branchInfo);
    const indexDir = path.dirname(indexFilePath);
    await this.fileSystemService.createDirectory(indexDir);

    try {
      await this.fileSystemService.writeFile(
        indexFilePath,
        JSON.stringify(index, null, 2)
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
    const indexFilePath = this.getIndexFilePath(branchInfo);

    try {
      const exists = await this.fileSystemService.fileExists(indexFilePath);
      if (!exists) {
        throw new InfrastructureError(
          InfrastructureErrorCodes.PERSISTENCE_ERROR,
          `Index file not found: ${indexFilePath}`
        );
      }

      const indexJson = await this.fileSystemService.readFile(indexFilePath);
      const index = JSON.parse(indexJson) as InternalDocumentIndex;

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
    const normalizedBranchName = branchInfo.name.replace(/\//g, '-');
    return path.join(this.rootPath, normalizedBranchName, '_index.json');
  }

  /**
   * Get an existing index or create a new one if it doesn't exist
   * @param branchInfo Branch information
   * @returns Document index
   */
  private async getOrCreateIndex(branchInfo: BranchInfo): Promise<InternalDocumentIndex> {
    let index = this.indices.get(branchInfo.name);
    if (!index) {
      try {
        await this.loadIndex(branchInfo);
        index = this.indices.get(branchInfo.name);
      } catch (error) {
        index = {
          schema: INDEX_SCHEMA_VERSION,
          lastUpdated: new Date(),
          branchName: branchInfo.name,
          idIndex: {},
          pathIndex: {},
          typeIndex: {} as Record<string, string[]>,
          tagIndex: {},
        };
        this.indices.set(branchInfo.name, index!);
      }
    }

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
  private addDocumentToIndex(index: InternalDocumentIndex, document: JsonDocument): void {
    const documentId = document.id.value;

    const docRef: InternalDocumentReference = {
      id: documentId,
      path: document.path.value,
      documentType: document.documentType,
      title: document.title,
      lastModified: document.lastModified,
    };

    index.idIndex[documentId] = docRef;
    index.pathIndex[document.path.value] = documentId;

    if (!index.typeIndex[document.documentType]) {
      index.typeIndex[document.documentType] = [];
    }
    if (!index.typeIndex[document.documentType].includes(documentId)) {
      index.typeIndex[document.documentType].push(documentId);
    }

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
