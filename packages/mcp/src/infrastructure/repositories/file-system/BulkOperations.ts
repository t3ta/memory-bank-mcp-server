import path from 'node:path';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import type { IConfigProvider } from '../../config/index.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';
import { DocumentOperations } from './DocumentOperations.js';
import { TagOperations } from './TagOperations.js';
import { PathOperations } from './PathOperations.js';

/**
 * Component responsible for bulk operations
 * Handles bulk retrieval, update, deletion of multiple documents
 */
export class BulkOperations extends FileSystemMemoryBankRepositoryBase {
  private readonly documentOps: DocumentOperations;
  private readonly tagOps: TagOperations;
  private readonly pathOps: PathOperations;

  /**
   * Constructor
   * @param basePath Base path
   * @param fileSystemService File system service
   * @param configProvider Configuration provider
   */
  constructor(
    private readonly basePath: string,
    fileSystemService: IFileSystemService,
    configProvider: IConfigProvider
  ) {
    super(fileSystemService, configProvider);
    this.documentOps = new DocumentOperations(basePath, fileSystemService, configProvider);
    this.tagOps = new TagOperations(basePath, fileSystemService, configProvider);
    this.pathOps = new PathOperations(basePath, fileSystemService, configProvider);
  }

  /**
   * Get multiple documents in bulk
   * @param paths Array of document paths to retrieve
   * @returns Array of documents (including null for non-existent ones)
   */
  async getDocuments(paths: DocumentPath[]): Promise<(MemoryDocument | null)[]> {
    try {
      this.logDebug(`Bulk getting ${paths.length} documents`);

      // Retrieve each document in parallel
      const promises = paths.map(path => this.documentOps.getDocument(path));
      return await Promise.all(promises);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get multiple documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Save multiple documents in bulk
   * @param documents Array of documents to save
   */
  async saveDocuments(documents: MemoryDocument[]): Promise<void> {
    try {
      this.logDebug(`Bulk saving ${documents.length} documents`);

      // Save each document in parallel
      const promises = documents.map(doc => this.documentOps.saveDocument(doc));
      await Promise.all(promises);

      // Update tag index
      await this.tagOps.generateAndSaveTagIndex(documents);

      this.logDebug(`Successfully saved ${documents.length} documents`);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save multiple documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Delete multiple documents in bulk
   * @param paths Array of document paths to delete
   * @returns Array of booleans indicating success for each deletion
   */
  async deleteDocuments(paths: DocumentPath[]): Promise<boolean[]> {
    try {
      this.logDebug(`Bulk deleting ${paths.length} documents`);

      // Delete each document in parallel
      const promises = paths.map(path => this.documentOps.deleteDocument(path));
      const results = await Promise.all(promises);

      // Update tag index if at least one deletion was successful
      if (results.some(result => result)) {
        // Get remaining documents to update tag index
        const allPaths = await this.documentOps.listDocuments();
        const allDocs = await this.getDocuments(
          allPaths.filter(p => !paths.some(deletedPath =>
            deletedPath.value === p.value || deletedPath.toAlternateFormat().value === p.value
          ))
        );
        const validDocs = allDocs.filter((doc): doc is MemoryDocument => doc !== null);

        await this.tagOps.generateAndSaveTagIndex(validDocs);
      }

      return results;
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete multiple documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Find documents by tags
   * @param tags Array of tags to search for
   * @param matchAll Whether all tags must match (AND) or any tag is sufficient (OR)
   * @returns Array of matching documents
   */
  async findDocumentsByTags(tags: Tag[], matchAll: boolean = false): Promise<MemoryDocument[]> {
    try {
      this.logDebug(`Finding documents by ${tags.length} tags (matchAll: ${matchAll})`);

      // First, get all document paths
      const allPaths = await this.documentOps.listDocuments();

      // Filter paths using the tag index
      const allDocs = await this.getDocuments(allPaths);
      const validDocs = allDocs.filter((doc): doc is MemoryDocument => doc !== null);

      // Search using the tag index
      const matchingPaths = await this.tagOps.findDocumentPathsByTagsUsingIndex(tags, validDocs, matchAll);

      // Get documents for the matching paths
      const matchingDocs = await this.getDocuments(matchingPaths);

      // Return only non-null documents
      return matchingDocs.filter((doc): doc is MemoryDocument => doc !== null);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to find documents by tags: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * List all documents
   * @returns Array of all documents
   */
  async getAllDocuments(): Promise<MemoryDocument[]> {
    try {
      this.logDebug('Getting all documents');

      // Get all paths
      const allPaths = await this.documentOps.listDocuments();

      // Get all documents
      const allDocs = await this.getDocuments(allPaths);

      // Return only non-null documents
      return allDocs.filter((doc): doc is MemoryDocument => doc !== null);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get all documents: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get all documents within a specific directory
   * @param directoryPath Directory path
   * @returns Array of documents within the directory
   */
  async getDocumentsInDirectory(directoryPath: string): Promise<MemoryDocument[]> {
    try {
      this.logDebug(`Getting documents in directory: ${directoryPath}`);

      // List files in the directory
      const fileList = await this.pathOps.listFilesInDirectory(directoryPath, ['.json', '.md']);

      // Convert file paths to DocumentPath
      const paths = fileList.map(file => DocumentPath.create(file));

      // Get the documents
      const docs = await this.getDocuments(paths);

      // Return only non-null documents
      return docs.filter((doc): doc is MemoryDocument => doc !== null);
    } catch (error) {
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get documents in directory ${directoryPath}: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Regenerate the tag index
   * @returns true if successful
   */
  async rebuildTagIndex(): Promise<boolean> {
    try {
      this.logDebug('Rebuilding tag index');

      // Get all documents
      const docs = await this.getAllDocuments();

      // Generate and save the tag index
      await this.tagOps.generateAndSaveTagIndex(docs);

      return true;
    } catch (error) {
      this.logError('Failed to rebuild tag index', error);
      return false;
    }
  }

  /**
   * Validate if the directory structure is valid
   * @returns Validation result (true if successful)
   */
  async validateStructure(): Promise<boolean> {
    try {
      this.logDebug('Validating structure');

      // Check if base directory exists
      const baseDirExists = await this.directoryExists(this.basePath);
      if (!baseDirExists) {
        this.logDebug(`Base directory does not exist: ${this.basePath}`);
        return false;
      }

      // Check if tags directory exists
      const tagsDir = path.join(this.basePath, 'tags');
      const tagsDirExists = await this.directoryExists(tagsDir);
      if (!tagsDirExists) {
        this.logDebug(`Tags directory does not exist: ${tagsDir}`);
        // Create tags directory if it doesn't exist
        await this.createDirectory(tagsDir);
      }

      return true;
    } catch (error) {
      this.logError('Error validating structure', error);
      return false;
    }
  }
}
