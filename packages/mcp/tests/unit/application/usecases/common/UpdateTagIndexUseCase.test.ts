import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { UpdateTagIndexUseCase } from '../../../../../src/application/usecases/common/UpdateTagIndexUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository.js';
// import { mock } from 'jest-mock-extended'; // jest-mock-extended を削除
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';

describe('UpdateTagIndexUseCase', () => {
  let useCase: UpdateTagIndexUseCase;
  // jest.Mocked を削除し、手動モックの型を指定
  let mockBranchRepo: IBranchMemoryBankRepository;
  let mockGlobalRepo: IGlobalMemoryBankRepository;

  const branchName = 'feature/index-test';
  const branchInfo = BranchInfo.create(branchName);

  const mockDoc1Path = DocumentPath.create('doc1.json');
  const mockDoc2Path = DocumentPath.create('subdir/doc2.md');
  const mockDoc1 = MemoryDocument.create({ path: mockDoc1Path, content: '{}', tags: [Tag.create('taga'), Tag.create('tagb')], lastModified: new Date() }); // tagA -> taga, tagB -> tagb
  const mockDoc2 = MemoryDocument.create({ path: mockDoc2Path, content: 'content', tags: [Tag.create('tagb'), Tag.create('tagc')], lastModified: new Date() }); // tagB -> tagb, tagC -> tagc

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
      updateTagsIndex: vi.fn(),
    };
    useCase = new UpdateTagIndexUseCase(mockGlobalRepo, mockBranchRepo);
    vi.clearAllMocks(); // jest -> vi
    (mockBranchRepo.exists as Mock).mockResolvedValue(true); // as Mock 追加
  });

  it('should return correct tags and count for branch scope', async () => {
    // Arrange
    (mockBranchRepo.listDocuments as Mock).mockResolvedValue([mockDoc1Path, mockDoc2Path]); // as Mock 追加
    // getDocument は特定の引数で呼ばれるわけではないので、単純なモックでOK
    (mockBranchRepo.getDocument as Mock).mockImplementation(async (_argBranchInfo, argPath) => { // as Mock 追加
        if (argPath.equals(mockDoc1Path)) return mockDoc1;
        if (argPath.equals(mockDoc2Path)) return mockDoc2;
        return null;
    });

    // Act
    // Act
    const result = await useCase.execute({ branchName }); // scope, docs は不要

    // Assert
    expect(mockBranchRepo.listDocuments).toHaveBeenCalledWith(branchInfo);
    expect(mockBranchRepo.getDocument).toHaveBeenCalledWith(branchInfo, mockDoc1Path);
    expect(mockBranchRepo.getDocument).toHaveBeenCalledWith(branchInfo, mockDoc2Path);
    // saveTagIndex は呼ばれないのでチェックしない

    // Verify the output
    expect(result.tags).toEqual(expect.arrayContaining(['taga', 'tagb', 'tagc'])); // tagA -> taga, tagB -> tagb, tagC -> tagc
    expect(result.tags).toHaveLength(3);
    expect(result.documentCount).toBe(2);
    expect(result.updateInfo.updateLocation).toBe(branchName);
    expect(result.updateInfo.fullRebuild).toBe(false); // デフォルトは false
    expect(result.updateInfo.timestamp).toBeDefined();
  });

   it('should return correct tags and count for global scope', async () => {
    // Arrange
    const mockGlobalDocPath = DocumentPath.create('global/doc.json');
    const mockGlobalDoc = MemoryDocument.create({ path: mockGlobalDocPath, content: '{}', tags: [Tag.create('globaltag')], lastModified: new Date() }); // globalTag -> globaltag
    (mockGlobalRepo.listDocuments as Mock).mockResolvedValue([mockGlobalDocPath]); // as Mock 追加
    (mockGlobalRepo.getDocument as Mock).mockResolvedValue(mockGlobalDoc); // as Mock 追加

    // Act
    await useCase.execute({}); // 引数なしでグローバルスコープになる

    // Assert
    // Assert
    expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
    expect(mockGlobalRepo.getDocument).toHaveBeenCalledWith(mockGlobalDocPath);
    // saveTagIndex は呼ばれないのでチェックしない

    // Verify the output
    const result = await useCase.execute({}); // 再度実行して結果を取得（モックは設定済み）
    expect(result.tags).toEqual(['globaltag']); // globalTag -> globaltag
    expect(result.documentCount).toBe(1);
    expect(result.updateInfo.updateLocation).toBe('global');
    expect(result.updateInfo.fullRebuild).toBe(false);
    expect(result.updateInfo.timestamp).toBeDefined();
  });

  it('should return empty tags and zero count for empty branch', async () => {
    // Arrange
    (mockBranchRepo.listDocuments as Mock).mockResolvedValue([]); // as Mock 追加

    // Act
    const result = await useCase.execute({ branchName }); // scope, docs は不要

    // Assert
    expect(mockBranchRepo.listDocuments).toHaveBeenCalledWith(branchInfo);
    expect(mockBranchRepo.getDocument).not.toHaveBeenCalled();
    // saveTagIndex は呼ばれないのでチェックしない

    // Verify the output
    expect(result.tags).toEqual([]);
    expect(result.documentCount).toBe(0);
    expect(result.updateInfo.updateLocation).toBe(branchName);
  });

  // TODO: Add tests for fullRebuild option
  // TODO: Add tests for documents with no tags
  // TODO: Add tests for repository errors during list or getDocument
});
