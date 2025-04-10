import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DocumentRepositorySelector } from '../../../../src/application/services/DocumentRepositorySelector';
import { BranchResolverService } from '../../../../src/application/services/BranchResolverService';
import type { IBranchMemoryBankRepository } from '../../../../src/domain/repositories/IBranchMemoryBankRepository';
import type { IGlobalMemoryBankRepository } from '../../../../src/domain/repositories/IGlobalMemoryBankRepository';
import type { IGitService } from '../../../../src/infrastructure/git/IGitService';
import type { IConfigProvider } from '../../../../src/infrastructure/config/interfaces/IConfigProvider';
import type { WorkspaceConfig } from '../../../../src/infrastructure/config/WorkspaceConfig';
import { BranchInfo } from '../../../../src/domain/entities/BranchInfo';
import { DocumentPath } from '../../../../src/domain/entities/DocumentPath';
import { MemoryDocument } from '../../../../src/domain/entities/MemoryDocument';
import { ApplicationError } from '../../../../src/shared/errors/ApplicationError';
import { Tag } from '../../../../src/domain/entities/Tag';

describe('DocumentRepositorySelector', () => {
  // モックの作成
  const mockBranchRepository: IBranchMemoryBankRepository = {
    exists: vi.fn(),
    initialize: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    saveDocument: vi.fn(),
    deleteDocument: vi.fn(),
    findDocumentsByTags: vi.fn(),
    getRecentBranches: vi.fn(),
    validateStructure: vi.fn(),
    saveTagIndex: vi.fn(),
    getTagIndex: vi.fn(),
    findDocumentPathsByTagsUsingIndex: vi.fn()
  } as unknown as IBranchMemoryBankRepository;

  const mockGlobalRepository: IGlobalMemoryBankRepository = {
    initialize: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    saveDocument: vi.fn(),
    deleteDocument: vi.fn(),
    findDocumentsByTags: vi.fn(),
    updateTagsIndex: vi.fn(),
    validateStructure: vi.fn(),
    saveTagIndex: vi.fn(),
    getTagIndex: vi.fn(),
    findDocumentPathsByTagsUsingIndex: vi.fn()
  } as unknown as IGlobalMemoryBankRepository;

  // BranchResolverServiceで必要なモック
  const mockGitService: IGitService = {
    getCurrentBranchName: vi.fn()
  } as unknown as IGitService;

  const mockConfigProvider: IConfigProvider = {
    initialize: vi.fn(),
    getConfig: vi.fn(),
    getGlobalMemoryPath: vi.fn(),
    getBranchMemoryPath: vi.fn(),
    getLanguage: vi.fn()
  } as unknown as IConfigProvider;

  // BranchResolverServiceのモック
  const mockBranchResolver = {
    resolveBranchName: vi.fn()
  } as unknown as BranchResolverService;

  let documentRepositorySelector: DocumentRepositorySelector;

  beforeEach(() => {
    // テスト前にモックをリセット
    vi.clearAllMocks();
    
    // テスト対象のインスタンスを生成
    documentRepositorySelector = new DocumentRepositorySelector(
      mockBranchRepository,
      mockGlobalRepository,
      mockBranchResolver
    );
  });

  describe('getRepository', () => {
    it('should return branch repository for branch scope', async () => {
      // Arrange
      const branchName = 'feature/test';
      mockBranchResolver.resolveBranchName.mockResolvedValue(branchName);
      
      // Act
      const result = await documentRepositorySelector.getRepository('branch', branchName);
      
      // Assert
      expect(mockBranchResolver.resolveBranchName).toHaveBeenCalledWith(branchName);
      expect(result.branchInfo).toBeDefined();
      expect(result.branchInfo?.name).toBe(branchName);
      expect(result.repository).toBeDefined();
    });

    it('should return global repository for global scope', async () => {
      // Act
      const result = await documentRepositorySelector.getRepository('global');
      
      // Assert
      expect(mockBranchResolver.resolveBranchName).not.toHaveBeenCalled();
      expect(result.branchInfo).toBeUndefined();
      expect(result.repository).toBeDefined();
    });

    it('should resolve branch name for branch scope', async () => {
      // Arrange
      const resolvedBranchName = 'feature/resolved';
      mockBranchResolver.resolveBranchName.mockResolvedValue(resolvedBranchName);
      
      // Act
      const result = await documentRepositorySelector.getRepository('branch', 'feature/test');
      
      // Assert
      expect(mockBranchResolver.resolveBranchName).toHaveBeenCalledWith('feature/test');
      expect(result.branchInfo?.name).toBe(resolvedBranchName);
    });

    it('should create adapter that forwards to correct repository for branch scope', async () => {
      // Arrange
      const branchName = 'feature/test';
      const path = DocumentPath.create('test/path.json');
      const mockDocument = {
        path,
        content: JSON.stringify({ test: 'data' }),
        tags: [Tag.create('test')],
        lastModified: new Date()
      } as MemoryDocument;
      
      mockBranchResolver.resolveBranchName.mockResolvedValue(branchName);
      mockBranchRepository.getDocument.mockResolvedValue(mockDocument);
      
      // Act
      const result = await documentRepositorySelector.getRepository('branch', branchName);
      const document = await result.repository.getDocument(path);
      await result.repository.saveDocument(mockDocument);
      
      // Assert
      expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(
        expect.objectContaining({ name: branchName }), 
        path
      );
      expect(mockBranchRepository.saveDocument).toHaveBeenCalledWith(
        expect.objectContaining({ name: branchName }), 
        mockDocument
      );
      expect(document).toBe(mockDocument);
    });

    it('should create adapter that forwards to correct repository for global scope', async () => {
      // Arrange
      const path = DocumentPath.create('core/test.json');
      const mockDocument = {
        path,
        content: JSON.stringify({ test: 'global data' }),
        tags: [Tag.create('core')],
        lastModified: new Date()
      } as MemoryDocument;
      
      mockGlobalRepository.getDocument.mockResolvedValue(mockDocument);
      
      // Act
      const result = await documentRepositorySelector.getRepository('global');
      const document = await result.repository.getDocument(path);
      await result.repository.saveDocument(mockDocument);
      
      // Assert
      expect(mockGlobalRepository.getDocument).toHaveBeenCalledWith(path);
      expect(mockGlobalRepository.saveDocument).toHaveBeenCalledWith(mockDocument);
      expect(mockGlobalRepository.updateTagsIndex).toHaveBeenCalled();
      expect(document).toBe(mockDocument);
    });

    it('should throw for invalid scope', async () => {
      // Act & Assert
      // @ts-expect-error Testing invalid scope
      await expect(documentRepositorySelector.getRepository('invalid')).rejects.toThrow();
    });
  });
});
