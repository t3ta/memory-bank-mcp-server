import { MemoryDocument } from '../../domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { Tag } from '../../domain/entities/Tag.js';
import { JsonPatchService } from '../../domain/jsonpatch/JsonPatchService.js';
import { JsonPatchOperation } from '../../domain/jsonpatch/JsonPatchOperation.js';
import { ApplicationErrors } from '../../shared/errors/ApplicationError.js';
import { logger } from '../../shared/utils/logger.js';
import type { IDocumentRepository } from '../../domain/repositories/IDocumentRepository.js'; // Import the common interface

/**
 * Input for the DocumentWriterService write method
 */
export interface DocumentWriterInput {
  path: DocumentPath;
  content?: string; // Full content (exclusive with patches)
  patches?: any[]; // JSON Patch operations (exclusive with content)
  tags?: Tag[]; // Tags to associate (optional, repository handles indexing)
}

/**
 * Service responsible for the core logic of writing/patching documents.
 */
export class DocumentWriterService {
  private readonly componentLogger = logger.withContext({ component: 'DocumentWriterService' });

  constructor(private readonly patchService: JsonPatchService) {}

  /**
   * Writes or patches a document using the provided repository.
   * Handles common logic like input validation, patch application, and content update/creation.
   * Tag indexing is expected to be handled by the repository's saveDocument implementation.
   *
   * @param repository The specific repository (Branch or Global) to use.
   * @param input The details of the document to write or patch.
   * @returns The saved MemoryDocument.
   * @throws {ApplicationError} If input is invalid, patching fails, or repository interaction fails.
   */
  async write(
    repository: IDocumentRepository, // Assuming a common interface exists or will be created
    input: DocumentWriterInput
  ): Promise<MemoryDocument> {
    this.componentLogger.info(`Writing document: ${input.path.value}`, {
      hasContent: input.content !== undefined && input.content !== null,
      hasPatches: input.patches && input.patches.length > 0,
    });

    // 1. Input Validation
    const hasContent = input.content !== undefined && input.content !== null;
    const hasPatches = input.patches && Array.isArray(input.patches) && input.patches.length > 0;

    if (!hasContent && !hasPatches) {
      throw ApplicationErrors.invalidInput('Either document content or patches must be provided');
    }
    if (hasContent && hasPatches) {
      throw ApplicationErrors.invalidInput('Cannot provide both document content and patches simultaneously');
    }

    // 2. Get Existing Document (if needed or exists)
    const existingDocument = await repository.getDocument(input.path);

    let documentToSave: MemoryDocument;

    // 3. Apply Patches if provided
    if (hasPatches) {
      this.componentLogger.debug('Processing write request with patches.', { path: input.path.value });
      if (!existingDocument) {
        throw ApplicationErrors.notFound('Document', input.path.value, { message: 'Cannot apply patches to non-existent document.' });
      }

      try {
        let currentContentObject: any;
        if (typeof existingDocument.content === 'string') {
          try {
            currentContentObject = JSON.parse(existingDocument.content);
          } catch (parseError) {
            throw ApplicationErrors.executionFailed(`Failed to parse existing document content as JSON for patching: ${(parseError as Error).message}`, parseError instanceof Error ? parseError : undefined);
          }
        } else if (typeof existingDocument.content === 'object' && existingDocument.content !== null) {
          currentContentObject = existingDocument.content; // Already an object
        } else {
          throw ApplicationErrors.executionFailed(`Existing document content is not a string or object, cannot apply patches. Type: ${typeof existingDocument.content}`);
        }

        const patchOperations = (input.patches ?? []).map(p =>
          JsonPatchOperation.create(p.op, p.path, p.value, p.from)
        );

        // --- Test Operation Validation ---
        const testOperations = patchOperations.filter(op => op.op === 'test');
        if (testOperations.length > 0) {
          this.componentLogger.debug('Validating test operations before applying patch', { path: input.path.value, testOperations });
          for (const testOp of testOperations) {
             if (testOp.op !== 'test' || testOp.value === undefined) {
                throw ApplicationErrors.invalidInput(`Invalid test operation format: ${JSON.stringify(testOp)}`);
             }
             try {
                const expectedValue = testOp.value;
                let actualValue: any = currentContentObject;
                const segments = testOp.path.segments.slice(1); // Exclude root segment

                for (const segment of segments) {
                   if (actualValue && typeof actualValue === 'object' && segment in actualValue) {
                      actualValue = actualValue[segment];
                   } else if (Array.isArray(actualValue) && /^\d+$/.test(segment)) {
                      const index = parseInt(segment, 10);
                      if (index >= 0 && index < actualValue.length) {
                         actualValue = actualValue[index];
                      } else {
                         throw new Error(`Path not found at index: ${segment}`);
                      }
                   } else {
                      throw new Error(`Path not found: ${testOp.path.path}`);
                   }
                }

                if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
                   throw new Error(`Value mismatch at path ${testOp.path.path}. Expected: ${JSON.stringify(expectedValue)}, Actual: ${JSON.stringify(actualValue)}`);
                }
                this.componentLogger.debug('Test operation successful:', { testOp });
             } catch (testError) {
                this.componentLogger.error('Patch test operation failed:', { path: input.path.value, testOp, error: testError });
                const cause = testError instanceof Error ? testError : undefined;
                throw ApplicationErrors.invalidInput(`Patch test operation failed: ${cause?.message ?? 'Test failed'}`, { cause });
             }
          }
        }
        // --- Apply Non-Test Patches ---
        const nonTestOperations = patchOperations.filter(op => op.op !== 'test');
        const patchedContent = this.patchService.apply(currentContentObject, nonTestOperations);
        const stringifiedContent = JSON.stringify(patchedContent, null, 2);

        documentToSave = existingDocument.updateContent(stringifiedContent);
        // Update tags on the MemoryDocument object if provided in input
        if (input.tags) {
            documentToSave = documentToSave.updateTags(input.tags);
            this.componentLogger.debug('Tags updated on MemoryDocument along with patches.', { path: input.path.value, newTags: input.tags.map(t => t.value) });
        }

      } catch (patchError) {
        this.componentLogger.error(`Failed to apply JSON patch to ${input.path.value}`, { error: patchError });
        throw ApplicationErrors.executionFailed(`Failed to apply JSON patch: ${(patchError as Error).message}`, patchError instanceof Error ? patchError : undefined);
      }
    }
    // 4. Handle Content Update/Creation
    else if (hasContent) {
      this.componentLogger.debug('Processing write request with content.', { path: input.path.value });
      const contentToWrite = input.content ?? ''; // Use empty string if content is null/undefined (shouldn't happen due to validation, but safe)
      const tagsToApply = input.tags ?? []; // Use provided tags or empty array

      if (existingDocument) {
        documentToSave = existingDocument.updateContent(contentToWrite);
        documentToSave = documentToSave.updateTags(tagsToApply); // Always update tags based on input
      } else {
        documentToSave = MemoryDocument.create({
          path: input.path,
          content: contentToWrite,
          tags: tagsToApply,
          lastModified: new Date(),
        });
      }
    } else {
       // Should be unreachable due to initial validation
       throw ApplicationErrors.executionFailed('Invalid state: No content or patches to process.');
    }

    // 5. Save Document via Repository
    this.componentLogger.debug(`Saving document ${documentToSave.path.value} via repository.`);
    await repository.saveDocument(documentToSave);

    // 6. Return the saved document (repository might update lastModified or other fields)
    // It might be safer to re-fetch, but let's return the object we passed to save for now.
    // The UseCase might re-fetch if it needs the absolute latest state (e.g., for tag index updates).
    return documentToSave;
  }
}

// TODO: Define or import a common IDocumentRepository interface
// This interface should likely include:
// - getDocument(path: DocumentPath): Promise<MemoryDocument | null>
// - saveDocument(document: MemoryDocument): Promise<void>
// - exists?(identifier: string): Promise<boolean>; // Optional, if needed by service
// - initialize?(identifier: any): Promise<void>; // Optional
