import path from 'node:path';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { DomainError } from '../../../shared/errors/DomainError.js'; // Import DomainError
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import type { IConfigProvider } from '../../config/index.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';
import { FileSystemMemoryDocumentRepository } from './FileSystemMemoryDocumentRepository.js';

/**
 * Component responsible for document-related operations
 */
export class DocumentOperations extends FileSystemMemoryBankRepositoryBase {
  /**
   * Constructor
   * @param basePath Base path
   * @param fileSystemService File system service
   */
  constructor(
    private readonly basePath: string,
    fileSystemService: IFileSystemService,
    configProvider: IConfigProvider
  ) {
    super(fileSystemService, configProvider);
  }

  /**
   * Get the document repository
   * @returns Document repository
   */
  private getDocumentRepository(): FileSystemMemoryDocumentRepository {
    return new FileSystemMemoryDocumentRepository(this.basePath, this.fileSystemService);
  }

  /**
   * Get a document
   * @param path Document path
   * @returns The retrieved document, or null if not found
   */
  async getDocument(path: DocumentPath): Promise<MemoryDocument | null> {
    try {
      const documentRepository = this.getDocumentRepository();
      return await documentRepository.findByPath(path);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get document: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get a document from a branch
   * @param branchInfo Branch information
   * @param path Document path
   * @returns The retrieved document, or null if not found
   */
  async getBranchDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<MemoryDocument | null> {
    try {
      const documentRepository = this.getDocumentRepository();
      return await documentRepository.findByPath(path);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get document from branch: ${branchInfo.name}, path: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Save a document
   * @param document Document to save
   */
  async saveDocument(document: MemoryDocument): Promise<void> {
    try {
      const documentRepository = this.getDocumentRepository();
      await documentRepository.save(document);
    } catch (error) {
      // If it's a known domain or infrastructure error, re-throw it directly
      if (error instanceof DomainError || error instanceof InfrastructureError) {
        throw error;
      }
      // For any other unexpected errors, wrap as InfrastructureError
      logger.error(`Unexpected error saving document ${document.path.value}:`, { error }); // Log unexpected errors
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Unexpected error saving document: ${document.path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Save a document to a branch
   * @param branchInfo Branch information
   * @param document Document to save
   */
  async saveBranchDocument(branchInfo: BranchInfo, document: MemoryDocument): Promise<void> {
    try {
      const documentRepository = this.getDocumentRepository();
      await documentRepository.save(document);
      logger.debug(`Document saved to branch ${branchInfo.name}: ${document.path.value}`);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save document to branch: ${branchInfo.name}, path: ${document.path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Delete a document
   * @param path Path of the document to delete
   * @returns Whether the deletion was successful
   */
  async deleteDocument(path: DocumentPath): Promise<boolean> {
    try {
      const documentRepository = this.getDocumentRepository();
      return await documentRepository.delete(path);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete document: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Delete a document from a branch
   * @param branchInfo Branch information
   * @param path Path of the document to delete
   * @returns Whether the deletion was successful
   */
  async deleteBranchDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<boolean> {
    try {
      const documentRepository = this.getDocumentRepository();
      const result = await documentRepository.delete(path);
      if (result) {
        logger.debug(`Document deleted from branch ${branchInfo.name}: ${path.value}`);
      }
      return result;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete document from branch: ${branchInfo.name}, path: ${path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get a list of all documents
   * @returns Array of document paths
   */
  async listDocuments(): Promise<DocumentPath[]> {
    try {
      const documentRepository = this.getDocumentRepository();
      return await documentRepository.list();
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        'Failed to list documents',
        { originalError: error }
      );
    }
  }

  /**
   * Get a list of all documents in a branch
   * @param branchInfo Branch information
   * @returns Array of document paths
   */
  async listBranchDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    try {
      const documentRepository = this.getDocumentRepository();
      const documents = await documentRepository.list();
      logger.debug(`Listed ${documents.length} documents from branch ${branchInfo.name}`);
      return documents;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list documents from branch: ${branchInfo.name}`,
        { originalError: error }
      );
    }
  }
}
