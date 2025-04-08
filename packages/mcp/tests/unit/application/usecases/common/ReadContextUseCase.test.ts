import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { ReadContextUseCase } from '../../../../../src/application/usecases/common/ReadContextUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository.js';
// import { IRulesRepository } from '../../../../../src/domain/repositories/IRulesRepository.js';
// import { mock } from 'jest-mock-extended'; // jest-mock-extended を削除
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';
// import { Rules } from '../../../../../src/domain/entities/Rules.js';

describe('ReadContextUseCase Unit Tests', () => {
  let useCase: ReadContextUseCase;
  // jest.Mocked を削除し、手動モックの型を指定
  let mockBranchRepo: IBranchMemoryBankRepository;
  let mockGlobalRepo: IGlobalMemoryBankRepository;
  // let mockRulesRepo: IRulesRepository;

  const branchName = 'feature/test-context';
  const branchInfo = BranchInfo.create(branchName);
  const language = 'ja'; // Required for input, though not directly used in this version of the use case

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
  const mockGlobalDocPath = DocumentPath.create('core/config.json'); // Path corrected to be under core/
  const mockGlobalDoc = mockDocument(mockGlobalDocPath.value, { setting: 'global_value' });
  // const mockRules = new Rules({ general: ['Rule 1'], specific: { 'feature/test-context': ['Specific Rule'] } });

  beforeEach(() => {
    // jest-mock-extended の代わりに vi.fn() で手動モックを作成する
    mockBranchRepo = {
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
    mockGlobalRepo = {
      initialize: vi.fn(),
      getDocument: vi.fn(),
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
      listDocuments: vi.fn(),
      findDocumentsByTags: vi.fn(),
      validateStructure: vi.fn(),
      saveTagIndex: vi.fn(),
      getTagIndex: vi.fn(),
      findDocumentPathsByTagsUsingIndex: vi.fn(),
      updateTagsIndex: vi.fn(), // 不足していたメソッドを追加
    };
    // mockRulesRepo = { getRules: vi.fn() };
    useCase = new ReadContextUseCase(mockBranchRepo, mockGlobalRepo); // Corrected to two arguments

    // Setup default mocks
    (mockBranchRepo.getDocument as Mock).mockImplementation(async (argBranchInfo, argPath) => {
      if (!argBranchInfo.equals(branchInfo)) return null;
      if (argPath.equals(DocumentPath.create('progress.json'))) return mockProgress;
      if (argPath.equals(DocumentPath.create('activeContext.json'))) return mockActiveContext;
      if (argPath.equals(DocumentPath.create('branchContext.json'))) return mockBranchContext;
      if (argPath.equals(DocumentPath.create('systemPatterns.json'))) return mockSystemPatterns;
      return null;
    });
    (mockBranchRepo.listDocuments as Mock).mockResolvedValue([
      DocumentPath.create('progress.json'),
      DocumentPath.create('activeContext.json'),
      DocumentPath.create('branchContext.json'),
      DocumentPath.create('systemPatterns.json'),
    ]);
    (mockGlobalRepo.listDocuments as Mock).mockResolvedValue([mockGlobalDocPath]);
    (mockGlobalRepo.getDocument as Mock).mockResolvedValue(mockGlobalDoc);
    // mockRulesRepo.getRules.mockResolvedValue(mockRules);
  });

  it('should return branch and global memory information', async () => { // Test name changed as Rules are not returned
    // Act
    const result = await useCase.execute({ branch: branchName, language }); // Removed docs argument

    // Assert
    expect(result.rules).toBeUndefined(); // rules should be undefined
    // Expect parsed objects instead of strings
    expect(result.branchMemory).toEqual({
      'progress.json': JSON.parse(mockProgress.content),
      'activeContext.json': JSON.parse(mockActiveContext.content),
      'branchContext.json': JSON.parse(mockBranchContext.content),
      'systemPatterns.json': JSON.parse(mockSystemPatterns.content),
    });
    expect(result.globalMemory).toEqual({
      [mockGlobalDocPath.value]: JSON.parse(mockGlobalDoc.content),
    });

    // expect(mockRulesRepo.getRules).toHaveBeenCalledWith(language, docsPath);
    expect(mockBranchRepo.getDocument).toHaveBeenCalledTimes(4);
    expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
    expect(mockGlobalRepo.getDocument).toHaveBeenCalledWith(mockGlobalDocPath); // Use the corrected path
  });

  it('should return empty global memory if no global documents found', async () => {
    // Arrange
    (mockGlobalRepo.listDocuments as Mock).mockResolvedValue([]);

    // Act
    const result = await useCase.execute({ branch: branchName, language }); // Removed docs argument

    // Assert
    expect(result.globalMemory).toEqual({});
    expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
    expect(mockGlobalRepo.getDocument).not.toHaveBeenCalled(); // getDocument should not be called
  });

  // TODO: Add tests for missing branch core files (should still return others)
  // TODO: Add tests for repository errors
});
