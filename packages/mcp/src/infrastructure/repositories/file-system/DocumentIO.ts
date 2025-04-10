import path from "path";
import fs from "fs/promises";
import { logger } from "../../../shared/utils/logger.js";
import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { DocumentPath } from "../../../domain/entities/DocumentPath.js";
import { MemoryDocument } from "../../../domain/entities/MemoryDocument.js";
import { Tag } from "../../../domain/entities/Tag.js";
import { DomainError, DomainErrorCodes } from "../../../shared/errors/DomainError.js";

/**
 * Handles document Input/Output operations within a specific branch directory.
 * Assumes the branch directory already exists when methods are called.
 */
export class DocumentIO {
  private readonly branchMemoryBankPath: string;

  /**
   * Constructor
   * @param rootPath Root path for the memory bank (e.g., docs/)
   */
  constructor(rootPath: string) {
    this.branchMemoryBankPath = path.join(rootPath, 'branch-memory-bank');
    logger.debug(`[DocumentIO] Initialized with rootPath: ${rootPath}`);
  }

  /**
   * Gets the full path for a given document within a branch.
   * @param branchInfo Branch information.
   * @param documentPath Document path relative to the branch.
   * @returns The full file path.
   */
  private getFullFilePath(branchInfo: BranchInfo, documentPath: DocumentPath): string {
    const safeBranchName = branchInfo.safeName;
    const branchPath = path.join(this.branchMemoryBankPath, safeBranchName);
    return path.join(branchPath, documentPath.value);
  }

  /**
   * Checks if a file exists. (Currently unused, kept for potential future use)
   * @param filePath Full file path
   * @returns Promise resolving to boolean indicating if file exists
   */
  /* // ★★★ 未使用のためコメントアウト ★★★
  private async fileExists(filePath: string): Promise<boolean> {
     logger.debug(`[DocumentIO] Checking file existence: ${filePath}`);
    try {
      await fs.access(filePath);
      logger.debug('[DocumentIO] File exists:', { filePath });
      return true;
    } catch {
      logger.debug('[DocumentIO] File does not exist:', { filePath });
      return false;
    }
  }
  */ // ★★★ ここまで ★★★


  /**
   * Reads a document from the file system.
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns Promise resolving to MemoryDocument if found, null otherwise
   */
  async getDocument(branchInfo: BranchInfo, documentPath: DocumentPath): Promise<MemoryDocument | null> {
    const filePath = this.getFullFilePath(branchInfo, documentPath);
    logger.debug(`[DocumentIO] Trying to read file:`, { filePath });

    try {
      const contentString = await fs.readFile(filePath, 'utf-8');
      let tags: Tag[] = [];
      let lastModified = new Date(); // Default value

      if (documentPath.value.endsWith('.json')) {
          try {
              const parsedContent = JSON.parse(contentString);
              if (parsedContent.metadata) {
                  if (Array.isArray(parsedContent.metadata.tags)) {
                      tags = parsedContent.metadata.tags
                          .filter((t: any) => typeof t === 'string' && t.trim() !== '')
                          .map((t: string) => Tag.create(t));
                  }
                  if (parsedContent.metadata.lastModified) {
                      try {
                          const parsedDate = new Date(parsedContent.metadata.lastModified);
                          if (!isNaN(parsedDate.getTime())) {
                              lastModified = parsedDate;
                          } else {
                              logger.warn('[DocumentIO] Invalid lastModified date found, using current date.', { path: filePath, value: parsedContent.metadata.lastModified });
                          }
                      } catch (dateError) {
                          logger.warn('[DocumentIO] Error parsing lastModified date, using current date.', { path: filePath, error: dateError });
                      }
                  }
              }
          } catch (parseError) {
              logger.warn('[DocumentIO] Failed to parse JSON content, returning default metadata.', { path: filePath, error: parseError });
          }
      }

      return MemoryDocument.create({
        path: documentPath,
        content: contentString,
        tags: tags,
        lastModified: lastModified
      });
    } catch (error: unknown) {
        const isEnoent = error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
        if (isEnoent) {
            logger.debug(`[DocumentIO] Document not found (ENOENT): ${filePath}`);
            return null;
        }
        logger.error(`[DocumentIO] Error reading document ${filePath}:`, error);
        return null;
    }
  }

  /**
   * Saves a document to the file system.
   * @param branchInfo Branch information
   * @param document Document to save
   * @returns Promise resolving when done
   */
  async saveDocument(branchInfo: BranchInfo, document: MemoryDocument): Promise<void> {
    const filePath = this.getFullFilePath(branchInfo, document.path);
    logger.debug('[DocumentIO] Saving document:', { filePath });

    try {
      let contentToSave: string;
      let isJsonFile = document.path.value.endsWith('.json');

      if (isJsonFile) {
          try {
              const parsedContent = JSON.parse(document.content || '{}');
              if (typeof parsedContent.metadata !== 'object' || parsedContent.metadata === null) {
                  parsedContent.metadata = {};
              }
              parsedContent.metadata.tags = document.tags.map(t => t.value);
              parsedContent.metadata.lastModified = document.lastModified.toISOString();
              if (!parsedContent.metadata.path) parsedContent.metadata.path = document.path.value;
              if (!parsedContent.schema) parsedContent.schema = 'memory_document_v2';

              // Basic validation for branchContext.json (can be enhanced)
              if (document.path.value === 'branchContext.json') {
                  const requiredKeys = ['schema', 'metadata', 'content'];
                  for (const key of requiredKeys) {
                      if (!(key in parsedContent)) {
                          throw new DomainError(DomainErrorCodes.INVALID_DOCUMENT_FORMAT, `Missing required key in branchContext.json: ${key}`);
                      }
                  }
              }

              contentToSave = JSON.stringify(parsedContent, null, 2);
              logger.debug('[DocumentIO] Updated metadata before saving JSON file.');
          } catch (err: unknown) {
              logger.error('[DocumentIO] Invalid JSON content provided for .json file:', {
                  error: err instanceof Error ? err.message : String(err),
                  filePath: filePath
              });
              throw new DomainError(
                  DomainErrorCodes.INVALID_DOCUMENT_FORMAT,
                  `Invalid JSON content for file ${document.path.value}`
              );
          }
      } else {
          contentToSave = document.content;
      }

      const parentDir = path.dirname(filePath);
      await fs.mkdir(parentDir, { recursive: true });
      logger.debug('[DocumentIO] Ensured parent directory exists:', { parentDir });

      await fs.writeFile(filePath, contentToSave, 'utf-8');
      logger.debug('[DocumentIO] Successfully wrote file:', { filePath });



    } catch (error: unknown) {
      logger.error('[DocumentIO] Failed to save document:', { filePath, error });
      throw new DomainError(
        DomainErrorCodes.REPOSITORY_ERROR,
        `Failed to save document ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Deletes a document from the file system.
   * @param branchInfo Branch information
   * @param documentPath Document path
   * @returns Promise resolving to boolean indicating success
   */
  async deleteDocument(branchInfo: BranchInfo, documentPath: DocumentPath): Promise<boolean> {
     const filePath = this.getFullFilePath(branchInfo, documentPath);
     logger.debug(`[DocumentIO] Attempting to delete document: ${filePath}`);
    try {
      await fs.unlink(filePath);
      // Also delete corresponding .md file if .json is deleted
      if (filePath.endsWith('.json')) {
          const mdFilePath = filePath.replace('.json', '.md');
          try {
              await fs.unlink(mdFilePath);
              logger.debug('[DocumentIO] Also deleted corresponding .md file:', { path: mdFilePath });
          } catch (mdError: unknown) {
              if (!(mdError instanceof Error && (mdError as NodeJS.ErrnoException).code === 'ENOENT')) {
                  logger.warn('[DocumentIO] Error deleting corresponding .md file:', { path: mdFilePath, error: mdError });
              }
          }
      }
      return true;
    } catch (error: unknown) {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
            logger.warn(`[DocumentIO] Attempted to delete non-existent file: ${filePath}`);
        } else {
            logger.error(`[DocumentIO] Error deleting file ${filePath}:`, error);
        }
        return false;
    }
  }
}
