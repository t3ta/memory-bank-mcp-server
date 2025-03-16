import { BranchInfo } from '../../../../domain/entities/BranchInfo';
import { UpdateTagIndexUseCaseV2 } from '../UpdateTagIndexUseCaseV2';
import { IBranchMemoryBankRepository } from '../../../../domain/repositories/IBranchMemoryBankRepository';
import { IGlobalMemoryBankRepository } from '../../../../domain/repositories/IGlobalMemoryBankRepository';
import { ITagIndexRepository } from '../../../../domain/repositories/ITagIndexRepository';
import { DomainErrorCodes, DomainError } from '../../../../shared/errors/DomainError';

// Mocks
const mockBranchRepo = {
  exists: jest.fn(),
} as unknown as IBranchMemoryBankRepository;

const mockGlobalRepo = {} as unknown as IGlobalMemoryBankRepository;

const mockTagIndexRepo = {
  updateBranchTagIndex: jest.fn(),
  updateGlobalTagIndex: jest.fn(),
} as unknown as ITagIndexRepository;

describe('UpdateTagIndexUseCaseV2', () => {
  let useCase: UpdateTagIndexUseCaseV2;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new UpdateTagIndexUseCaseV2(mockGlobalRepo, mockBranchRepo, mockTagIndexRepo);
  });

  it('should update global tag index', async () => {
    // Setup
    const mockResult = {
      tags: ['tag1', 'tag2'],
      documentCount: 10,
      updateInfo: {
        fullRebuild: false,
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    };

    mockTagIndexRepo.updateGlobalTagIndex.mockResolvedValue(mockResult);

    // Execute
    const result = await useCase.execute({});

    // Assert
    expect(mockTagIndexRepo.updateGlobalTagIndex).toHaveBeenCalledWith({
      fullRebuild: false,
    });
    expect(result).toEqual({
      tags: ['tag1', 'tag2'],
      documentCount: 10,
      updateInfo: {
        fullRebuild: false,
        updateLocation: 'global',
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    });
  });

  it('should update branch tag index', async () => {
    // Setup
    const branchName = 'feature/test';
    const mockResult = {
      tags: ['tag1', 'tag2', 'tag3'],
      documentCount: 5,
      updateInfo: {
        fullRebuild: true,
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    };

    mockBranchRepo.exists.mockResolvedValue(true);
    mockTagIndexRepo.updateBranchTagIndex.mockResolvedValue(mockResult);

    // Execute
    const result = await useCase.execute({
      branchName,
      fullRebuild: true,
    });

    // Assert
    expect(mockBranchRepo.exists).toHaveBeenCalledWith(branchName);
    expect(mockTagIndexRepo.updateBranchTagIndex).toHaveBeenCalledWith(
      expect.any(BranchInfo),
      { fullRebuild: true }
    );
    expect(result).toEqual({
      tags: ['tag1', 'tag2', 'tag3'],
      documentCount: 5,
      updateInfo: {
        fullRebuild: true,
        updateLocation: branchName,
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    });
  });

  it('should throw when branch does not exist', async () => {
    // Setup
    const branchName = 'feature/nonexistent';
    mockBranchRepo.exists.mockResolvedValue(false);

    // Execute & Assert
    await expect(useCase.execute({ branchName })).rejects.toThrow(
      new DomainError(
        DomainErrorCodes.BRANCH_NOT_FOUND,
        `Branch "${branchName}" not found`
      )
    );
    expect(mockTagIndexRepo.updateBranchTagIndex).not.toHaveBeenCalled();
  });
});
