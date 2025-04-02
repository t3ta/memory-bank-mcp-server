import { JsonDocumentRepository } from '../../../domain/repositories/JsonDocumentRepository.js';
import { JsonPatchOperation } from '../../../domain/jsonpatch/JsonPatchOperation.js';
import { JsonPatchService } from '../../../domain/jsonpatch/JsonPatchService.js';
import { Rfc6902JsonPatchAdapter } from '../../../domain/jsonpatch/Rfc6902JsonPatchAdapter.js'; // Correct file path casing
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import { JsonDocument } from '../../../domain/entities/JsonDocument.js';
import { DocumentVersionInfo } from '../../../domain/entities/DocumentVersionInfo.js';
import { DocumentEventEmitter } from '../../../domain/events/DocumentEventEmitter.js';
import { EventType } from '../../../domain/events/EventType.js';

/**
 * Use case for partially updating a document using JSON Patch
 */
export class JsonPatchUseCase {
  private readonly repository: JsonDocumentRepository;
  private readonly patchService: JsonPatchService;
  private readonly eventEmitter: DocumentEventEmitter;

  /**
   * Constructor
   * @param repository JSON document repository
   * @param eventEmitter Document event emitter
   * @param patchService JsonPatchService (uses Rfc6902JsonPatchAdapter if omitted)
   */
  constructor(
    repository: JsonDocumentRepository,
    eventEmitter: DocumentEventEmitter,
    patchService?: JsonPatchService
  ) {
    this.repository = repository;
    this.eventEmitter = eventEmitter;
    this.patchService = patchService ?? new Rfc6902JsonPatchAdapter(); // Use the refactored adapter
  }

  /**
   * Apply patch operations to a document
   * @param path Document path
   * @param operations Array of patch operations to apply
   * @param branch Branch name (uses branch memory bank if specified, global otherwise)
   * @param updateReason Reason for the update (optional)
   * @returns Updated JSON document
   * @throws DomainError if document not found, operation invalid, or other errors
   */
  async execute(
    path: string,
    operations: JsonPatchOperation[],
    branch?: string,
    updateReason?: string
  ): Promise<JsonDocument> {
    // Get the document
    const document = await this.getDocument(path, branch);
    if (!document) {
      throw new DomainError(
        DomainErrorCodes.DOCUMENT_NOT_FOUND,
        `Document not found: ${path}${branch ? ` in branch ${branch}` : ''}`
      );
    }

    // Validate patch operations
    const isValid = this.patchService.validate(document.content, operations);
    if (!isValid) {
      throw new DomainError(
        DomainErrorCodes.INVALID_JSON_PATCH_OPERATION,
        'Invalid JSON patch operation'
      );
    }

    // Apply patch operations
    const updatedContent = this.patchService.apply(document.content, operations);

    // Create new document version info
    const updatedVersionInfo = new DocumentVersionInfo({
      version: document.versionInfo.version + 1,
      lastModified: new Date(),
      modifiedBy: 'system',
      updateReason: updateReason || 'Updated via JSON Patch'
    });

    // Create updated document
    const updatedDocument = JsonDocument.create({
      path: document.path,
      id: document.id,
      title: document.title,
      documentType: document.documentType,
      tags: document.tags,
      content: updatedContent,
      branch: document.branch,
      versionInfo: updatedVersionInfo
    });

    // Save the document
    const savedDocument = await this.saveDocument(updatedDocument);

    // Emit update event
    this.eventEmitter.emit(EventType.DOCUMENT_UPDATED, {
      path: savedDocument.path,
      branch: savedDocument.branch,
      versionInfo: savedDocument.versionInfo
    });

    return savedDocument;
  }

  /**
   * Apply multiple patch operations atomically
   * @param path Document path
   * @param operations Array of patch operations to apply
   * @param branch Branch name (uses branch memory bank if specified, global otherwise)
   * @param updateReason Reason for the update (optional)
   * @returns Updated JSON document
   * @throws DomainError if document not found, operation invalid, or other errors
   */
  async executeBatch(
    path: string,
    operations: JsonPatchOperation[],
    branch?: string,
    updateReason?: string
  ): Promise<JsonDocument> {
    // Use the regular execute method (already ensures atomicity)
    return this.execute(path, operations, branch, updateReason || 'Batch update via JSON Patch');
  }

  /**
   * Generate patch operations representing the difference between two documents
   * @param sourcePath Path of the source document
   * @param targetPath Path of the target document
   * @param sourceBranch Branch of the source document (optional)
   * @param targetBranch Branch of the target document (optional)
   * @returns Array of generated patch operations
   * @throws DomainError if documents are not found
   */
  async generatePatch(
    sourcePath: string,
    targetPath: string,
    sourceBranch?: string,
    targetBranch?: string
  ): Promise<JsonPatchOperation[]> {
    // Get source document
    const sourceDocument = await this.getDocument(sourcePath, sourceBranch);
    if (!sourceDocument) {
      throw new DomainError(
        DomainErrorCodes.DOCUMENT_NOT_FOUND,
        `Source document not found: ${sourcePath}${sourceBranch ? ` in branch ${sourceBranch}` : ''}`
      );
    }

    // Get target document
    const targetDocument = await this.getDocument(targetPath, targetBranch);
    if (!targetDocument) {
      throw new DomainError(
        DomainErrorCodes.DOCUMENT_NOT_FOUND,
        `Target document not found: ${targetPath}${targetBranch ? ` in branch ${targetBranch}` : ''}`
      );
    }

    // Generate patch operations
    return this.patchService.generatePatch(sourceDocument.content, targetDocument.content);
  }

  /**
   * Apply patch operations after verifying test conditions
   * @param path Document path
   * @param operations Array including test and update operations
   * @param branch Branch name (uses branch memory bank if specified, global otherwise)
   * @param updateReason Reason for the update (optional)
   * @returns Updated JSON document
   * @throws DomainError if document not found, test fails, operation invalid, or other errors
   */
  async executeConditional(
    path: string,
    operations: JsonPatchOperation[],
    branch?: string,
    updateReason?: string
  ): Promise<JsonDocument> {
    // Use the execute method (patchService's apply method will throw if test fails)
    return this.execute(
      path,
      operations,
      branch,
      updateReason || 'Conditional update via JSON Patch'
    );
  }

  /**
   * Get a document (uses appropriate repository method based on branch presence)
   * @param path Document path
   * @param branch Branch name (optional)
   * @returns JSON document or null if not found
   */
  private async getDocument(path: string, branch?: string): Promise<JsonDocument | null> {
    return branch
      ? await this.repository.findBranchDocument(path, branch)
      : await this.repository.findGlobalDocument(path);
  }

  /**
   * Save a document (uses appropriate repository method based on branch presence)
   * @param document Document to save
   * @returns Saved document
   */
  private async saveDocument(document: JsonDocument): Promise<JsonDocument> {
    return document.branch
      ? await this.repository.saveBranchDocument(document)
      : await this.repository.saveGlobalDocument(document);
  }
}
