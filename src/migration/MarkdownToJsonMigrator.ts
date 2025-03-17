/**
 * Markdown to JSON Migrator
 *
 * This module provides functionality to migrate Markdown documents to JSON format.
 * It handles different document types and ensures output conforms to JSON schemas.
 */
import path from 'path';
import { promises as fs } from 'fs';
import { DocumentPath } from '../domain/entities/DocumentPath.js';
import { DocumentId } from '../domain/entities/DocumentId.js';
import { JsonDocument, DocumentType } from '../domain/entities/JsonDocument.js';
import { DomainError, DomainErrorCodes } from '../shared/errors/DomainError.js';
import { MigrationBackup } from './MigrationBackup.js';
import { MigrationValidator } from './MigrationValidator.js';
import { ConverterFactory } from './converters/ConverterFactory.js';
import { Logger } from '../shared/utils/logger.js';

/**
 * Migration options
 */
export interface MigrationOptions {
  /**
   * Whether to create a backup before migration
   * @default true
   */
  createBackup?: boolean;

  /**
   * Whether to replace existing JSON files
   * @default false
   */
  overwriteExisting?: boolean;

  /**
   * Whether to validate generated JSON against schema
   * @default true
   */
  validateJson?: boolean;

  /**
   * Whether to delete original Markdown files after successful migration
   * @default false
   */
  deleteOriginals?: boolean;
}

/**
 * Migration result statistics
 */
export interface MigrationStats {
  /**
   * Number of files successfully migrated
   */
  successCount: number;

  /**
   * Number of files that failed to migrate
   */
  failureCount: number;

  /**
   * Number of files skipped (already migrated or not markdown)
   */
  skippedCount: number;

  /**
   * List of files that failed to migrate with error messages
   */
  failures: { path: string; error: string }[];

  /**
   * Backup directory path if created
   */
  backupPath?: string;
}

/**
 * Result of a migration operation
 */
export interface MigrationResult {
  /**
   * Whether the migration was successful
   */
  success: boolean;

  /**
   * Statistics about the migration
   */
  stats: MigrationStats;

  /**
   * Error message if migration failed
   */
  error?: string;
}

/**
 * Main migration class to convert Markdown files to JSON
 */
export class MarkdownToJsonMigrator {
  /**
   * @param backupService Backup service to create backups
   * @param validator Validator to validate generated JSON
   * @param converterFactory Factory to create appropriate converters
   * @param logger Logger instance
   */
  constructor(
    private readonly backupService: MigrationBackup,
    private readonly validator: MigrationValidator,
    private readonly converterFactory: ConverterFactory,
    private readonly logger: Logger
  ) {}

  /**
   * Migrate all Markdown files in a directory to JSON
   * @param directory Directory to migrate
   * @param options Migration options
   * @returns Migration result
   */
  async migrateDirectory(
    directory: string,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const {
      createBackup = true,
      overwriteExisting = false,
      validateJson = true,
      deleteOriginals = false,
    } = options;

    // Initialize result
    const result: MigrationResult = {
      success: true,
      stats: {
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        failures: [],
      },
    };

    try {
      // Create backup if requested
      if (createBackup) {
        this.logger.info(`Creating backup of directory: ${directory}`);
        const backupPath = await this.backupService.createBackup(directory);
        result.stats.backupPath = backupPath;
        this.logger.info(`Backup created at: ${backupPath}`);
      }

      // Find all markdown files in directory and subdirectories
      const files = await this.findMarkdownFiles(directory);
      this.logger.info(`Found ${files.length} Markdown files to process`);

      // Process each file
      for (const file of files) {
        try {
          this.logger.debug(`Processing file: ${file}`);

          // Create document path
          const relativePath = path.relative(directory, file);
          const documentPath = DocumentPath.create(relativePath);

          // Skip non-markdown files
          if (!documentPath.isMarkdown) {
            this.logger.debug(`Skipping non-markdown file: ${file}`);
            result.stats.skippedCount++;
            continue;
          }

          // Check if JSON version already exists
          const jsonPath = this.getJsonPath(file);
          const jsonExists = await this.fileExists(jsonPath);

          if (jsonExists && !overwriteExisting) {
            this.logger.debug(`Skipping already migrated file: ${file}`);
            result.stats.skippedCount++;
            continue;
          }

          // Migrate file
          const migrationSuccess = await this.migrateFile(file, jsonPath, { validateJson });

          if (migrationSuccess) {
            result.stats.successCount++;

            // Delete original if requested
            if (deleteOriginals) {
              await fs.unlink(file);
              this.logger.debug(`Deleted original file: ${file}`);
            }
          } else {
            result.stats.failureCount++;
            result.stats.failures.push({
              path: file,
              error: 'Migration failed without throwing an error',
            });
          }
        } catch (error) {
          this.logger.error(`Error migrating file ${file}: ${(error as Error).message}`);
          result.stats.failureCount++;
          result.stats.failures.push({
            path: file,
            error: (error as Error).message,
          });
        }
      }

      // Log summary
      this.logger.info(
        `Migration complete. Success: ${result.stats.successCount}, Failed: ${result.stats.failureCount}, Skipped: ${result.stats.skippedCount}`
      );

      // Set success flag based on failure count
      result.success = result.stats.failureCount === 0;

      return result;
    } catch (error) {
      this.logger.error(`Fatal error during migration: ${(error as Error).message}`);

      return {
        success: false,
        stats: result.stats,
        error: `Migration failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Migrate a single Markdown file to JSON
   * @param filePath Path to Markdown file
   * @param jsonPath Path to output JSON file (if not provided, will be derived from filePath)
   * @param options Migration options
   * @returns true if migration was successful
   */
  async migrateFile(
    filePath: string,
    jsonPath?: string,
    options: Pick<MigrationOptions, 'validateJson'> = {}
  ): Promise<boolean> {
    const { validateJson = true } = options;

    try {
      // Read markdown content
      const markdownContent = await fs.readFile(filePath, 'utf-8');

      // Determine output path
      const outputPath = jsonPath || this.getJsonPath(filePath);

      // Convert to JsonDocument
      const documentPath = DocumentPath.create(path.basename(filePath));
      const jsonDocument = await this.convertMarkdownToJson(markdownContent, documentPath);

      // Validate if requested
      if (validateJson) {
        const isValid = this.validator.validateJson(
          jsonDocument.toObject(),
          jsonDocument.documentType
        );

        if (!isValid.success) {
          throw new DomainError(
            DomainErrorCodes.VALIDATION_ERROR,
            `Generated JSON is invalid: ${isValid.errors?.join(', ')}`
          );
        }
      }

      // Ensure output directory exists
      await this.ensureDirectoryExists(path.dirname(outputPath));

      // Write JSON file
      await fs.writeFile(outputPath, jsonDocument.toString(true), 'utf-8');
      this.logger.debug(`Successfully converted ${filePath} to ${outputPath}`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to migrate file ${filePath}: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Convert markdown content to JsonDocument
   * @param markdownContent Markdown content
   * @param documentPath Document path
   * @returns JsonDocument instance
   */
  private async convertMarkdownToJson(
    markdownContent: string,
    documentPath: DocumentPath
  ): Promise<JsonDocument> {
    // Detect document type based on content and path
    const documentType = await this.detectDocumentType(markdownContent, documentPath.value);

    // Get appropriate converter
    const converter = this.converterFactory.getConverter(documentType);

    // Convert to JsonDocument
    return converter.convert(markdownContent, documentPath);
  }

  /**
   * Detect document type from content and path
   * @param content Markdown content
   * @param path Document path
   * @returns Document type
   */
  private async detectDocumentType(content: string, path: string): Promise<DocumentType> {
    const filename = path.toLowerCase();

    // Detect by filename pattern
    if (filename.includes('branchcontext') || filename.includes('branch-context')) {
      return 'branch_context';
    } else if (filename.includes('activecontext') || filename.includes('active-context')) {
      return 'active_context';
    } else if (filename.includes('progress')) {
      return 'progress';
    } else if (filename.includes('systempatterns') || filename.includes('system-patterns')) {
      return 'system_patterns';
    }

    // Fall back to detecting by content
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.startsWith('# ')) {
      const title = firstLine.substring(2).trim().toLowerCase();

      if (title.includes('branch context') || title.includes('ブランチコンテキスト')) {
        return 'branch_context';
      } else if (title.includes('active context') || title.includes('アクティブコンテキスト')) {
        return 'active_context';
      } else if (title.includes('progress') || title.includes('進捗')) {
        return 'progress';
      } else if (title.includes('system patterns') || title.includes('システムパターン')) {
        return 'system_patterns';
      }
    }

    // Default to generic type
    return 'generic';
  }

  /**
   * Get JSON path from markdown path
   * @param markdownPath Markdown file path
   * @returns JSON file path
   */
  private getJsonPath(markdownPath: string): string {
    return markdownPath.replace(/\.md$/, '.json');
  }

  /**
   * Find all markdown files in a directory
   * @param directory Directory to search
   * @returns Array of file paths
   */
  private async findMarkdownFiles(directory: string): Promise<string[]> {
    const result: string[] = [];

    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        const subdirFiles = await this.findMarkdownFiles(fullPath);
        result.push(...subdirFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Add markdown files
        result.push(fullPath);
      }
    }

    return result;
  }

  /**
   * Check if a file exists
   * @param filePath File path
   * @returns true if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists, create if needed
   * @param directory Directory path
   */
  private async ensureDirectoryExists(directory: string): Promise<void> {
    try {
      await fs.mkdir(directory, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}
