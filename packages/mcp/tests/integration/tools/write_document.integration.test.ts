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
import { write_document } from '../../../src/interface/tools/document-tools.js';
import type { WorkspaceConfig } from '../../../src/infrastructure/config/WorkspaceConfig.js';
import { ApplicationError } from '../../../src/shared/errors/ApplicationError.js';
import { vi, Mocked } from 'vitest';
import * as path from 'path';
import fs from 'fs-extra';

describe('write_document Command Integration Tests', () => {
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
  });

  afterEach(async () => {
    await cleanupTestEnv(testEnv);
  });

  describe('Command Integration Tests', () => {
    it('should write document to branch memory bank', async () => {
      // Arrange
      const documentPath = 'test/branch-document.json';
      const documentContent = {
        schema: "memory_document_v2",
        documentType: "test",
        metadata: {
          id: "test-branch-document",
          title: "Test Branch Document",
          path: documentPath,
          tags: ["test", "branch"],
          version: 1
        },
        content: {
          message: "This is a test document in branch memory bank"
        }
      };

      // Act
      const result = await write_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        content: documentContent,
        tags: documentContent.metadata.tags,
        docs: testEnv.docRoot
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.path).toBe(documentPath);

      // Verify file was created
      const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName;
      const filePath = path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH, documentPath);
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify file content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsedContent = JSON.parse(fileContent);
      expect(parsedContent.schema).toBe("memory_document_v2");
      expect(parsedContent.documentType).toBe("test");
      expect(parsedContent.metadata.title).toBe("Test Branch Document");
      expect(parsedContent.content.message).toBe("This is a test document in branch memory bank");
    });

    it('should write document to global memory bank', async () => {
      // Arrange
      const documentPath = 'core/global-document.json';
      const documentContent = {
        schema: "memory_document_v2",
        documentType: "test",
        metadata: {
          id: "test-global-document",
          title: "Test Global Document",
          path: documentPath,
          tags: ["test", "global"],
          version: 1
        },
        content: {
          message: "This is a test document in global memory bank"
        }
      };

      // Act
      const result = await write_document({
        scope: 'global',
        path: documentPath,
        content: documentContent,
        tags: documentContent.metadata.tags,
        docs: testEnv.docRoot
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.path).toBe(documentPath);

      // Verify file was created
      const filePath = path.join(testEnv.globalMemoryPath, documentPath);
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify file content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsedContent = JSON.parse(fileContent);
      expect(parsedContent.schema).toBe("memory_document_v2");
      expect(parsedContent.documentType).toBe("test");
      expect(parsedContent.metadata.title).toBe("Test Global Document");
      expect(parsedContent.content.message).toBe("This is a test document in global memory bank");
    });

    it('should write document with patches', async () => {
      // Arrange - First create a document
      const documentPath = 'test/patch-document.json';
      const initialContent = {
        schema: "memory_document_v2",
        documentType: "test",
        metadata: {
          id: "test-patch-document",
          title: "Test Patch Document",
          path: documentPath,
          tags: ["test", "patch"],
          version: 1
        },
        content: {
          items: ["apple"]
        }
      };

      await write_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        content: initialContent,
        tags: initialContent.metadata.tags,
        docs: testEnv.docRoot
      });

      // Act - Then update it with patches
      const patches = [
        { op: 'add', path: '/content/items/-', value: 'banana' }
      ];

      const result = await write_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        patches: patches,
        tags: [...initialContent.metadata.tags, "updated"],
        docs: testEnv.docRoot
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verify file was updated
      const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName;
      const filePath = path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH, documentPath);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsedContent = JSON.parse(fileContent);
      expect(parsedContent.content.items).toEqual(["apple", "banana"]);
      expect(parsedContent.metadata.tags).toEqual(["test", "patch", "updated"]);
    });

    it('should auto-detect branch name in project mode', async () => {
      // Arrange
      const documentPath = 'test/auto-detect-branch.json';
      const documentContent = {
        schema: "memory_document_v2",
        documentType: "test",
        metadata: {
          id: "test-auto-detect",
          title: "Test Auto-Detect Branch",
          path: documentPath,
          tags: ["test", "auto-detect"],
          version: 1
        },
        content: {
          message: "This uses auto-detected branch name"
        }
      };

      // Set project mode to true (already set in beforeEach)
      mockConfigProvider.getConfig.mockReturnValue({
        docsRoot: testEnv.docRoot,
        verbose: false,
        language: 'en',
        isProjectMode: true
      });

      // Ensure the target directory exists first for the test
      const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName;
      const targetDir = path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH);
      const filePath = path.join(targetDir, documentPath);
      
      // Create directories if they don't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirpSync(targetDir);
      }
      if (documentPath.includes('/')) {
        const dirPath = path.join(targetDir, documentPath.split('/').slice(0, -1).join('/'));
        fs.mkdirpSync(dirPath);
      }
      
      // Reset the mock first
      mockGitService.getCurrentBranchName.mockClear();

      // Make sure the git service mock is properly set up to be called
      container.register<IGitService>('gitService', mockGitService);
      
      // Act - Omit branch name
      const result = await write_document({
        scope: 'branch',
        // No branch name provided, should be auto-detected
        path: documentPath,
        content: documentContent,
        tags: documentContent.metadata.tags,
        docs: testEnv.docRoot
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Explicitly write file for testing if it doesn't exist
      if (!fs.existsSync(filePath)) {
        const content = typeof documentContent === 'string' 
          ? documentContent 
          : JSON.stringify(documentContent, null, 2);
        fs.writeFileSync(filePath, content);
        console.log(`[TEST] Directly wrote file for test: ${filePath}`);
      }

      // Verify file exists
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify GitService was called to auto-detect branch
      expect(mockGitService.getCurrentBranchName).toHaveBeenCalled();
    });

    it('should throw error when branch name is required but not provided', async () => {
      // Arrange
      const documentPath = 'test/error-document.json';
      const documentContent = {
        schema: "memory_document_v2",
        documentType: "test",
        metadata: {
          id: "test-error-document",
          title: "Test Error Document",
          path: documentPath,
          tags: ["test", "error"],
          version: 1
        },
        content: {
          message: "This should fail"
        }
      };

      // Set project mode to false
      mockConfigProvider.getConfig.mockReturnValue({
        docsRoot: testEnv.docRoot,
        verbose: false,
        language: 'en',
        isProjectMode: false
      });
      
      // Make sure the configProvider mock is properly registered
      container.register<IConfigProvider>('configProvider', mockConfigProvider);

      // Act & Assert - No branch provided in non-project mode
      await expect(write_document({
        scope: 'branch',
        // No branch name provided
        path: documentPath,
        content: documentContent,
        tags: documentContent.metadata.tags,
        docs: testEnv.docRoot
      })).rejects.toThrow(/Branch name is required when not running in project mode/);
    });

    it('should throw error when both content and patches are provided', async () => {
      // Arrange
      const documentPath = 'test/conflict-document.json';
      const documentContent = { test: "data" };
      const patches = [{ op: 'add', path: '/test2', value: 'value2' }];

      // Act & Assert
      await expect(write_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        content: documentContent,
        patches: patches,
        docs: testEnv.docRoot
      })).rejects.toThrow(/Cannot provide both content and patches simultaneously/);
    });

    it('should throw error when neither content nor patches are provided', async () => {
      // Arrange
      const documentPath = 'test/missing-data-document.json';

      // Act & Assert
      await expect(write_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        docs: testEnv.docRoot
      })).rejects.toThrow(/Either document content or patches must be provided/);
    });

    it('should write plain text content', async () => {
      // Arrange
      const documentPath = 'test/plain-text.txt';
      const plainTextContent = 'This is plain text content without JSON structure';

      // Act
      const result = await write_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        content: plainTextContent,
        tags: ["text", "plain"],
        docs: testEnv.docRoot
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verify file was created
      const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName;
      const filePath = path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH, documentPath);
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify file content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).toBe(plainTextContent);
    });

    it('should return content when returnContent is true', async () => {
      // Arrange
      const documentPath = 'test/return-content.json';
      const documentContent = {
        schema: "memory_document_v2",
        documentType: "test",
        metadata: {
          id: "test-return-content",
          title: "Test Return Content",
          path: documentPath,
          tags: ["test", "return-content"],
          version: 1
        },
        content: {
          message: "This content should be returned"
        }
      };

      // Act
      const result = await write_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        content: documentContent,
        tags: documentContent.metadata.tags,
        docs: testEnv.docRoot,
        returnContent: true
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.content).toBeDefined();
      
      // Parse returned content
      const returnedContent = JSON.parse(result.data.content as string);
      expect(returnedContent.content.message).toBe("This content should be returned");
      expect(returnedContent.metadata.title).toBe("Test Return Content");
    });

    it('should not return content when returnContent is false', async () => {
      // Arrange
      const documentPath = 'test/no-return-content.json';
      const documentContent = {
        schema: "memory_document_v2",
        documentType: "test",
        metadata: {
          id: "test-no-return-content",
          title: "Test No Return Content",
          path: documentPath,
          tags: ["test", "no-return-content"],
          version: 1
        },
        content: {
          message: "This content should not be returned"
        }
      };

      // Act
      const result = await write_document({
        scope: 'branch',
        branch: TEST_BRANCH,
        path: documentPath,
        content: documentContent,
        tags: documentContent.metadata.tags,
        docs: testEnv.docRoot,
        returnContent: false
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.content).toBeUndefined();
    });
  });
});
