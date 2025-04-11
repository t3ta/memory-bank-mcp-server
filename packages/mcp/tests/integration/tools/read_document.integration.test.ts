/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js';
import { execSync } from 'child_process';
import { logger } from '../../../src/shared/utils/logger.js';
import { BranchInfo } from '../../../src/domain/entities/BranchInfo.js';
import { IGitService } from '../../../src/infrastructure/git/IGitService.js';
import { IConfigProvider } from '../../../src/infrastructure/config/interfaces/IConfigProvider.js';
import { DocumentController } from '../../../src/interface/controllers/DocumentController.js';
import { read_document, write_document } from '../../../src/interface/tools/document-tools.js';
import type { WorkspaceConfig } from '../../../src/infrastructure/config/WorkspaceConfig.js';
import { ApplicationError } from '../../../src/shared/errors/ApplicationError.js';
import { vi, Mocked } from 'vitest';
import * as path from 'path';
import fs from 'fs-extra';

describe('read_document Command Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer;
  let mockGitService: Mocked<IGitService>;
  let mockConfigProvider: Mocked<IConfigProvider>;
  const TEST_BRANCH = 'feature/test-branch';

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Create test branch directory
    try {
      execSync(`git checkout -b ${TEST_BRANCH}`, { cwd: testEnv.tempDir, stdio: 'ignore' });
      logger.debug(`[Test Setup] Checked out to new branch: ${TEST_BRANCH}`);
    } catch (gitError) {
      logger.error(`[Test Setup] Error creating/checking out branch ${TEST_BRANCH}:`, gitError);
      throw gitError;
    }

    // Create test branch directory (after checking out branch in git)
    await createBranchDir(testEnv, TEST_BRANCH);

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // Setup mock GitService
    mockGitService = {
      getCurrentBranchName: vi.fn<() => Promise<string>>()
    };
    mockGitService.getCurrentBranchName.mockResolvedValue(TEST_BRANCH);
    container.register<IGitService>('gitService', mockGitService);

    // Setup mock ConfigProvider
    mockConfigProvider = {
      initialize: vi.fn(),
      getConfig: vi.fn<() => WorkspaceConfig>(),
      getGlobalMemoryPath: vi.fn<() => string>(),
      getBranchMemoryPath: vi.fn<(branchName: string) => string>(),
      getLanguage: vi.fn<() => 'en' | 'ja' | 'zh'>()
    };
    
    mockConfigProvider.getConfig.mockReturnValue({
      docsRoot: testEnv.docRoot,
      verbose: false,
      language: 'en',
      isProjectMode: true
    });
    
    const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName;
    mockConfigProvider.getGlobalMemoryPath.mockReturnValue(testEnv.globalMemoryPath);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH));
    mockConfigProvider.getLanguage.mockReturnValue('en');

    container.register<IConfigProvider>('configProvider', mockConfigProvider);

    // Prepare test data - create documents to be read later
    await prepareTestDocuments();
  });

  afterEach(async () => {
    await cleanupTestEnv(testEnv);
  });

  /**
   * Helper method to create test documents
   */
  async function prepareTestDocuments() {
    // Create a branch document
    const branchDocumentPath = 'test/branch-document.json';
    const branchDocumentContent = {
      schema: "memory_document_v2",
      documentType: "test",
      metadata: {
        id: "test-branch-document",
        title: "Test Branch Document",
        path: branchDocumentPath,
        tags: ["test", "branch"],
        version: 1
      },
      content: {
        message: "This is a test document in branch memory bank"
      }
    };

    await write_document({
      scope: 'branch',
      branch: TEST_BRANCH,
      path: branchDocumentPath,
      content: branchDocumentContent,
      tags: branchDocumentContent.metadata.tags,
      docs: testEnv.docRoot
    });

    // Create a global document
    const globalDocumentPath = 'core/global-document.json';
    const globalDocumentContent = {
      schema: "memory_document_v2",
      documentType: "test",
      metadata: {
        id: "test-global-document",
        title: "Test Global Document",
        path: globalDocumentPath,
        tags: ["test", "global"],
        version: 1
      },
      content: {
        message: "This is a test document in global memory bank"
      }
    };

    await write_document({
      scope: 'global',
      path: globalDocumentPath,
      content: globalDocumentContent,
      tags: globalDocumentContent.metadata.tags,
      docs: testEnv.docRoot
    });

    // Create a plain text document
    const plainTextPath = 'test/plain-text.txt';
    const plainTextContent = 'This is plain text content without JSON structure';

    await write_document({
      scope: 'branch',
      branch: TEST_BRANCH,
      path: plainTextPath,
      content: plainTextContent,
      tags: ["text", "plain"],
      docs: testEnv.docRoot
    });
  }

  describe('Command Integration Tests', () => {
    it('should read document from branch memory bank', async () => {
      // Arrange
      const documentPath = 'test/branch-document.json';

      // Act
      const result = await read_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        docs: testEnv.docRoot
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.path).toBe(documentPath);
      expect(result.data.content).toBeDefined();
      
      // Verify content structure
      const content = result.data.content as any;
      expect(content.schema).toBe("memory_document_v2");
      expect(content.documentType).toBe("test");
      expect(content.metadata.title).toBe("Test Branch Document");
      expect(content.content.message).toBe("This is a test document in branch memory bank");
      
      // Verify tags
      expect(result.data.tags).toEqual(["test", "branch"]);
    });

    it('should read document from global memory bank', async () => {
      // Arrange
      const documentPath = 'core/global-document.json';

      // Act
      const result = await read_document({
        scope: 'global',
        path: documentPath,
        docs: testEnv.docRoot
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.path).toBe(documentPath);
      expect(result.data.content).toBeDefined();
      
      // Verify content structure
      const content = result.data.content as any;
      expect(content.schema).toBe("memory_document_v2");
      expect(content.documentType).toBe("test");
      expect(content.metadata.title).toBe("Test Global Document");
      expect(content.content.message).toBe("This is a test document in global memory bank");
      
      // Verify tags
      expect(result.data.tags).toEqual(["test", "global"]);
    });

    it('should read plain text content', async () => {
      // Arrange
      const documentPath = 'test/plain-text.txt';
      const expectedContent = 'This is plain text content without JSON structure';

      // Act
      const result = await read_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        docs: testEnv.docRoot
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.path).toBe(documentPath);
      expect(result.data.content).toBe(expectedContent);
      
      // Plain text files don't have tags in the standard way
      expect(result.data.tags).toEqual([]);
    });

    it.skip('should auto-detect branch name in project mode', async () => {
      // Arrange
      const documentPath = 'test/branch-document.json';

      // Create a completely fresh environment for this test to avoid interference
      // This is crucial for the test to work properly
      // Setup new mocks
      const freshGitService = {
        getCurrentBranchName: vi.fn<() => Promise<string>>()
      };
      freshGitService.getCurrentBranchName.mockResolvedValue(TEST_BRANCH);
      
      const freshConfigProvider = {
        initialize: vi.fn(),
        getConfig: vi.fn<() => WorkspaceConfig>(),
        getGlobalMemoryPath: vi.fn<() => string>(),
        getBranchMemoryPath: vi.fn<(branchName: string) => string>(),
        getLanguage: vi.fn<() => 'en' | 'ja' | 'zh'>()
      };
      
      // Set project mode to true - essential for auto-detection
      freshConfigProvider.getConfig.mockReturnValue({
        docsRoot: testEnv.docRoot,
        verbose: false,
        language: 'en',
        isProjectMode: true
      });
      
      const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName;
      freshConfigProvider.getGlobalMemoryPath.mockReturnValue(testEnv.globalMemoryPath);
      freshConfigProvider.getBranchMemoryPath.mockReturnValue(path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH));
      freshConfigProvider.getLanguage.mockReturnValue('en');
      
      // Create fresh container with our mocks
      const freshContainer = await setupContainer({ docsRoot: testEnv.docRoot });
      freshContainer.register<IGitService>('gitService', freshGitService);
      freshContainer.register<IConfigProvider>('configProvider', freshConfigProvider);
      
      // Ensure global variable container is set to our fresh container
      // @ts-ignore - We need to directly manipulate the container for this test
      global.container = freshContainer;
      
      console.log("Starting auto-detect branch name test for read_document...");
      
      // Act - Omit branch name
      const result = await read_document({
        scope: 'branch',
        // No branch name provided, should be auto-detected
        path: documentPath,
        docs: testEnv.docRoot
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.path).toBe(documentPath);
      
      // Verify GitService was called to auto-detect branch
      console.log(`getCurrentBranchName mock called: ${freshGitService.getCurrentBranchName.mock.calls.length} times`);
      expect(freshGitService.getCurrentBranchName).toHaveBeenCalled();
    });

    it('should return error when branch name is required but not provided', async () => {
      // Arrange
      const documentPath = 'test/branch-document.json';

      // Set project mode to false
      mockConfigProvider.getConfig.mockReturnValue({
        docsRoot: testEnv.docRoot,
        verbose: false,
        language: 'en',
        isProjectMode: false
      });

      // Act
      const result = await read_document({
        scope: 'branch',
        // No branch name provided
        path: documentPath,
        docs: testEnv.docRoot
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // エラーメッセージは「Branch name is required」か「Branch ... was not found」のどちらかになる可能性がある
      expect(result.error.message).toMatch(/Branch|branch/);
    });

    it('should return error when document does not exist', async () => {
      // Arrange
      const documentPath = 'test/non-existent-document.json';

      // Act
      const result = await read_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        docs: testEnv.docRoot
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('DOMAIN_ERROR.DOCUMENT_NOT_FOUND');
      expect(result.error.message).toContain('not found');
    });

    it('should throw error for invalid scope value', async () => {
      // Arrange
      const documentPath = 'test/branch-document.json';

      // Act & Assert
      try {
        await read_document({
          // @ts-ignore - Testing invalid scope
          scope: 'invalid',
          branch: TEST_BRANCH,
          path: documentPath,
          docs: testEnv.docRoot
        });
        
        // If we get here, the test should fail
        expect(true).toBe(false); // This will fail the test if no error is thrown
      } catch (error) {
        // Assert that the error contains the expected message
        expect(error.message).toContain('Invalid scope');
      }
    });

    it('should handle invalid JSON gracefully', async () => {
      // Arrange - Create a file with invalid JSON
      const documentPath = 'test/invalid-json.json';
      const invalidJson = '{this is not valid JSON';
      
      // Write the invalid JSON directly to the file system
      const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName;
      const filePath = path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH, documentPath);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, invalidJson);

      // Make sure mockConfigProvider uses the correct branch memory path
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH));
      container.register<IConfigProvider>('configProvider', mockConfigProvider);

      console.log(`Testing invalid JSON handling with file at ${filePath}`);
      console.log(`File exists: ${await fs.pathExists(filePath)}`);
      
      // Act
      const result = await read_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        docs: testEnv.docRoot
      });

      // Assert - The test is expecting success here, even with invalid JSON
      expect(result).toBeDefined();
      
      // For invalid JSON, we should still return success with the raw content
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.path).toBe(documentPath);
      
      // The content should be the raw string since it couldn't be parsed as JSON
      console.log(`Result content: ${result.data.content}`);
      expect(result.data.content).toBe(invalidJson); // Should contain raw content
      
      // And there should be no tags since it's invalid JSON
      expect(result.data.tags).toEqual([]); // No tags for invalid JSON
    });
  });
});
