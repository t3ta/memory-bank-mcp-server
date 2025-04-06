import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { CreateBranchCoreFilesUseCase } from '../../../../../src/application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { CoreFilesDTO } from '../../../../../src/application/dtos/CoreFilesDTO.js';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
// import { mock } from 'jest-mock-extended'; // jest-mock-extended を削除

describe('CreateBranchCoreFilesUseCase', () => {
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

  it('should call branchRepository.saveDocument 4 times when creating core files for a new branch', async () => {
    // Arrange
    const branchName = 'feature/new-branch';
    const branchInfo = BranchInfo.create(branchName);
    const files: CoreFilesDTO = { // CoreFilesDTO の最低限のモック
      branchContext: 'test branch context',
      activeContext: {}, // ActiveContextDTO の最低限
      progress: {},      // ProgressDTO の最低限
      systemPatterns: { technicalDecisions: [{ title: 'dummy', context: 'dummy', decision: 'dummy', consequences: [] }] }
    };
    (mockMemoryBankRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加

    // Act
    await useCase.execute({ branchName, files });

    // Assert
    // expect(mockMemoryBankRepository.saveDocument).toHaveBeenCalledTimes(4); // 回数チェックをやめて個別チェックにする
    // 各ファイルが正しい引数で保存されようとしたかチェック
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
        content: expect.any(String), // 中身は生成されるので型だけチェック
        tags: expect.arrayContaining([expect.objectContaining({ value: 'core' }), expect.objectContaining({ value: 'active-context' })])
      })
    );
     expect(mockMemoryBankRepository.saveDocument).toHaveBeenCalledWith(
      branchInfo,
      expect.objectContaining({
        path: expect.objectContaining({ value: 'progress.json' }),
        content: expect.any(String), // 中身は生成されるので型だけチェック
        tags: expect.arrayContaining([expect.objectContaining({ value: 'core' }), expect.objectContaining({ value: 'progress' })])
      })
    );
     expect(mockMemoryBankRepository.saveDocument).toHaveBeenCalledWith(
      branchInfo,
      expect.objectContaining({
        path: expect.objectContaining({ value: 'systemPatterns.json' }),
        content: expect.any(String), // 中身は生成されるので型だけチェック
        tags: expect.arrayContaining([expect.objectContaining({ value: 'core' }), expect.objectContaining({ value: 'system-patterns' })])
      })
    );
  });

  it('should throw ApplicationError if branchName is missing', async () => {
    // Arrange
    const files: CoreFilesDTO = { branchContext: 'test' }; // filesは何か必要

    // Act & Assert
    try {
      await useCase.execute({ branchName: '', files });
      throw new Error('Expected ApplicationError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty('code', 'APP_ERROR.INVALID_INPUT'); // プレフィックス付きで比較
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
       expect(error).toHaveProperty('code', 'APP_ERROR.INVALID_INPUT'); // プレフィックス付きで比較
       expect((error as Error).message).toBe('Core files data is required');
    }
     expect(mockMemoryBankRepository.saveDocument).not.toHaveBeenCalled();
  });

   it('should throw DomainError if branch does not exist', async () => {
    // Arrange
    const branchName = 'feature/non-existent';
    const files: CoreFilesDTO = { branchContext: 'test' };
    (mockMemoryBankRepository.exists as Mock).mockResolvedValue(false); // as Mock 追加

    // Act & Assert
    try {
      await useCase.execute({ branchName, files });
      throw new Error('Expected DomainError to be thrown');
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toHaveProperty('code', 'DOMAIN_ERROR.BRANCH_NOT_FOUND'); // プレフィックス付きで比較
        expect((error as Error).message).toBe(`Branch "${branchName}" not found`);
    }
     expect(mockMemoryBankRepository.saveDocument).not.toHaveBeenCalled();
  });

   it('should throw ApplicationError if repository throws error during saveDocument', async () => {
    // Arrange
    const branchName = 'feature/save-error';
     BranchInfo.create(branchName);
    const files: CoreFilesDTO = { branchContext: 'test context' }; // branchContextだけあればsaveDocumentが呼ばれる
    (mockMemoryBankRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    const saveError = new Error('Failed to save');
    (mockMemoryBankRepository.saveDocument as Mock).mockRejectedValue(saveError); // as Mock 追加

    // Act & Assert
    try {
      await useCase.execute({ branchName, files });
      throw new Error('Expected ApplicationError to be thrown');
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toHaveProperty('code', 'APP_ERROR.USE_CASE_EXECUTION_FAILED'); // プレフィックス付きで比較
        expect((error as Error).message).toContain('Failed to create/update core files: Failed to save');
        // originalError のチェックも追加した方がより確実だけど、一旦省略
    }
     expect(mockMemoryBankRepository.saveDocument).toHaveBeenCalledTimes(1); // 1回は呼ばれるはず
  });
});
