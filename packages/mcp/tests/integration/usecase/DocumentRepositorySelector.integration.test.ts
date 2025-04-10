/**
 * Integration tests for DocumentRepositorySelector
 * Tests the integration of DocumentRepositorySelector with BranchResolverService
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { loadBranchFixture, loadGlobalFixture } from '../helpers/fixtures-loader.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js';
import { IBranchMemoryBankRepository } from '../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../src/domain/repositories/IGlobalMemoryBankRepository.js';
import { DocumentRepositorySelector } from '../../../src/application/services/DocumentRepositorySelector.js';
import { BranchResolverService } from '../../../src/application/services/BranchResolverService.js';
import { BranchInfo } from '../../../src/domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../src/domain/entities/MemoryDocument.js';
import { Tag } from '../../../src/domain/entities/Tag.js';
import { DomainError } from '../../../src/shared/errors/DomainError.js';
import { ApplicationError } from '../../../src/shared/errors/ApplicationError.js';
import { IGitService } from '../../../src/infrastructure/git/IGitService.js';
import { IConfigProvider } from '../../../src/infrastructure/config/interfaces/IConfigProvider.js';
import type { WorkspaceConfig } from '../../../src/infrastructure/config/WorkspaceConfig.js';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { logger } from '../../../src/shared/utils/logger.js';
import * as path from 'path';
import fsExtra from 'fs-extra';

describe('DocumentRepositorySelector and BranchResolverService Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer;
  let documentRepositorySelector: DocumentRepositorySelector;
  let branchResolverService: BranchResolverService;
  let mockGitService: any;
  let mockConfigProvider: any;
  const TEST_BRANCH = 'feature/test-branch';
  const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName;

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Create Git repository with test branch
    try {
      execSync(`git checkout -b ${TEST_BRANCH}`, { cwd: testEnv.tempDir, stdio: 'ignore' });
      logger.debug(`[Test Setup] Checked out to new branch: ${TEST_BRANCH}`);
    } catch (gitError) {
      logger.error(`[Test Setup] Error creating/checking out branch ${TEST_BRANCH}:`, gitError);
      throw gitError;
    }

    // Create test branch directory
    await createBranchDir(testEnv, TEST_BRANCH);

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // Setup mocks
    mockGitService = {
      getCurrentBranchName: vi.fn()
    };
    mockGitService.getCurrentBranchName.mockResolvedValue(TEST_BRANCH);
    container.register<IGitService>('gitService', mockGitService);

    mockConfigProvider = {
      initialize: vi.fn(),
      getConfig: vi.fn(),
      getGlobalMemoryPath: vi.fn(),
      getBranchMemoryPath: vi.fn(),
      getLanguage: vi.fn()
    };
    mockConfigProvider.getConfig.mockReturnValue({
      docsRoot: testEnv.docRoot,
      verbose: false,
      language: 'en',
      isProjectMode: true
    });
    mockConfigProvider.getGlobalMemoryPath.mockReturnValue(testEnv.globalMemoryPath);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH));
    mockConfigProvider.getLanguage.mockReturnValue('en');
    container.register<IConfigProvider>('configProvider', mockConfigProvider);

    // Manually create and register service instances since they are not yet in the DI container
    branchResolverService = new BranchResolverService(mockGitService, mockConfigProvider);
    container.register<BranchResolverService>('branchResolverService', branchResolverService);
    
    // Get branch and global repositories
    const branchRepository = await container.get<IBranchMemoryBankRepository>('branchMemoryBankRepository');
    const globalRepository = await container.get<IGlobalMemoryBankRepository>('globalMemoryBankRepository');
    
    // Create and register DocumentRepositorySelector
    documentRepositorySelector = new DocumentRepositorySelector(
      branchRepository,
      globalRepository,
      branchResolverService
    );
    container.register<DocumentRepositorySelector>('documentRepositorySelector', documentRepositorySelector);
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('Document operations with branch scope', () => {
    beforeEach(async () => {
      // Load fixtures for branch
      await loadBranchFixture(path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH), 'basic');
    });

    it('should get branch repository and resolve branch name correctly', async () => {
      // Act
      const result = await documentRepositorySelector.getRepository('branch', TEST_BRANCH);

      // Assert
      expect(result.repository).toBeDefined();
      expect(result.branchInfo).toBeDefined();
      expect(result.branchInfo?.name).toBe(TEST_BRANCH);
    });

    it('should read document from branch repository', async () => {
      // Arrange
      const { repository } = await documentRepositorySelector.getRepository('branch', TEST_BRANCH);
      const documentPath = DocumentPath.create('branchContext.json');

      // Act
      const document = await repository.getDocument(documentPath);

      // Assert
      expect(document).not.toBeNull();
      expect(document?.path.value).toBe('branchContext.json');
    });

    it('should save document to branch repository', async () => {
      // Arrange
      const { repository, branchInfo } = await documentRepositorySelector.getRepository('branch', TEST_BRANCH);
      const documentPath = DocumentPath.create('test-document.json');
      const testDocument = new MemoryDocument({
        path: documentPath,
        content: JSON.stringify({
          schema: 'memory_document_v2',
          documentType: 'test',
          metadata: {
            id: 'test-doc',
            title: 'Test Document',
            path: 'test-document.json',
            tags: [],
            lastModified: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          content: {
            message: 'This is a test document'
          }
        }),
        tags: [Tag.create('test')],
        lastModified: new Date()
      });

      // Act
      await repository.saveDocument(testDocument);
      
      // Assert - Check if the file was actually saved to the filesystem
      const filePath = path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH, 'test-document.json');
      const fileExists = await fsExtra.pathExists(filePath);
      expect(fileExists).toBe(true);
      
      // Also check if we can read it back
      const savedDocument = await repository.getDocument(documentPath);
      expect(savedDocument).not.toBeNull();
      expect(savedDocument?.path.value).toBe('test-document.json');
    });
  });

  describe('Document operations with global scope', () => {
    beforeEach(async () => {
      // Load fixtures for global memory bank
      await loadGlobalFixture(testEnv.globalMemoryPath, 'minimal');
    });

    it('should get global repository correctly', async () => {
      // Act
      const result = await documentRepositorySelector.getRepository('global');

      // Assert
      expect(result.repository).toBeDefined();
      expect(result.branchInfo).toBeUndefined();
    });

    it('should read document from global repository', async () => {
      // Arrange
      const { repository } = await documentRepositorySelector.getRepository('global');
      const documentPath = DocumentPath.create('core/glossary.json');

      // Act
      const document = await repository.getDocument(documentPath);

      // Assert
      expect(document).not.toBeNull();
      expect(document?.path.value).toBe('core/glossary.json');
    });

    it('should save document to global repository and update tags index', async () => {
      // Arrange
      const { repository } = await documentRepositorySelector.getRepository('global');
      const documentPath = DocumentPath.create('core/test-global.json');
      const testDocument = new MemoryDocument({
        path: documentPath,
        content: JSON.stringify({
          schema: 'memory_document_v2',
          documentType: 'test',
          metadata: {
            id: 'test-global',
            title: 'Test Global Document',
            path: 'core/test-global.json',
            tags: [],
            lastModified: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          content: {
            message: 'This is a test global document'
          }
        }),
        tags: [Tag.create('test'), Tag.create('global')],
        lastModified: new Date()
      });

      // Act
      await repository.saveDocument(testDocument);
      
      // Assert - Check if the file was actually saved to the filesystem
      const filePath = path.join(testEnv.globalMemoryPath, 'core/test-global.json');
      const fileExists = await fsExtra.pathExists(filePath);
      expect(fileExists).toBe(true);
      
      // Also check if we can read it back
      const savedDocument = await repository.getDocument(documentPath);
      expect(savedDocument).not.toBeNull();
      expect(savedDocument?.path.value).toBe('core/test-global.json');
    });
  });

  describe('Auto branch detection in project mode', () => {
    beforeEach(() => {
      // Ensure project mode is enabled
      mockConfigProvider.getConfig.mockReturnValue({
        docsRoot: testEnv.docRoot,
        verbose: false,
        language: 'en',
        isProjectMode: true
      });
      // Reset call count
      mockGitService.getCurrentBranchName.mockClear();
    });

    it('should auto-detect current branch when branch name is not provided', async () => {
      // Arrange
      await loadBranchFixture(path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH), 'basic');

      // Act
      const result = await documentRepositorySelector.getRepository('branch');

      // Assert
      expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1);
      expect(result.branchInfo).toBeDefined();
      expect(result.branchInfo?.name).toBe(TEST_BRANCH);
    });

    it('should throw error when current branch cannot be detected', async () => {
      // Arrange
      mockGitService.getCurrentBranchName.mockRejectedValue(new Error('Git error'));

      // Act & Assert
      await expect(documentRepositorySelector.getRepository('branch')).rejects.toThrow(ApplicationError);
    });
  });

  describe('Branch name required outside project mode', () => {
    beforeEach(() => {
      // Disable project mode
      mockConfigProvider.getConfig.mockReturnValue({
        docsRoot: testEnv.docRoot,
        verbose: false,
        language: 'en',
        isProjectMode: false
      });
      // Reset call count
      mockGitService.getCurrentBranchName.mockClear();
    });

    it('should throw error when branch name is not provided outside project mode', async () => {
      // Act & Assert
      await expect(documentRepositorySelector.getRepository('branch')).rejects.toThrow(ApplicationError);
      expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid branch name', async () => {
      // Act & Assert
      await expect(documentRepositorySelector.getRepository('branch', 'invalid-branch')).rejects.toThrow(DomainError);
    });

    it('should throw error for empty branch name', async () => {
      // Act & Assert
      await expect(documentRepositorySelector.getRepository('branch', '')).rejects.toThrow(DomainError);
    });

    it('should throw error for invalid scope', async () => {
      // Act & Assert
      // @ts-expect-error Testing invalid scope
      await expect(documentRepositorySelector.getRepository('invalid')).rejects.toThrow(ApplicationError);
    });
  });
});
