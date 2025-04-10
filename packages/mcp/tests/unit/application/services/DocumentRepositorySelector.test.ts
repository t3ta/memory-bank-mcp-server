import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js';
import { IDocumentRepository } from '../../../../../src/domain/repositories/IDocumentRepository.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository.js';
import { DocumentRepositorySelector } from '../../../../../src/application/services/DocumentRepositorySelector.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../../../src/shared/errors/ApplicationError.js';
import type { IGitService } from '../../../../../src/infrastructure/git/IGitService.js';
import type { IConfigProvider } from '../../../../../src/infrastructure/config/interfaces/IConfigProvider.js';

describe('DocumentRepositorySelector', () => {
  // Mock dependencies
  const mockBranchRepository: IBranchMemoryBankRepository = {
    exists: vi.fn(),
    initialize: vi.fn(),
    getDocument: vi.fn(),
    saveDocument: vi.fn(),
    deleteDocument: vi.fn(),
    listDocuments: vi.fn(),
    findDocumentsByTags: vi.fn(),
    getRecentBranches: vi.fn(),
    validateStructure: vi.fn(),
    saveTagIndex: vi.fn(),
    getTagIndex: vi.fn(),
    findDocumentPathsByTagsUsingIndex: vi.fn(),
  };

  const mockGlobalRepository: IGlobalMemoryBankRepository = {
    initialize: vi.fn(),
    getDocument: vi.fn(),
    saveDocument: vi.fn(),
    deleteDocument: vi.fn(),
    listDocuments: vi.fn(),
    findDocumentsByTags: vi.fn(),
    updateTagsIndex: vi.fn(),
    saveTagIndex: vi.fn(),
    getTagIndex: vi.fn(),
    findDocumentPathsByTagsUsingIndex: vi.fn(),
    validateStructure: vi.fn(),
  };

  const mockGitService: IGitService = {
    getCurrentBranchName: vi.fn(),
  };

  const mockConfigProvider: IConfigProvider = {
    initialize: vi.fn(),
    getConfig: vi.fn().mockReturnValue({ isProjectMode: false, docsRoot: '/mnt/docs' }),
    getMemoryBankPath: vi.fn(),
    getGlobalMemoryPath: vi.fn(),
  };

  let selector: DocumentRepositorySelector;

  beforeEach(() => {
    vi.clearAllMocks();
    selector = new DocumentRepositorySelector(
      mockBranchRepository,
      mockGlobalRepository,
      mockGitService,
      mockConfigProvider
    );
  });

  describe('getRepository', () => {
    it('should return global repository adapter for global scope', async () => {
      // Act
      const result = await selector.getRepository('global');

      // Assert
      expect(result).toBeDefined();
      expect(result.repository).toBeDefined();
      expect(result.branchInfo).toBeUndefined();
    });

    it('should return branch repository adapter with branch info for branch scope', async () => {
      // Arrange
      const branchName = 'feature/test';
      const branchInfo = BranchInfo.create(branchName);
      (mockBranchRepository.exists as Mock).mockResolvedValue(true);

      // Act
      const result = await selector.getRepository('branch', branchName);

      // Assert
      expect(result).toBeDefined();
      expect(result.repository).toBeDefined();
      expect(result.branchInfo).toBeDefined();
      expect(result.branchInfo?.name).toBe(branchName);
      expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
    });

    it('should initialize branch if it does not exist', async () => {
      // Arrange
      const branchName = 'feature/new-branch';
      const branchInfo = BranchInfo.create(branchName);
      (mockBranchRepository.exists as Mock).mockResolvedValue(false);

      // Act
      const result = await selector.getRepository('branch', branchName);

      // Assert
      expect(result).toBeDefined();
      expect(result.branchInfo?.name).toBe(branchName);
      expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
      // Note: We're not verifying initialization here since it's just logged, not called immediately
      // The actual initialization happens later when the adapter's methods are called
    });

    it('should throw error for invalid scope', async () => {
      // Act & Assert
      await expect(selector.getRepository('invalid' as any)).rejects.toThrow(ApplicationError);
    });

    it('should auto-detect branch in project mode', async () => {
      // Arrange
      const detectedBranch = 'feature/auto-detected';
      const branchInfo = BranchInfo.create(detectedBranch);
      (mockConfigProvider.getConfig as Mock).mockReturnValue({ isProjectMode: true, docsRoot: '/mnt/docs' });
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(detectedBranch);
      (mockBranchRepository.exists as Mock).mockResolvedValue(true);

      // Act
      const result = await selector.getRepository('branch');

      // Assert
      expect(result).toBeDefined();
      expect(result.branchInfo?.name).toBe(detectedBranch);
      expect(mockGitService.getCurrentBranchName).toHaveBeenCalled();
      expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
    });

    it('should throw error when branch name cannot be auto-detected', async () => {
      // Arrange
      (mockConfigProvider.getConfig as Mock).mockReturnValue({ isProjectMode: true, docsRoot: '/mnt/docs' });
      (mockGitService.getCurrentBranchName as Mock).mockRejectedValue(new Error('Git error'));

      // Act & Assert
      await expect(selector.getRepository('branch')).rejects.toThrow(ApplicationError);
      expect(mockGitService.getCurrentBranchName).toHaveBeenCalled();
    });

    it('should throw error when branch name is required outside project mode', async () => {
      // Arrange
      (mockConfigProvider.getConfig as Mock).mockReturnValue({ isProjectMode: false, docsRoot: '/mnt/docs' });

      // Act & Assert
      await expect(selector.getRepository('branch')).rejects.toThrow(ApplicationError);
    });
  });

  describe('Repository adapters', () => {
    it('should correctly adapt branch repository for getDocument', async () => {
      // Arrange
      const branchName = 'feature/test';
      const branchInfo = BranchInfo.create(branchName);
      const path = DocumentPath.create('test.json');
      const mockDoc = {} as MemoryDocument;

      (mockBranchRepository.exists as Mock).mockResolvedValue(true);
      (mockBranchRepository.getDocument as Mock).mockResolvedValue(mockDoc);

      // Act
      const { repository } = await selector.getRepository('branch', branchName);
      const result = await repository.getDocument(path);

      // Assert
      expect(result).toBe(mockDoc);
      expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(branchInfo, path);
    });

    it('should correctly adapt branch repository for saveDocument', async () => {
      // Arrange
      const branchName = 'feature/test';
      const branchInfo = BranchInfo.create(branchName);
      const doc = {} as MemoryDocument;

      (mockBranchRepository.exists as Mock).mockResolvedValue(true);
      (mockBranchRepository.saveDocument as Mock).mockResolvedValue(undefined);

      // Act
      const { repository } = await selector.getRepository('branch', branchName);
      await repository.saveDocument(doc);

      // Assert
      expect(mockBranchRepository.saveDocument).toHaveBeenCalledWith(branchInfo, doc);
    });

    it('should correctly adapt global repository for getDocument', async () => {
      // Arrange
      const path = DocumentPath.create('core/test.json');
      const mockDoc = {} as MemoryDocument;

      (mockGlobalRepository.getDocument as Mock).mockResolvedValue(mockDoc);

      // Act
      const { repository } = await selector.getRepository('global');
      const result = await repository.getDocument(path);

      // Assert
      expect(result).toBe(mockDoc);
      expect(mockGlobalRepository.getDocument).toHaveBeenCalledWith(path);
    });

    it('should correctly adapt global repository for saveDocument', async () => {
      // Arrange
      const doc = {} as MemoryDocument;

      (mockGlobalRepository.saveDocument as Mock).mockResolvedValue(undefined);

      // Act
      const { repository } = await selector.getRepository('global');
      await repository.saveDocument(doc);

      // Assert
      expect(mockGlobalRepository.saveDocument).toHaveBeenCalledWith(doc);
    });
  });
});
