/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { WriteBranchDocumentUseCase, type WriteBranchDocumentOutput } from '../../../src/application/usecases/branch/WriteBranchDocumentUseCase.js'; // Import real UseCase and types
import { ReadBranchDocumentUseCase } from '../../../src/application/usecases/branch/ReadBranchDocumentUseCase.js'; // Keep Read UseCase for verification
import { DomainErrors } from '../../../src/shared/errors/DomainError.js'; // Import specific errors for checking
import { ApplicationErrors } from '../../../src/shared/errors/ApplicationError.js'; // Import specific errors for checking

import * as path from 'path';
import fs from 'fs-extra'; // Use default import for fs-extra

describe('WriteBranchDocumentUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer; // Use DI container
  let writeUseCase: WriteBranchDocumentUseCase;
  let readUseCase: ReadBranchDocumentUseCase;
  const TEST_BRANCH = 'feature/test-branch';

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Create test branch directory
    await createBranchDir(testEnv, TEST_BRANCH);

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // Get the use case instances from container
    writeUseCase = await container.get<WriteBranchDocumentUseCase>('writeBranchDocumentUseCase');
    readUseCase = await container.get<ReadBranchDocumentUseCase>('readBranchDocumentUseCase');
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('execute', () => {
    it('should create a new branch document', async () => {
      const newDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-new-branch-document",
          title: "テスト新規ブランチドキュメント",
          documentType: "test",
          path: "test/new-document.json",
          tags: ["test", "integration", "branch"],
          lastModified: new Date().toISOString(), // Use valid ISO string
          createdAt: expect.any(String),
          version: 1
        },
        content: {
          sections: [
            {
              title: "テストセクション",
              content: "これはブランチテスト用の新規ドキュメントです。"
            }
          ]
        }
      };
      const documentPath = 'test/new-document.json';
      const documentContentString = JSON.stringify(newDocument, null, 2);

      const result = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newDocument.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      expect(readDocument.schema).toBe('memory_document_v2');
      expect(readDocument.metadata.id).toBe('test-new-branch-document');
      expect(readDocument.metadata.documentType).toBe('test');
    });

    it('should update an existing branch document', async () => {
      const originalDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-update-branch-document",
          title: "更新前ブランチドキュメント",
          documentType: "test",
          path: "test/update-document.json",
          tags: ["test", "integration", "branch"],
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
        branchName: TEST_BRANCH,
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
          title: "更新後ブランチドキュメント",
          lastModified: new Date().toISOString(),
          version: 2
        },
        content: {
          value: "更新後の内容"
        }
      };
      const updatedContentString = JSON.stringify(updatedDocumentData, null, 2);

      const result = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: updatedContentString,
          tags: updatedDocumentData.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      expect(readDocument.metadata.title).toBe('更新後ブランチドキュメント');
      expect(readDocument.content.value).toBe('更新後の内容');
    });

    it('should return an error for invalid JSON content', async () => {
      const invalidContent = '{"schema": "memory_document_v2", "metadata": {}'; // Invalid JSON

      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: 'test/invalid.json',
          content: invalidContent
        }
      })).rejects.toThrow('Document content is not valid JSON'); // Revert back to checking the error message string
    });


    it('should create a document when initializing a new branch', async () => {
      const NEW_BRANCH = 'feature/new-branch-test-auto-init';
      const newBranchDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-new-branch",
          title: "新規ブランチテスト",
          documentType: "test",
          path: "test-new-branch.json",
          tags: ["test", "new-branch"],
          lastModified: new Date().toISOString(), // Use valid ISO string
          createdAt: expect.any(String),
          version: 1
        },
        content: {
          value: "新規ブランチのテストドキュメント"
        }
      };
      const documentPath = 'test-new-branch.json';
      const documentContentString = JSON.stringify(newBranchDocument, null, 2);

      const result = await writeUseCase.execute({
        branchName: NEW_BRANCH,
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newBranchDocument.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ branchName: NEW_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      expect(readDocument.metadata.id).toBe('test-new-branch');
      expect(readDocument.content.value).toBe('新規ブランチのテストドキュメント');
    });
    it('should throw an error when attempting to write to a path outside the allowed branch directory', async () => {
      const invalidPath = '../outside-branch-memory.json'; // Path traversal attempt
      const documentContent = JSON.stringify({
        schema: "memory_document_v2",
        metadata: {
          id: "test-invalid-branch-path",
          title: "不正パスブランチドキュメント",
          documentType: "test",
          path: invalidPath, // Metadata path might be ignored
          tags: ["test", "error", "branch"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: { value: "This should not be written in branch" }
      }, null, 2);

      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: invalidPath,
          content: documentContent
        }
      })).rejects.toThrow(DomainErrors.validationError('Document path cannot contain ".."')); // Match actual error message

      // Optionally, verify the file was NOT created outside the branch directory
      const branchPath = path.join(testEnv.branchMemoryPath, TEST_BRANCH);
      const potentiallyCreatedPath = path.resolve(branchPath, invalidPath);
      // Ensure the potentially created path is not within the expected branch directory structure
      // This check might be complex depending on the exact path resolution logic,
      // but checking existence outside the main doc root is a good start.
      const pathOutsideDocsRoot = path.resolve(testEnv.docRoot, '..', 'outside-branch-memory.json');
      expect(fs.existsSync(potentiallyCreatedPath)).toBe(false);
      expect(fs.existsSync(pathOutsideDocsRoot)).toBe(false);
    });

    it('should update a document using patches', async () => {
      const initialDocument = {
        items: ["apple"]
      };
      const documentPath = 'test/patch-document.json';
      const initialContentString = JSON.stringify(initialDocument, null, 2);

      // 1. Create initial document with content
      await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: initialContentString,
          tags: ["test", "patch"]
        }
      });

      // 2. Update the document using patches
      const patches = [
        { op: 'add', path: '/items/-', value: 'banana' }
      ];

      const patchResult = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { // Need path and potentially tags, content is empty string for type safety
          path: documentPath,
          content: '', // Pass empty string as content is required by DTO type
          tags: ["test", "patch", "updated"] // Optionally update tags too
        },
        patches: patches
      });

      expect(patchResult).toBeDefined();
      expect(patchResult.document).toBeDefined();
      expect(patchResult.document.path).toBe(documentPath);

      // 3. Read the document and verify the patch was applied
      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      // Log the actual content read from the file for debugging
      // Log the raw content string read from the file before parsing
      console.error('--- Raw content after patch read from file:', readResult.document.content);

      const readDocument = JSON.parse(readResult.document.content);
      // Log the parsed document object for debugging
      console.error('--- Parsed document object:', JSON.stringify(readDocument, null, 2));
      expect(readDocument.items).toEqual(["apple", "banana"]); // Verify patch applied correctly
      // Also verify tags if they were updated
      expect(readResult.document.tags).toEqual(["test", "patch", "updated"]);
    }); // Closing brace for it('should update a document using patches', ...)
  }); // Closing brace for describe('execute', ...)
}); // Closing brace for the top-level describe
