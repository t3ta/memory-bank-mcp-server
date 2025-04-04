import { ReadContextUseCase } from '../../../../../src/application/usecases/common/ReadContextUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository.js';
// import { IRulesRepository } from '../../../../../src/domain/repositories/IRulesRepository.js';
import { mock } from 'jest-mock-extended';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';
// import { Rules } from '../../../../../src/domain/entities/Rules.js';

describe('ReadContextUseCase', () => {
  let useCase: ReadContextUseCase;
  let mockBranchRepo: jest.Mocked<IBranchMemoryBankRepository>;
  let mockGlobalRepo: jest.Mocked<IGlobalMemoryBankRepository>;
  // let mockRulesRepo: jest.Mocked<IRulesRepository>;

  const branchName = 'feature/test-context';
  const branchInfo = BranchInfo.create(branchName);
  const language = 'ja'; // UseCase内で使われていないが、Inputには必要
  const docsPath = '/path/to/docs'; // UseCase内で使われていないが、Inputには必要

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
  const mockGlobalDocPath = DocumentPath.create('core/config.json'); // core/ ディレクトリ配下に修正
  const mockGlobalDoc = mockDocument(mockGlobalDocPath.value, { setting: 'global_value' });
  // const mockRules = new Rules({ general: ['Rule 1'], specific: { 'feature/test-context': ['Specific Rule'] } });

  beforeEach(() => {
    mockBranchRepo = mock<IBranchMemoryBankRepository>();
    mockGlobalRepo = mock<IGlobalMemoryBankRepository>();
    // mockRulesRepo = mock<IRulesRepository>();
    useCase = new ReadContextUseCase(mockBranchRepo, mockGlobalRepo); // 引数を2つに修正

    // Setup default mocks
    mockBranchRepo.getDocument.mockImplementation(async (argBranchInfo, argPath) => {
      if (!argBranchInfo.equals(branchInfo)) return null;
      if (argPath.equals(DocumentPath.create('progress.json'))) return mockProgress;
      if (argPath.equals(DocumentPath.create('activeContext.json'))) return mockActiveContext;
      if (argPath.equals(DocumentPath.create('branchContext.json'))) return mockBranchContext;
      if (argPath.equals(DocumentPath.create('systemPatterns.json'))) return mockSystemPatterns;
      return null;
    });
    mockBranchRepo.listDocuments.mockResolvedValue([
      DocumentPath.create('progress.json'),
      DocumentPath.create('activeContext.json'),
      DocumentPath.create('branchContext.json'),
      DocumentPath.create('systemPatterns.json'),
    ]);
    mockGlobalRepo.listDocuments.mockResolvedValue([mockGlobalDocPath]); // 修正したパスを使う
    mockGlobalRepo.getDocument.mockResolvedValue(mockGlobalDoc);
    // mockRulesRepo.getRules.mockResolvedValue(mockRules);
  });

  it('should return branch and global memory information', async () => { // Rulesは返さないのでテスト名変更
    // Act
    const result = await useCase.execute({ branch: branchName, language }); // docs引数を削除

    // Assert
    expect(result.rules).toBeUndefined(); // rules は undefined になるはず
    expect(result.branchMemory).toEqual({
      'progress.json': mockProgress.content,
      'activeContext.json': mockActiveContext.content,
      'branchContext.json': mockBranchContext.content,
      'systemPatterns.json': mockSystemPatterns.content,
    });
    expect(result.globalMemory).toEqual({
      [mockGlobalDocPath.value]: mockGlobalDoc.content,
    });

    // expect(mockRulesRepo.getRules).toHaveBeenCalledWith(language, docsPath);
    expect(mockBranchRepo.getDocument).toHaveBeenCalledTimes(4);
    expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
    expect(mockGlobalRepo.getDocument).toHaveBeenCalledWith(mockGlobalDocPath); // 修正したパスを使う
  });

  it('should return empty global memory if no global documents found', async () => {
    // Arrange
    mockGlobalRepo.listDocuments.mockResolvedValue([]); // グローバルドキュメントがないケース

    // Act
    const result = await useCase.execute({ branch: branchName, language }); // docs引数を削除

    // Assert
    expect(result.globalMemory).toEqual({});
    expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
    expect(mockGlobalRepo.getDocument).not.toHaveBeenCalled(); // getDocument は呼ばれないはず
  });

  // TODO: Add tests for missing branch core files (should still return others)
  // TODO: Add tests for repository errors
});
