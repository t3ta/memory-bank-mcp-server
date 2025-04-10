import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { CreateBranchCoreFilesUseCase } from '../../../../../src/application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { CoreFilesDTO } from '../../../../../src/application/dtos/CoreFilesDTO.js';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
// import { mock } from 'jest-mock-extended'; // jest-mock-extended を削除

describe('CreateBranchCoreFilesUseCase Unit Tests', () => {
  let useCase: CreateBranchCoreFilesUseCase;
  // jest.Mocked を削除し、手動モックの型を指定
  let mockMemoryBankRepository: IBranchMemoryBankRepository;

  beforeEach(() => {
    // jest-mock-extended の代わりに vi.fn() で手動モックを作成する
    mockMemoryBankRepository = {
      initialize: vi.fn(),
      exists: vi.fn(),
      getDocument: vi.fn(),
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
      getRecentBranches: vi.fn(),
      listDocuments: vi.fn(),
      findDocumentsByTags: vi.fn(),
      validateStructure: vi.fn(),
      saveTagIndex: vi.fn(),
      getTagIndex: vi.fn(),
      findDocumentPathsByTagsUsingIndex: vi.fn(),
    };
    useCase = new CreateBranchCoreFilesUseCase(mockMemoryBankRepository);
  });

  it('should call branchRepository.saveDocument 4 times when creating core files', async () => {
    // Arrange
    const branchName = 'feature/new-branch';
    const branchInfo = BranchInfo.create(branchName);
    const files: CoreFilesDTO = {
      branchContext: 'test branch context',
      activeContext: {},
      progress: {},
      systemPatterns: { technicalDecisions: [{ title: 'dummy', context: 'dummy', decision: 'dummy', consequences: [] }] }
    };
    (mockMemoryBankRepository.exists as Mock).mockResolvedValue(true);

    // Act
    await useCase.execute({ branchName, files });

    // Assert
    // Check that each core file was attempted to be saved with the correct arguments
    expect(mockMemoryBankRepository.saveDocument).toHaveBeenCalledWith(
      branchInfo,
      expect.objectContaining({
        path: expect.objectContaining({ value: 'branchContext.json' }),
        content: files.branchContext,
        tags: expect.arrayContaining([expect.objectContaining({ value: 'core' }), expect.objectContaining({ value: 'branch-context' })])
      })
    );
     expect(mockMemoryBankRepository.saveDocument).toHaveBeenCalledWith(
      branchInfo,
      expect.objectContaining({
        path: expect.objectContaining({ value: 'activeContext.json' }),
        content: expect.any(String), // Content is generated, so just check the type
        tags: expect.arrayContaining([expect.objectContaining({ value: 'core' }), expect.objectContaining({ value: 'active-context' })])
      })
    );
     expect(mockMemoryBankRepository.saveDocument).toHaveBeenCalledWith(
      branchInfo,
      expect.objectContaining({
        path: expect.objectContaining({ value: 'progress.json' }),
        content: expect.any(String), // Content is generated, so just check the type
        tags: expect.arrayContaining([expect.objectContaining({ value: 'core' }), expect.objectContaining({ value: 'progress' })])
      })
    );
     expect(mockMemoryBankRepository.saveDocument).toHaveBeenCalledWith(
      branchInfo,
      expect.objectContaining({
        path: expect.objectContaining({ value: 'systemPatterns.json' }),
        content: expect.any(String), // Content is generated, so just check the type
        tags: expect.arrayContaining([expect.objectContaining({ value: 'core' }), expect.objectContaining({ value: 'system-patterns' })])
      })
    );
  });

  it('should throw ApplicationError if branchName is missing', async () => {
    // Arrange
    const files: CoreFilesDTO = { branchContext: 'test' }; // files is required

    // Act & Assert
    try {
      await useCase.execute({ branchName: '', files });
      throw new Error('Expected ApplicationError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty('code', 'APP_ERROR.INVALID_INPUT');
      expect((error as Error).message).toBe('Branch name is required');
    }
    expect(mockMemoryBankRepository.saveDocument).not.toHaveBeenCalled();
  });

   it('should throw ApplicationError if files data is missing', async () => {
    // Arrange
    const branchName = 'feature/no-files';

    // Act & Assert
    try {
      // @ts-expect-error files is required
      await useCase.execute({ branchName, files: undefined });
      throw new Error('Expected ApplicationError to be thrown');
    } catch (error) {
       expect(error).toBeInstanceOf(Error);
       expect(error).toHaveProperty('code', 'APP_ERROR.INVALID_INPUT');
       expect((error as Error).message).toBe('Core files data is required');
    }
     expect(mockMemoryBankRepository.saveDocument).not.toHaveBeenCalled();
  });

   it('should throw DomainError if branch does not exist', async () => {
    // Arrange
    const branchName = 'feature/non-existent';
    const files: CoreFilesDTO = { branchContext: 'test' };
    (mockMemoryBankRepository.exists as Mock).mockResolvedValue(false);

    // Act & Assert
    try {
      await useCase.execute({ branchName, files });
      throw new Error('Expected DomainError to be thrown');
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toHaveProperty('code', 'DOMAIN_ERROR.BRANCH_NOT_FOUND');
        expect((error as Error).message).toBe(`Branch "${branchName}" not found`);
    }
     expect(mockMemoryBankRepository.saveDocument).not.toHaveBeenCalled();
  });

   it('should throw ApplicationError if repository throws error during saveDocument', async () => {
    // Arrange
    const branchName = 'feature/save-error';
     BranchInfo.create(branchName);
    const files: CoreFilesDTO = { branchContext: 'test context' }; // Only branchContext is needed for saveDocument to be called
    (mockMemoryBankRepository.exists as Mock).mockResolvedValue(true);
    const saveError = new Error('Failed to save');
    (mockMemoryBankRepository.saveDocument as Mock).mockRejectedValue(saveError);

    // Act & Assert
    try {
      await useCase.execute({ branchName, files });
      throw new Error('Expected ApplicationError to be thrown');
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toHaveProperty('code', 'APP_ERROR.USE_CASE_EXECUTION_FAILED');
        expect((error as Error).message).toContain('Failed to create/update core files: Failed to save');
        // Checking originalError might be more robust, but omitted for now
    }
     expect(mockMemoryBankRepository.saveDocument).toHaveBeenCalledTimes(1); // Should be called once
  });
});
