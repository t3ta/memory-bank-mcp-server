/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, type TestEnv } from '../helpers/test-env.js';
import { loadGlobalFixture, getFixtureContent } from '../helpers/fixtures-loader.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { WriteGlobalDocumentUseCase, type WriteGlobalDocumentOutput } from '../../../src/application/usecases/global/WriteGlobalDocumentUseCase.js'; // Import real UseCase and types
import { ReadGlobalDocumentUseCase } from '../../../src/application/usecases/global/ReadGlobalDocumentUseCase.js'; // Keep Read UseCase for verification
import { DomainError, DomainErrors } from '../../../src/shared/errors/DomainError.js'; // Import specific errors for checking
import { ApplicationErrors } from '../../../src/shared/errors/ApplicationError.js'; // Import specific errors for checking

import fs from 'fs-extra'; // Use default import for fs-extra
import * as path from 'path';

describe('WriteGlobalDocumentUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer; // Use DI container
  let writeUseCase: WriteGlobalDocumentUseCase;
  let readUseCase: ReadGlobalDocumentUseCase;

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // Get the use case instances from container
    writeUseCase = await container.get<WriteGlobalDocumentUseCase>('writeGlobalDocumentUseCase');
    readUseCase = await container.get<ReadGlobalDocumentUseCase>('readGlobalDocumentUseCase');
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('execute', () => {
    it('should create a new document', async () => {
      const newDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-new-document",
          title: "テスト新規ドキュメント",
          documentType: "test",
          path: "test/new-document.json",
          tags: ["test", "integration"],
          lastModified: expect.any(String),
          createdAt: expect.any(String),
          version: 1
        },
        content: {
          sections: [
            {
              title: "テストセクション",
              content: "これは統合テスト用の新規ドキュメントです。"
            }
          ]
        }
      };
      const documentPath = 'test/new-document.json';
      const documentContentString = JSON.stringify(newDocument, null, 2);

      const result = await writeUseCase.execute({
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newDocument.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      expect(readDocument.schema).toBe('memory_document_v2');
      expect(readDocument.metadata.id).toBe('test-new-document');
      expect(readDocument.metadata.documentType).toBe('test');
    });

    it('should update an existing document', async () => {
      const originalDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-update-document",
          title: "更新前ドキュメント",
          documentType: "test",
          path: "test/update-document.json",
          tags: ["test", "integration"],
          lastModified: expect.any(String),
          createdAt: expect.any(String),
          version: 1
        },
        content: {
          value: "更新前の内容"
        }
      };
      const documentPath = 'test/update-document.json';
      const originalContentString = JSON.stringify(originalDocument, null, 2);

      await writeUseCase.execute({
        document: {
          path: documentPath,
          content: originalContentString,
          tags: originalDocument.metadata.tags
        }
      });

      const updatedDocumentData = {
        ...originalDocument,
        metadata: {
          ...originalDocument.metadata,
          title: "更新後ドキュメント",
          lastModified: new Date().toISOString(),
          version: 2
        },
        content: {
          value: "更新後の内容"
        }
      };
      const updatedContentString = JSON.stringify(updatedDocumentData, null, 2);

      const result = await writeUseCase.execute({
        document: {
          path: documentPath,
          content: updatedContentString,
          tags: updatedDocumentData.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      expect(readDocument.metadata.title).toBe('更新後ドキュメント');
      expect(readDocument.metadata.version).toBe(2); // Version should be updated
      expect(readDocument.content.value).toBe('更新後の内容');
    });

    it('should return an error for invalid JSON content', async () => {
      // Invalid JSON content (missing closing bracket)
      const invalidContent = '{"schema": "memory_document_v2", "metadata": {}'; // Invalid JSON

      await expect(writeUseCase.execute({
        document: {
          path: 'test/invalid.json',
          content: invalidContent
        }
      })).rejects.toThrow(DomainError); // Check for DomainError class
    });


    it('should handle path mismatch between input and metadata (uses input path)', async () => {
      // Document with mismatched path in metadata vs. input path
      const mismatchedDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-path-mismatch",
          title: "パス不一致ドキュメント",
          documentType: "test",
          path: "different/path.json", // Mismatched path
          tags: ["test"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          value: "パス不一致の内容"
        }
      };
      const actualPath = 'test/actual-path.json';
      const mismatchedContentString = JSON.stringify(mismatchedDocument, null, 2);

      // Current implementation uses the input path, ignoring metadata path during save.
      const result = await writeUseCase.execute({
        document: {
          path: actualPath,
          content: mismatchedContentString
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(actualPath);

      const readResult = await readUseCase.execute({ path: actualPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      // Check that the file is saved at 'actualPath', metadata path might be ignored/overwritten.
      expect(readDocument.metadata.id).toBe("test-path-mismatch");
    });
    it('should throw an error when attempting to write to a path outside the allowed directory', async () => {
      const invalidPath = '../outside-global-memory.json'; // Path traversal attempt
      const documentContent = JSON.stringify({
        schema: "memory_document_v2",
        metadata: {
          id: "test-invalid-path",
          title: "不正パスドキュメント",
          documentType: "test",
          path: invalidPath, // Metadata path might be ignored, but include for completeness
          tags: ["test", "error"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: { value: "This should not be written" }
      }, null, 2);

      await expect(writeUseCase.execute({
        document: {
          path: invalidPath,
          content: documentContent
        }
      })).rejects.toThrow(DomainError); // Expect a DomainError for invalid path

      // Optionally, verify the file was NOT created outside the directory
      const potentiallyCreatedPath = path.resolve(testEnv.docRoot, '..', 'outside-global-memory.json');
      expect(fs.existsSync(potentiallyCreatedPath)).toBe(false); // Use existsSync after correct import
    });
  });
});
