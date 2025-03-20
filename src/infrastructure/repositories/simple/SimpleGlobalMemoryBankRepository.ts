import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { IGlobalMemoryBankRepository } from '../../../domain/repositories/IGlobalMemoryBankRepository';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument';
import { DocumentPath } from '../../../domain/entities/DocumentPath';
import { Tag } from '../../../domain/entities/Tag';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError';
import { TagIndex } from '../../../schemas/tag-index/tag-index-schema';

/**
 * Simple file system implementation of global memory bank repository for testing
 */
export class SimpleGlobalMemoryBankRepository implements IGlobalMemoryBankRepository {
  private readonly globalMemoryPath: string;

  /**
   * Constructor
   * @param rootPath Root path for the memory bank
   */
  constructor(rootPath: string) {
    this.globalMemoryPath = path.join(rootPath, 'global-memory-bank');
    console.log(`SimpleGlobalMemoryBankRepository initialized with path: ${this.globalMemoryPath}`);
  }

  /**
   * Initialize global memory bank
   * @returns Promise resolving when initialization is complete
   */
  async initialize(): Promise<void> {
    console.log(`Initializing global memory bank: ${this.globalMemoryPath}`);
    try {
      await fs.mkdir(this.globalMemoryPath, { recursive: true });
      console.log(`Global memory bank initialized: ${this.globalMemoryPath}`);
    } catch (error) {
      console.error(`Failed to initialize global memory bank: ${this.globalMemoryPath}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to initialize global memory bank: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get document from global memory bank
   * @param documentPath Document path
   * @returns Promise resolving to document if found, null otherwise
   */
  async getDocument(documentPath: DocumentPath): Promise<MemoryDocument | null> {
    const filePath = path.join(this.globalMemoryPath, documentPath.value);
    console.log(`Getting global document: ${filePath}`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      console.log(`Global document found: ${filePath}`);
      return MemoryDocument.create({
        path: documentPath,
        content,
        tags: [],
        lastModified: new Date()
      });
    } catch (error) {
      console.log(`Global document not found: ${filePath}`);
      return null;
    }
  }

  /**
   * Save document to global memory bank
   * @param document Document to save
   * @returns Promise resolving when done
   */
  async saveDocument(document: MemoryDocument): Promise<void> {
    const filePath = path.join(this.globalMemoryPath, document.path.value);
    const dirPath = path.dirname(filePath);
    console.log(`Saving global document: ${filePath}`);
    
    try {
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, document.content, 'utf-8');
      console.log(`Global document saved: ${filePath}`);
    } catch (error) {
      console.error(`Failed to save global document: ${filePath}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save document to global memory bank: ${document.path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Delete document from global memory bank
   * @param documentPath Document path
   * @returns Promise resolving to boolean indicating success
   */
  async deleteDocument(documentPath: DocumentPath): Promise<boolean> {
    const filePath = path.join(this.globalMemoryPath, documentPath.value);
    console.log(`Deleting global document: ${filePath}`);
    
    try {
      await fs.unlink(filePath);
      console.log(`Global document deleted: ${filePath}`);
      return true;
    } catch (error) {
      console.log(`Global document deletion failed: ${filePath}`);
      return false;
    }
  }

  /**
   * List all documents in global memory bank
   * @returns Promise resolving to array of document paths
   */
  async listDocuments(): Promise<DocumentPath[]> {
    console.log(`Listing global documents in: ${this.globalMemoryPath}`);
    
    try {
      const files = await fs.readdir(this.globalMemoryPath);
      console.log(`Global documents found: ${files.join(', ')}`);
      return files
        .filter(file => !file.startsWith('.') && !file.startsWith('_'))
        .map(file => DocumentPath.create(file));
    } catch (error) {
      console.log(`Failed to list global documents: ${this.globalMemoryPath}`, error);
      return [];
    }
  }

  /**
   * Find documents by tags in global memory bank
   * @param tags Tags to search for
   * @returns Promise resolving to array of matching documents
   */
  async findDocumentsByTags(tags: Tag[]): Promise<MemoryDocument[]> {
    // Simplified implementation for tests
    console.log(`Finding global documents by tags: ${tags.map(t => t.value).join(', ')}`);
    const documents: MemoryDocument[] = [];
    const paths = await this.listDocuments();
    
    for (const path of paths) {
      const doc = await this.getDocument(path);
      if (doc) {
        documents.push(doc);
      }
    }
    
    // For testing, we'll just return all documents regardless of tags
    console.log(`Found ${documents.length} global documents`);
    return documents;
  }

  /**
   * Save tag index for global memory bank
   * @param tagIndex Tag index to save
   * @returns Promise resolving when done
   */
  async saveTagIndex(tagIndex: TagIndex): Promise<void> {
    const indexPath = path.join(this.globalMemoryPath, '_index.json');
    console.log(`Saving global tag index: ${indexPath}`);
    
    try {
      await fs.writeFile(indexPath, JSON.stringify(tagIndex, null, 2), 'utf-8');
      console.log(`Global tag index saved: ${indexPath}`);
    } catch (error) {
      console.error(`Failed to save global tag index: ${indexPath}`, error);
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save global tag index: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get tag index for global memory bank
   * @returns Promise resolving to tag index if found, null otherwise
   */
  async getTagIndex(): Promise<TagIndex | null> {
    const indexPath = path.join(this.globalMemoryPath, '_index.json');
    console.log(`Getting global tag index: ${indexPath}`);
    
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      console.log(`Global tag index found: ${indexPath}`);
      return JSON.parse(content) as TagIndex;
    } catch (error) {
      console.log(`Global tag index not found: ${indexPath}`);
      return null;
    }
  }

  /**
   * Find documents by tags in global memory bank using index
   * @param tags Tags to search for
   * @param matchAll If true, documents must have all tags (AND), otherwise any tag (OR)
   * @returns Promise resolving to array of document paths
   */
  async findDocumentPathsByTagsUsingIndex(
    tags: Tag[],
    _matchAll?: boolean
  ): Promise<DocumentPath[]> {
    // Simplified implementation for tests
    console.log(`Finding global document paths by tags using index: ${tags.map(t => t.value).join(', ')}`);
    const docs = await this.findDocumentsByTags(tags);
    return docs.map(doc => doc.path);
  }

  /**
   * Validate global memory bank structure
   * @returns Promise resolving to boolean indicating if structure is valid
   */
  async validateStructure(): Promise<boolean> {
    console.log(`Validating global memory bank structure: ${this.globalMemoryPath}`);
    try {
      await fs.access(this.globalMemoryPath);
      console.log(`Global memory bank structure is valid: ${this.globalMemoryPath}`);
      return true;
    } catch (error) {
      console.log(`Global memory bank structure is invalid: ${this.globalMemoryPath}`);
      return false;
    }
  }

  /**
   * Update tags index in global memory bank
   * @param skipSaveDocument Optional flag to skip saveDocument
   * @returns Promise resolving when done
   */
  async updateTagsIndex(skipSaveDocument?: boolean): Promise<void> {
    // Simplified implementation for tests
    console.log(`Updating global tags index (skipSaveDocument: ${skipSaveDocument})`);
    return Promise.resolve();
  }

  /**
   * Generate and save tag index from all documents
   * @returns Promise resolving when done
   */
  async generateAndSaveTagIndex(): Promise<void> {
    // Simplified implementation for tests
    console.log(`Generating and saving global tag index`);
    return Promise.resolve();
  }

  /**
   * Updates the legacy tags/index.md file for backward compatibility
   * @returns Promise resolving when done
   */
  async updateLegacyTagsIndex(): Promise<void> {
    // Simplified implementation for tests
    console.log(`Updating legacy global tags index`);
    return Promise.resolve();
  }
}
