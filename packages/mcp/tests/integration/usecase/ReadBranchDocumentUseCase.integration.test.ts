/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { loadBranchFixture } from '../helpers/fixtures-loader.js';
// import { createTestApplication } from '../helpers/app-factory.js'; // Removed app-factory
// import { Application } from '../../../src/main/Application.js'; // Removed Application import
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { ReadBranchDocumentUseCase, type ReadBranchDocumentOutput } from '../../../src/application/usecases/branch/ReadBranchDocumentUseCase.js'; // Import real UseCase and types
import { BranchInfo } from '../../../src/domain/entities/BranchInfo.js'; // Import BranchInfo
import { DomainErrors } from '../../../src/shared/errors/DomainError.js'; // Import specific errors for checking
import { ApplicationErrors } from '../../../src/shared/errors/ApplicationError.js'; // Import specific errors for checking

import * as path from 'path';
import fsExtra from 'fs-extra'; // Use default import for fs-extra

describe('ReadBranchDocumentUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  // let app: Application; // Removed app instance
  let container: DIContainer; // Use DI container
  let useCase: ReadBranchDocumentUseCase;
  const TEST_BRANCH = 'feature/test-branch';
  const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName;

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Create test branch directory
    // createBranchDir handles safe name conversion
    await createBranchDir(testEnv, TEST_BRANCH);

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // Get the use case instance from container
    useCase = await container.get<ReadBranchDocumentUseCase>('readBranchDocumentUseCase');
    // Removed app initialization and use case retrieval from app
    // app = await createTestApplication({ docsRoot: testEnv.docRoot });
    // useCase = app['readBranchDocumentUseCase'];
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('execute', () => {
    it('should read a document from the branch memory bank', async () => {
      await loadBranchFixture(path.join(testEnv.branchMemoryPath, TEST_BRANCH), 'basic');

      const result = await useCase.execute({
        branchName: TEST_BRANCH,
        path: 'branchContext.json'
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe('branchContext.json');
      expect(typeof result.document.content).toBe('string');

      const document = JSON.parse(result.document.content);
      expect(document).toHaveProperty('schema', 'memory_document_v2');
      expect(document).toHaveProperty('metadata');
      expect(document).toHaveProperty('content');
      expect(document.metadata).toHaveProperty('id', 'test-branch-context');
      expect(document.metadata).toHaveProperty('documentType', 'branch_context');
    });

    it('should return an error if the document does not exist', async () => {
      await expect(useCase.execute({
        branchName: TEST_BRANCH,
        path: 'non-existent.json'
      })).rejects.toThrow(DomainErrors.documentNotFound('non-existent.json', { branchName: TEST_BRANCH }));
    });

    it('should return an error if the branch does not exist', async () => {
      await expect(useCase.execute({
        branchName: 'non-existent-branch',
        path: 'some-document.json'
      })).rejects.toThrow('Branch name must include a namespace prefix');
    });

    it('should return an error for an invalid path', async () => {
      await expect(useCase.execute({
        branchName: TEST_BRANCH,
        path: '../outside-documents/sensitive.json'
      })).rejects.toThrow('Document path cannot contain ".."');
    });

    it('should read a document from a subdirectory within the branch', async () => {
      const subDir = path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH, 'subdir');
      await fsExtra.ensureDir(subDir);

      const testDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "subdirectory-document",
          title: "サブディレクトリ内ドキュメント",
          documentType: "test",
          path: "subdir/test-document.json",
          tags: ["test", "subdirectory"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          value: "サブディレクトリ内のテストドキュメント"
        }
      };

      await fsExtra.outputJson(path.join(subDir, 'test-document.json'), testDocument, { spaces: 2 });

      const result = await useCase.execute({
        branchName: TEST_BRANCH,
        path: 'subdir/test-document.json'
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe('subdir/test-document.json');
      expect(typeof result.document.content).toBe('string');

      const document = JSON.parse(result.document.content);
      expect(document.metadata.id).toBe('subdirectory-document');
      expect(document.metadata.path).toBe('subdir/test-document.json');
    });
  });
});
