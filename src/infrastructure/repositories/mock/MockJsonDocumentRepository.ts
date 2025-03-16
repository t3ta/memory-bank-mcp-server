import { IJsonDocumentRepository } from '../../../domain/repositories/IJsonDocumentRepository.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentId } from '../../../domain/entities/DocumentId.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { JsonDocument, DocumentType } from '../../../domain/entities/JsonDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';

/**
 * In-memory implementation of the JSON document repository
 * Used for testing purposes
 */
export class MockJsonDocumentRepository implements IJsonDocumentRepository {
  // Storage for documents, organized by branch name and document path
  private documents: Map<string, Map<string, JsonDocument>> = new Map();
  
  /**
   * Find a document by its ID
   * @param id Document ID
   * @returns Promise resolving to the document if found, or null if not found
   */
  public async findById(id: DocumentId): Promise<JsonDocument | null> {
    // Iterate through all branches and documents to find matching ID
    for (const [, branchDocuments] of this.documents.entries()) {
      for (const document of branchDocuments.values()) {
        if (document.id.equals(id)) {
          return document;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Find a document by its path
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving to the document if found, or null if not found
   */
  public async findByPath(branchInfo: BranchInfo, path: DocumentPath): Promise<JsonDocument | null> {
    const branchDocuments = this.getBranchDocuments(branchInfo);
    return branchDocuments.get(path.value) || null;
  }
  
  /**
   * Find documents by tags
   * @param branchInfo Branch information
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags; if false, any tag is sufficient
   * @returns Promise resolving to array of matching documents
   */
  public async findByTags(
    branchInfo: BranchInfo,
    tags: Tag[],
    matchAll: boolean = false
  ): Promise<JsonDocument[]> {
    if (tags.length === 0) {
      return [];
    }
    
    const branchDocuments = this.getBranchDocuments(branchInfo);
    const result: JsonDocument[] = [];
    
    for (const document of branchDocuments.values()) {
      if (matchAll) {
        // Document must have all tags
        if (tags.every(tag => document.hasTag(tag))) {
          result.push(document);
        }
      } else {
        // Document must have at least one tag
        if (tags.some(tag => document.hasTag(tag))) {
          result.push(document);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Find documents by document type
   * @param branchInfo Branch information
   * @param documentType Document type to search for
   * @returns Promise resolving to array of matching documents
   */
  public async findByType(
    branchInfo: BranchInfo,
    documentType: DocumentType
  ): Promise<JsonDocument[]> {
    const branchDocuments = this.getBranchDocuments(branchInfo);
    const result: JsonDocument[] = [];
    
    for (const document of branchDocuments.values()) {
      if (document.documentType === documentType) {
        result.push(document);
      }
    }
    
    return result;
  }
  
  /**
   * Save a document
   * @param branchInfo Branch information
   * @param document Document to save
   * @returns Promise resolving to the saved document
   */
  public async save(branchInfo: BranchInfo, document: JsonDocument): Promise<JsonDocument> {
    const branchDocuments = this.getBranchDocuments(branchInfo);
    branchDocuments.set(document.path.value, document);
    return document;
  }
  
  /**
   * Delete a document
   * @param branchInfo Branch information
   * @param document Document to delete (or document ID or path)
   * @returns Promise resolving to boolean indicating success
   */
  public async delete(
    branchInfo: BranchInfo,
    document: JsonDocument | DocumentId | DocumentPath
  ): Promise<boolean> {
    const branchDocuments = this.getBranchDocuments(branchInfo);
    
    if (document instanceof JsonDocument) {
      return branchDocuments.delete(document.path.value);
    } else if (document instanceof DocumentPath) {
      return branchDocuments.delete(document.value);
    } else if (document instanceof DocumentId) {
      // Find document by ID
      for (const [path, doc] of branchDocuments.entries()) {
        if (doc.id.equals(document)) {
          return branchDocuments.delete(path);
        }
      }
      return false;
    }
    
    return false;
  }
  
  /**
   * List all documents
   * @param branchInfo Branch information
   * @returns Promise resolving to array of all documents
   */
  public async listAll(branchInfo: BranchInfo): Promise<JsonDocument[]> {
    const branchDocuments = this.getBranchDocuments(branchInfo);
    return Array.from(branchDocuments.values());
  }
  
  /**
   * Check if a document exists by path
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving to boolean indicating existence
   */
  public async exists(branchInfo: BranchInfo, path: DocumentPath): Promise<boolean> {
    const branchDocuments = this.getBranchDocuments(branchInfo);
    return branchDocuments.has(path.value);
  }
  
  /**
   * Helper method to get the documents map for a branch
   * Creates the map if it doesn't exist
   * @param branchInfo Branch information
   * @returns Map of document path to document
   */
  private getBranchDocuments(branchInfo: BranchInfo): Map<string, JsonDocument> {
    let branchDocuments = this.documents.get(branchInfo.name);
    
    if (!branchDocuments) {
      branchDocuments = new Map<string, JsonDocument>();
      this.documents.set(branchInfo.name, branchDocuments);
    }
    
    return branchDocuments;
  }
  
  /**
   * Clear all documents (for testing)
   */
  public clear(): void {
    this.documents.clear();
  }
  
  /**
   * Initialize with a set of documents (for testing)
   * @param documents Documents to initialize with
   * @param branchInfo Branch information
   */
  public async initialize(documents: JsonDocument[], branchInfo: BranchInfo): Promise<void> {
    const branchDocuments = this.getBranchDocuments(branchInfo);
    
    for (const document of documents) {
      branchDocuments.set(document.path.value, document);
    }
  }
}
