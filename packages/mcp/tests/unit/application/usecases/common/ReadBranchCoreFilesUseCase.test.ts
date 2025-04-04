import { ReadBranchCoreFilesUseCase } from '../../../../../src/application/usecases/common/ReadBranchCoreFilesUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { mock } from 'jest-mock-extended';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';

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
    expect(result.files.progress).toEqual(JSON.parse(mockProgress.content)); // result.files.progress に修正 & JSON.parse
    expect(result.files.activeContext).toEqual(JSON.parse(mockActiveContext.content)); // result.files.activeContext に修正 & JSON.parse
    expect(result.files.branchContext).toEqual(mockBranchContext.content); // result.files.branchContext に修正 (文字列なのでparse不要)
    expect(result.files.systemPatterns).toEqual(JSON.parse(mockSystemPatterns.content)); // result.files.systemPatterns に修正 & JSON.parse
    expect(mockBranchRepository.getDocument).toHaveBeenCalledTimes(4); // readDocument -> getDocument
  });

  it('should return other core files even if progress.json is missing', async () => {
    // Arrange
    mockBranchRepository.getDocument.mockImplementation(async (argBranchInfo, argPath) => {
      if (!argBranchInfo.equals(branchInfo)) return null;
      if (argPath.equals(DocumentPath.create('progress.json'))) return null; // progress.json だけ null を返す
      if (argPath.equals(DocumentPath.create('activeContext.json'))) return mockActiveContext;
      if (argPath.equals(DocumentPath.create('branchContext.json'))) return mockBranchContext;
      if (argPath.equals(DocumentPath.create('systemPatterns.json'))) return mockSystemPatterns;
      return null;
    });

    // Act
    const result = await useCase.execute({ branchName });

    // Assert
    expect(result.files.progress).toBeUndefined(); // progress は undefined になるはず
    expect(result.files.activeContext).toEqual(JSON.parse(mockActiveContext.content));
    expect(result.files.branchContext).toEqual(mockBranchContext.content);
    expect(result.files.systemPatterns).toEqual(JSON.parse(mockSystemPatterns.content));
    expect(mockBranchRepository.getDocument).toHaveBeenCalledTimes(4); // 全てのファイル取得を試みるはず
  });

   it('should return other core files even if activeContext.json is missing', async () => {
    // Arrange
    mockBranchRepository.getDocument.mockImplementation(async (argBranchInfo, argPath) => {
      if (!argBranchInfo.equals(branchInfo)) return null;
      if (argPath.equals(DocumentPath.create('progress.json'))) return mockProgress;
      if (argPath.equals(DocumentPath.create('activeContext.json'))) return null; // activeContext.json だけ null を返す
      if (argPath.equals(DocumentPath.create('branchContext.json'))) return mockBranchContext;
      if (argPath.equals(DocumentPath.create('systemPatterns.json'))) return mockSystemPatterns;
      return null;
    });

    // Act
    const result = await useCase.execute({ branchName });

    // Assert
    expect(result.files.progress).toEqual(JSON.parse(mockProgress.content));
    expect(result.files.activeContext).toBeUndefined(); // activeContext は undefined になるはず
    expect(result.files.branchContext).toEqual(mockBranchContext.content);
    expect(result.files.systemPatterns).toEqual(JSON.parse(mockSystemPatterns.content));
    expect(mockBranchRepository.getDocument).toHaveBeenCalledTimes(4); // 全てのファイル取得を試みるはず
  });

  // TODO: Add tests for missing branchContext.json and systemPatterns.json
  // TODO: Add test for repository error during readDocument
});
