import path from 'path';

import { IJsonDocumentRepository } from '../../domain/repositories/IJsonDocumentRepository.js';
import { BranchInfo } from '../../domain/entities/BranchInfo.js';
import { DocumentId } from '../../domain/entities/DocumentId.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { JsonDocument, DocumentType } from '../../domain/entities/JsonDocument.js';
import { Tag } from '../../domain/entities/Tag.js';
import { IFileSystemService } from '../../infrastructure/storage/interfaces/IFileSystemService.js';
import {
  InfrastructureError,
  InfrastructureErrorCodes,
} from '../../shared/errors/InfrastructureError.js';
import { IIndexService } from '../index/interfaces/IIndexService.js';

/**
 * File system implementation of the JSON document repository
 * Stores JSON documents as files in a directory structure
 */
export class FileSystemJsonDocumentRepository implements IJsonDocumentRepository {
  /**
   * Create a new FileSystemJsonDocumentRepository
   * @param fileSystemService File system service for file operations
   * @param indexService Document index service for efficient lookups
   * @param rootPath Root path for storing documents
   */
  constructor(
    private readonly fileSystemService: IFileSystemService,
    private readonly indexService: IIndexService,
    private readonly rootPath: string
  ) { }

  /**
   * Get the absolute file path for a document
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns Absolute file path
   */
  private getAbsoluteFilePath(branchInfo: BranchInfo, documentPath: DocumentPath): string {
    // Normalize branch name for file system (replace / with -)
    const normalizedBranchName = branchInfo.name.replace(/\//g, '-');

    // Build path: rootPath / branch-name / document-path
    return path.join(this.rootPath, normalizedBranchName, documentPath.value);
  }

  /**
   * Get the directory path for a branch
   * @param branchInfo Branch information
   * @returns Absolute directory path
   */
  private getBranchDirectoryPath(branchInfo: BranchInfo): string {
    // Normalize branch name for file system (replace / with -)
    const normalizedBranchName = branchInfo.name.replace(/\//g, '-');

    // Build path: rootPath / branch-name
    return path.join(this.rootPath, normalizedBranchName);
  }

  /**
   * Find a document by its ID
   * @param id Document ID
   * @returns Promise resolving to the document if found, or null if not found
   */
  public async findById(id: DocumentId): Promise<JsonDocument | null> {
    try {
      // Find all branch directories
      const files = await this.fileSystemService.listFiles(this.rootPath);
      const branchDirs = new Set<string>();

      // Extract unique directories
      for (const file of files) {
        const relativePath = path.relative(this.rootPath, file);
        const parts = relativePath.split(path.sep);
        if (parts.length > 0) {
          branchDirs.add(parts[0]);
        }
      }

      // Look through each branch to find the document
      for (const branchDir of branchDirs) {
        const branchPath = path.join(this.rootPath, branchDir);
        const isDir = await this.fileSystemService.directoryExists(branchPath);

        if (!isDir) {
          continue;
        }

        // Create branch info for this directory
        const branchName = branchDir.replace(/-/g, '/'); // Convert back to original branch name
        const branchInfo = BranchInfo.create(branchName);

        // Find document by ID using index service
        const docRef = await this.indexService.findById(branchInfo, id);

        if (docRef) {
          // Found the document, load it
          const documentPath = DocumentPath.create(docRef.path);
          const fullPath = this.getAbsoluteFilePath(branchInfo, documentPath);
          const content = await this.fileSystemService.readFile(fullPath);

          try {
            return JsonDocument.fromString(content, documentPath);
          } catch (error) {
            throw new InfrastructureError(
              InfrastructureErrorCodes.FILE_READ_ERROR,
              `Failed to parse document at ${fullPath}: ${(error as Error).message}`,
              { cause: error }
            );
          }
        }
      }

      // Document not found in any branch
      return null;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to find document by ID: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * Find a document by its path
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving to the document if found, or null if not found
   */
  public async findByPath(
    branchInfo: BranchInfo,
    path: DocumentPath
  ): Promise<JsonDocument | null> {
    try {
      // First check if the document exists in the index
      const docRef = await this.indexService.findByPath(branchInfo, path);

      if (!docRef) {
        // Document not found in index, try direct file access
        const fullPath = this.getAbsoluteFilePath(branchInfo, path);

        try {
          // Check if file exists
          const fileExists = await this.fileSystemService.fileExists(fullPath);

          if (!fileExists) {
            return null;
          }

          // File exists, read and parse it
          const content = await this.fileSystemService.readFile(fullPath);
          const document = JsonDocument.fromString(content, path);

          // Add to index for future lookups
          await this.indexService.addToIndex(branchInfo, document);

          return document;
        } catch (error) {
          // File doesn't exist or other error
          return null;
        }
      } else {
        // Document found in index, load from file
        const fullPath = this.getAbsoluteFilePath(branchInfo, path);

        try {
          const content = await this.fileSystemService.readFile(fullPath);
          return JsonDocument.fromString(content, path);
        } catch (error) {
          // File doesn't exist or other error
          // Remove from index since file is missing
          await this.indexService.removeFromIndex(branchInfo, path);
          return null;
        }
      }
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to find document by path: ${(error as Error).message}`,
        { cause: error }
      );
    }
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
    try {
      // Use index service to find documents by tags
      const docRefs = await this.indexService.findByTags(branchInfo, tags, matchAll);

      // Load all matching documents
      const documents: JsonDocument[] = [];

      for (const docRef of docRefs) {
        const docPath = DocumentPath.create(docRef.path);
        const fullPath = this.getAbsoluteFilePath(branchInfo, docPath);

        try {
          const content = await this.fileSystemService.readFile(fullPath);
          const document = JsonDocument.fromString(content, docPath);
          documents.push(document);
        } catch (error) {
          // Skip documents that can't be loaded
          // This might happen if a document is deleted but still in the index
          // We should remove it from the index
          const docId = DocumentId.create(docRef.id);
          await this.indexService.removeFromIndex(branchInfo, docId);
        }
      }

      return documents;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to find documents by tags: ${(error as Error).message}`,
        { cause: error }
      );
    }
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
    try {
      // Use index service to find documents by type
      const docRefs = await this.indexService.findByType(branchInfo, documentType);

      // Load all matching documents
      const documents: JsonDocument[] = [];

      for (const docRef of docRefs) {
        const docPath = DocumentPath.create(docRef.path);
        const fullPath = this.getAbsoluteFilePath(branchInfo, docPath);

        try {
          const content = await this.fileSystemService.readFile(fullPath);
          const document = JsonDocument.fromString(content, docPath);
          documents.push(document);
        } catch (error) {
          // Skip documents that can't be loaded
          // This might happen if a document is deleted but still in the index
          // We should remove it from the index
          const docId = DocumentId.create(docRef.id);
          await this.indexService.removeFromIndex(branchInfo, docId);
        }
      }

      return documents;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.PERSISTENCE_ERROR,
        `Failed to find documents by type: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * Save a document
   * @param branchInfo Branch information
   * @param document Document to save
   * @returns Promise resolving to the saved document
   */
  public async save(branchInfo: BranchInfo, document: JsonDocument): Promise<JsonDocument> {
    try {
      // Get the full file path
      const fullPath = this.getAbsoluteFilePath(branchInfo, document.path);

      // Ensure directory exists
      const directory = path.dirname(fullPath);
      await this.fileSystemService.createDirectory(directory);

      // Serialize document to JSON
      const content = document.toString(true); // Pretty print

      // Write to file
      await this.fileSystemService.writeFile(fullPath, content);

      // Update index
      await this.indexService.addToIndex(branchInfo, document);

      return document;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save document: ${(error as Error).message}`,
        { cause: error }
      );
    }
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
    try {
      let filePath: string;

      // Determine file path based on input type
      if (document instanceof JsonDocument) {
        filePath = this.getAbsoluteFilePath(branchInfo, document.path);
      } else if (document instanceof DocumentPath) {
        filePath = this.getAbsoluteFilePath(branchInfo, document);
      } else if (document instanceof DocumentId) {
        // Find document by ID using index
        const docRef = await this.indexService.findById(branchInfo, document);
        if (!docRef) {
          return false; // Document not found
        }
        const docPath = DocumentPath.create(docRef.path);
        filePath = this.getAbsoluteFilePath(branchInfo, docPath);
      } else {
        throw new InfrastructureError(
          InfrastructureErrorCodes.INVALID_ARGUMENT,
          'Invalid document reference type'
        );
      }

      // Remove from index
      await this.indexService.removeFromIndex(branchInfo, document);

      // Delete file
      return await this.fileSystemService.deleteFile(filePath);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete document: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * List all documents
   * @param branchInfo Branch information
   * @returns Promise resolving to array of all documents
   */
  public async listAll(branchInfo: BranchInfo): Promise<JsonDocument[]> {
    try {
      // First try to use index
      try {
        const docRefs = await this.indexService.listAll(branchInfo);

        // Load all documents
        const documents: JsonDocument[] = [];
        const missingDocs: DocumentPath[] = [];

        for (const docRef of docRefs) {
          const docPath = DocumentPath.create(docRef.path);
          const fullPath = this.getAbsoluteFilePath(branchInfo, docPath);

          try {
            const content = await this.fileSystemService.readFile(fullPath);
            const document = JsonDocument.fromString(content, docPath);
            documents.push(document);
          } catch (error) {
            // Skip documents that can't be loaded
            // This might happen if a document is deleted but still in the index
            // We should collect these for removal from index
            missingDocs.push(docPath);
          }
        }

        // Remove missing documents from index
        for (const docPath of missingDocs) {
          await this.indexService.removeFromIndex(branchInfo, docPath);
        }

        return documents;
      } catch (error) {
        // If index fails, fall back to file system scanning
        return await this.listAllFromFileSystem(branchInfo);
      }
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list all documents: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  /**
   * List all documents by scanning the file system
   * @param branchInfo Branch information
   * @returns Promise resolving to array of all documents
   */
  private async listAllFromFileSystem(branchInfo: BranchInfo): Promise<JsonDocument[]> {
    // Get branch directory
    const branchDir = this.getBranchDirectoryPath(branchInfo);

    // Ensure branch directory exists
    const dirExists = await this.fileSystemService.directoryExists(branchDir);
    if (!dirExists) {
      return [];
    }

    // Get all files in branch directory
    const files = await this.fileSystemService.listFiles(branchDir);

    // Filter JSON files
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    // Parse documents
    const documents: JsonDocument[] = [];
    const jsonDocuments: JsonDocument[] = []; // For rebuilding index

    for (const filePath of jsonFiles) {
      try {
        // Get relative path from branch directory
        const relativePath = path.relative(branchDir, filePath);
        const documentPath = DocumentPath.create(relativePath);

        // Read and parse document
        const content = await this.fileSystemService.readFile(filePath);
        const document = JsonDocument.fromString(content, documentPath);

        documents.push(document);
        jsonDocuments.push(document);
      } catch (error) {
        // Skip invalid documents
        // This could happen if a file has invalid JSON or doesn't match the expected schema
      }
    }

    // Rebuild index with found documents
    await this.indexService.buildIndex(branchInfo, jsonDocuments);

    return documents;
  }

  /**
   * Check if a document exists by path
   * @param branchInfo Branch information
   * @param path Document path
   * @returns Promise resolving to boolean indicating existence
   */
  public async exists(branchInfo: BranchInfo, path: DocumentPath): Promise<boolean> {
    try {
      // First check index
      const docRef = await this.indexService.findByPath(branchInfo, path);

      if (docRef) {
        // Verify file actually exists
        const fullPath = this.getAbsoluteFilePath(branchInfo, path);

        const fileExists = await this.fileSystemService.fileExists(fullPath);
        if (!fileExists) {
          // File doesn't exist, remove from index
          await this.indexService.removeFromIndex(branchInfo, path);
          return false;
        }

        return true;
      }

      // Not in index, check file system directly
      const fullPath = this.getAbsoluteFilePath(branchInfo, path);
      return await this.fileSystemService.fileExists(fullPath);
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to check if document exists: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }
}
