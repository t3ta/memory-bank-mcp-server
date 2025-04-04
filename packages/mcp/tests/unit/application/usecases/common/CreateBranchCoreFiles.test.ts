import { CreateBranchCoreFilesUseCase } from '../../../../../src/application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { CoreFilesDTO } from '../../../../../src/application/dtos/CoreFilesDTO.js';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { mock } from 'jest-mock-extended';

describe('CreateBranchCoreFilesUseCase', () => {
  let useCase: CreateBranchCoreFilesUseCase;
  let mockMemoryBankRepository: jest.Mocked<IBranchMemoryBankRepository>;

  beforeEach(() => {
    mockMemoryBankRepository = mock<IBranchMemoryBankRepository>();
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
    mockMemoryBankRepository.exists.mockResolvedValue(true);

    // Act
    await useCase.execute({ branchName, files });

    // Assert
    // UseCase内でsaveDocumentを呼んでいるため、saveDocumentの呼び出し回数を確認
    expect(mockMemoryBankRepository.saveDocument).toHaveBeenCalledTimes(4); // progress, activeContext, branchContext, systemPatterns
    // Add more specific assertions here
  });

  // TODO: Add more test cases for edge cases and error handling
});
