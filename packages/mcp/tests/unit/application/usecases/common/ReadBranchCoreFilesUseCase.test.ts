import { ReadBranchCoreFilesUseCase } from '../../../../../src/application/usecases/common/ReadBranchCoreFilesUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { mock } from 'jest-mock-extended';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';
import { DomainError, DomainErrorCodes } from '../../../../../src/shared/errors/DomainError.js'; // DomainErrorCodesもインポート
import { ApplicationError, ApplicationErrorCodes } from '../../../../../src/shared/errors/ApplicationError.js'; // ApplicationErrorをインポート

describe('ReadBranchCoreFilesUseCase', () => {
  let useCase: ReadBranchCoreFilesUseCase;
  let mockBranchRepository: jest.Mocked<IBranchMemoryBankRepository>;

  const branchName = 'feature/test-branch';
  const branchInfo = BranchInfo.create(branchName);

  const mockDocument = (path: string, content: object) =>
    MemoryDocument.create({
      path: DocumentPath.create(path),
      content: JSON.stringify(content),
      tags: [Tag.create('core')],
      lastModified: new Date(),
    });

  const mockProgress = mockDocument('progress.json', { summary: 'Test Progress' });
  const mockActiveContext = mockDocument('activeContext.json', { current_task: 'Test Task' });
  const mockBranchContext = mockDocument('branchContext.json', { description: 'Test Context' });
  const mockSystemPatterns = mockDocument('systemPatterns.json', { patterns: [] });


  beforeEach(() => {
    mockBranchRepository = mock<IBranchMemoryBankRepository>();
    useCase = new ReadBranchCoreFilesUseCase(mockBranchRepository);
  });

  it('should return all core files when they exist', async () => {
    // Arrange
    mockBranchRepository.getDocument.mockImplementation(async (argBranchInfo, argPath) => {
      if (!argBranchInfo.equals(branchInfo)) return null;
      if (argPath.equals(DocumentPath.create('progress.json'))) return mockProgress;
      if (argPath.equals(DocumentPath.create('activeContext.json'))) return mockActiveContext;
      if (argPath.equals(DocumentPath.create('branchContext.json'))) return mockBranchContext;
      if (argPath.equals(DocumentPath.create('systemPatterns.json'))) return mockSystemPatterns;
      return null;
    });

    // Act
    const result = await useCase.execute({ branchName });

    // Assert
    expect(result.files.progress).toEqual(JSON.parse(mockProgress.content));
    expect(result.files.activeContext).toEqual(JSON.parse(mockActiveContext.content));
    expect(result.files.branchContext).toEqual(mockBranchContext.content);
    expect(result.files.systemPatterns).toEqual(JSON.parse(mockSystemPatterns.content));
    expect(mockBranchRepository.getDocument).toHaveBeenCalledTimes(4);
  });

  it('should return other core files even if progress.json is missing', async () => {
    // Arrange
    mockBranchRepository.getDocument.mockImplementation(async (argBranchInfo, argPath) => {
      if (!argBranchInfo.equals(branchInfo)) return null;
      if (argPath.equals(DocumentPath.create('progress.json'))) return null;
      if (argPath.equals(DocumentPath.create('activeContext.json'))) return mockActiveContext;
      if (argPath.equals(DocumentPath.create('branchContext.json'))) return mockBranchContext;
      if (argPath.equals(DocumentPath.create('systemPatterns.json'))) return mockSystemPatterns;
      return null;
    });

    // Act
    const result = await useCase.execute({ branchName });

    // Assert
    expect(result.files.progress).toBeUndefined();
    expect(result.files.activeContext).toEqual(JSON.parse(mockActiveContext.content));
    expect(result.files.branchContext).toEqual(mockBranchContext.content);
    expect(result.files.systemPatterns).toEqual(JSON.parse(mockSystemPatterns.content));
    expect(mockBranchRepository.getDocument).toHaveBeenCalledTimes(4);
  });

   it('should return other core files even if activeContext.json is missing', async () => {
    // Arrange
    mockBranchRepository.getDocument.mockImplementation(async (argBranchInfo, argPath) => {
      if (!argBranchInfo.equals(branchInfo)) return null;
      if (argPath.equals(DocumentPath.create('progress.json'))) return mockProgress;
      if (argPath.equals(DocumentPath.create('activeContext.json'))) return null;
      if (argPath.equals(DocumentPath.create('branchContext.json'))) return mockBranchContext;
      if (argPath.equals(DocumentPath.create('systemPatterns.json'))) return mockSystemPatterns;
      return null;
    });

    // Act
    const result = await useCase.execute({ branchName });

    // Assert
    expect(result.files.progress).toEqual(JSON.parse(mockProgress.content));
    expect(result.files.activeContext).toBeUndefined();
    expect(result.files.branchContext).toEqual(mockBranchContext.content);
    expect(result.files.systemPatterns).toEqual(JSON.parse(mockSystemPatterns.content));
    expect(mockBranchRepository.getDocument).toHaveBeenCalledTimes(4);
  });

 it('should return other core files even if branchContext.json is missing', async () => {
  // Arrange
  mockBranchRepository.getDocument.mockImplementation(async (argBranchInfo, argPath) => {
    if (!argBranchInfo.equals(branchInfo)) return null;
    if (argPath.equals(DocumentPath.create('progress.json'))) return mockProgress;
    if (argPath.equals(DocumentPath.create('activeContext.json'))) return mockActiveContext;
    if (argPath.equals(DocumentPath.create('branchContext.json'))) return null;
    if (argPath.equals(DocumentPath.create('systemPatterns.json'))) return mockSystemPatterns;
    return null;
  });

  // Act
  const result = await useCase.execute({ branchName });

  // Assert
  expect(result.files.progress).toEqual(JSON.parse(mockProgress.content));
  expect(result.files.activeContext).toEqual(JSON.parse(mockActiveContext.content));
  expect(result.files.branchContext).toBeUndefined();
  expect(result.files.systemPatterns).toEqual(JSON.parse(mockSystemPatterns.content));
  expect(mockBranchRepository.getDocument).toHaveBeenCalledTimes(4);
});

 it('should return default systemPatterns if systemPatterns.json is missing', async () => {
  // Arrange
  mockBranchRepository.getDocument.mockImplementation(async (argBranchInfo, argPath) => {
    if (!argBranchInfo.equals(branchInfo)) return null;
    if (argPath.equals(DocumentPath.create('progress.json'))) return mockProgress;
    if (argPath.equals(DocumentPath.create('activeContext.json'))) return mockActiveContext;
    if (argPath.equals(DocumentPath.create('branchContext.json'))) return mockBranchContext;
    if (argPath.equals(DocumentPath.create('systemPatterns.json'))) return null;
    return null;
  });
   mockBranchRepository.exists.mockResolvedValue(true);

  // Act
  const result = await useCase.execute({ branchName });

  // Assert
  expect(result.files.progress).toEqual(JSON.parse(mockProgress.content));
  expect(result.files.activeContext).toEqual(JSON.parse(mockActiveContext.content));
  expect(result.files.branchContext).toEqual(mockBranchContext.content);
  expect(result.files.systemPatterns).toEqual({ technicalDecisions: [] });
  expect(mockBranchRepository.getDocument).toHaveBeenCalledTimes(4);
});

 it('should throw ApplicationError if repository throws error during getDocument', async () => {
  // Arrange
  const repoError = new Error('Failed to read document');
   mockBranchRepository.exists.mockResolvedValue(true);
  mockBranchRepository.getDocument
      .mockImplementation(async (argBranchInfo, argPath) => {
          console.log(`[Test Debug] getDocument called with path: ${argPath.value}`);
          if(argPath.equals(DocumentPath.create('activeContext.json'))) {
              console.log('[Test Debug] Throwing error for activeContext.json');
              throw repoError;
          }
           if (argPath.equals(DocumentPath.create('progress.json'))) {
               console.log('[Test Debug] Returning mockProgress');
               return mockProgress;
           }
           if (argPath.equals(DocumentPath.create('branchContext.json'))) {
               console.log('[Test Debug] Returning mockBranchContext');
               return mockBranchContext;
           }
           if (argPath.equals(DocumentPath.create('systemPatterns.json'))) {
               console.log('[Test Debug] Returning mockSystemPatterns');
               return mockSystemPatterns;
           }
          console.log('[Test Debug] Returning null');
          return null;
      });


  // Act & Assert
  // エラーが ApplicationError であること、メッセージ、元のエラーが含まれることを確認
  await expect(useCase.execute({ branchName })).rejects.toThrowError(
      new ApplicationError(
          ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
          `Failed to read activeContext: ${repoError.message}`,
          { originalError: repoError }
      )
  );
   expect(mockBranchRepository.getDocument).toHaveBeenCalled();
});

 it('should throw ApplicationError if branch name is missing', async () => {
  // Act & Assert
  await expect(useCase.execute({ branchName: '' })).rejects.toThrowError(
    new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Branch name is required') // エラーインスタンスで比較
  );
});

 it('should attempt auto-initialization if branch does not exist', async () => {
  // Arrange
  mockBranchRepository.exists.mockResolvedValue(false);
  mockBranchRepository.initialize.mockResolvedValue(undefined);
   mockBranchRepository.getDocument.mockImplementation(async (argBranchInfo, argPath) => {
    if (!argBranchInfo.equals(branchInfo)) return null;
    return null;
  });

  // Act
  const result = await useCase.execute({ branchName });

  // Assert
  expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchName);
  expect(mockBranchRepository.initialize).toHaveBeenCalledWith(branchInfo);
  expect(mockBranchRepository.getDocument).toHaveBeenCalledTimes(4);
  expect(result.files.progress).toBeUndefined();
  expect(result.files.activeContext).toBeUndefined();
  expect(result.files.branchContext).toBeUndefined();
  expect(result.files.systemPatterns).toEqual({ technicalDecisions: [] });
});

 it('should throw DomainError if auto-initialization fails', async () => {
  // Arrange
  mockBranchRepository.exists.mockResolvedValue(false);
  const initError = new Error('Initialization failed');
  mockBranchRepository.initialize.mockRejectedValue(initError);

  // Act & Assert
  await expect(useCase.execute({ branchName })).rejects.toThrowError(
    new DomainError(DomainErrorCodes.BRANCH_INITIALIZATION_FAILED, `Failed to auto-initialize branch: ${branchName}`) // エラーインスタンスで比較
  );
   expect(mockBranchRepository.initialize).toHaveBeenCalledWith(branchInfo);
   expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
});
}); // describeブロックの閉じ括弧
